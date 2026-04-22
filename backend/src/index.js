require('dotenv').config({ override: true });

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const { hasPermission } = require('./lib/permission');
const { containsUnsafeVoiceQuery } = require('./lib/voice-guardrails');
const { checkDatabaseConnection, initializeSchema, pool } = require('./db');

const app = express();
const port = Number(process.env.PORT) || 5000;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

app.use(
  cors({
    origin: clientOrigin,
  })
);
app.use(express.json());

function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    },
    jwtSecret,
    { expiresIn: '7d' }
  );
}

function createPasswordResetToken(userId) {
  return jwt.sign(
    {
      type: 'password_reset',
      userId,
    },
    jwtSecret,
    { expiresIn: '15m' }
  );
}

function readBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

async function requireAuth(req, res, next) {
  const token = readBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Missing or invalid authorization header' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const user = await getUserWithRole(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'Invalid authentication context' });
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
    };

    next();
  } catch (_error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requirePermission(requiredPermission) {
  return function permissionMiddleware(req, res, next) {
    const permissions = req.user?.permissions;
    if (!hasPermission(permissions, requiredPermission)) {
      writeAuditLog({
        userId: req.user?.userId || null,
        action: 'AUTH_PERMISSION_DENIED',
        entityType: 'permission',
        newValue: {
          requiredPermission,
          grantedPermissions: permissions || [],
          path: req.path,
          method: req.method,
        },
        ipAddress: req.ip,
      });

      return res.status(403).json({
        message: 'Forbidden: insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    return next();
  };
}

async function writeAuditLog({
  userId = null,
  action,
  entityType,
  entityId = null,
  oldValue = null,
  newValue = null,
  ipAddress = null,
}) {
  try {
    await pool.query(
      `
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [userId, action, entityType, entityId, oldValue, newValue, ipAddress]
    );
  } catch (_error) {
    // Do not block auth flows due to audit log write failures.
  }
}

async function getUserWithRole(userId) {
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.created_at,
        u.role_id,
        r.name AS role,
        COALESCE(r.permissions, '[]'::jsonb) AS permissions
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

async function getUserByEmailForAuth(email) {
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.password_hash,
        u.created_at,
        u.role_id,
        r.name AS role,
        COALESCE(r.permissions, '[]'::jsonb) AS permissions
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.email = $1
      LIMIT 1
    `,
    [email]
  );

  return result.rows[0] || null;
}

async function ensureUserSettings(userId, client = pool) {
  await client.query(
    `
      INSERT INTO user_settings (user_id, display_name, station_id)
      SELECT
        u.id,
        u.name,
        CONCAT('STATION_', LPAD(u.id::TEXT, 2, '0'), '_IND_BENGALURU')
      FROM users u
      WHERE u.id = $1
      ON CONFLICT (user_id) DO NOTHING
    `,
    [userId]
  );

  const result = await client.query(
    `
      SELECT
        user_id,
        display_name,
        station_id,
        font_size,
        is_high_contrast,
        is_dark,
        auto_tax_enabled,
        pdf_signature_enabled,
        updated_at
      FROM user_settings
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

function normalizeUserForResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at,
    role: user.role || null,
    permissions: user.permissions || [],
  };
}

function toInteger(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function toMoney(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
}

async function sectionExists(sectionId, client = pool) {
  const result = await client.query('SELECT id FROM sections WHERE id = $1 LIMIT 1', [sectionId]);
  return result.rowCount > 0;
}

async function partExists(partId, client = pool) {
  const result = await client.query('SELECT id FROM parts WHERE id = $1 LIMIT 1', [partId]);
  return result.rowCount > 0;
}

async function getPartStock(partId, sectionId = null, client = pool) {
  if (sectionId === null) {
    const result = await client.query(
      'SELECT COALESCE(SUM(quantity_delta), 0)::INTEGER AS qty FROM stock_ledger WHERE part_id = $1',
      [partId]
    );
    return result.rows[0].qty;
  }

  const result = await client.query(
    'SELECT COALESCE(SUM(quantity_delta), 0)::INTEGER AS qty FROM stock_ledger WHERE part_id = $1 AND section_id = $2',
    [partId, sectionId]
  );
  return result.rows[0].qty;
}

async function writeStockLedgerEntry({
  client,
  partId,
  sectionId = null,
  transactionType,
  quantityDelta,
  referenceId = null,
  performedBy = null,
}) {
  const quantityAfter = await getPartStock(partId, null, client) + quantityDelta;

  await client.query(
    `
      INSERT INTO stock_ledger (part_id, section_id, transaction_type, quantity_delta, quantity_after, reference_id, performed_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [partId, sectionId, transactionType, quantityDelta, quantityAfter, referenceId, performedBy]
  );
}

async function allocateSaleStockFIFO({ client, billId, partId, requiredQuantity, performedBy = null }) {
  let remaining = toInteger(requiredQuantity) || 0;
  if (remaining <= 0) {
    return true;
  }

  const entriesResult = await client.query(
    `
      SELECT id, quantity
      FROM stock_entries
      WHERE part_id = $1
        AND quantity > 0
      ORDER BY COALESCE(received_date, created_at::date) ASC, id ASC
      FOR UPDATE
    `,
    [partId]
  );

  const totalAvailable = entriesResult.rows.reduce((acc, row) => acc + (toInteger(row.quantity) || 0), 0);
  if (totalAvailable < remaining) {
    return false;
  }

  for (const entry of entriesResult.rows) {
    if (remaining <= 0) {
      break;
    }

    const available = toInteger(entry.quantity) || 0;
    if (available <= 0) {
      continue;
    }

    const consume = Math.min(available, remaining);
    const updateResult = await client.query(
      `
        UPDATE stock_entries
        SET quantity = quantity - $1,
            updated_at = NOW()
        WHERE id = $2
          AND quantity >= $1
        RETURNING quantity
      `,
      [consume, entry.id]
    );

    if (updateResult.rowCount === 0) {
      throw new Error(`Unable to consume stock for part ${partId} from entry ${entry.id}`);
    }

    const balanceAfter = toInteger(updateResult.rows[0].quantity) || 0;
    await client.query(
      `
        INSERT INTO stock_logs (stock_entry_id, part_id, action, quantity_change, balance_after, reference_type, reference_id, performed_by, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        entry.id,
        partId,
        'BILL_SALE_OUT',
        -consume,
        balanceAfter,
        'bill',
        billId,
        performedBy,
        `FIFO stock consumed for bill ${billId}`,
      ]
    );

    remaining -= consume;
  }

  if (remaining > 0) {
    throw new Error(`Insufficient stock entries for part ${partId}`);
  }

  return true;
}

async function restoreSaleStockForBill({ client, billId, performedBy = null }) {
  const consumptionLogs = await client.query(
    `
      SELECT id, stock_entry_id, part_id, quantity_change
      FROM stock_logs
      WHERE reference_type = 'bill'
        AND reference_id = $1
        AND action = 'BILL_SALE_OUT'
      ORDER BY id DESC
      FOR UPDATE
    `,
    [billId]
  );

  for (const log of consumptionLogs.rows) {
    const restoreQty = Math.abs(toInteger(log.quantity_change) || 0);
    if (restoreQty <= 0) {
      continue;
    }

    const updateResult = await client.query(
      `
        UPDATE stock_entries
        SET quantity = quantity + $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING quantity
      `,
      [restoreQty, log.stock_entry_id]
    );

    if (updateResult.rowCount === 0) {
      continue;
    }

    const balanceAfter = toInteger(updateResult.rows[0].quantity) || 0;
    await client.query(
      `
        INSERT INTO stock_logs (stock_entry_id, part_id, action, quantity_change, balance_after, reference_type, reference_id, performed_by, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        log.stock_entry_id,
        log.part_id,
        'BILL_SALE_REVERT',
        restoreQty,
        balanceAfter,
        'bill',
        billId,
        performedBy,
        `Stock restored due to bill cancellation ${billId}`,
      ]
    );
  }
}

const NOTIFICATION_CHANNELS = ['SMS', 'WHATSAPP', 'EMAIL', 'INTERNAL'];
const NOTIFICATION_JOB_STATUSES = ['PENDING', 'SENT', 'FAILED', 'CANCELLED'];

function getReminderStageChannels(stage) {
  switch (String(stage || '')) {
    case 'T_MINUS_3':
      return ['WHATSAPP', 'EMAIL'];
    case 'DUE_TODAY':
      return ['SMS', 'WHATSAPP'];
    case 'OVERDUE_DAY_1':
      return ['SMS', 'EMAIL'];
    case 'OVERDUE_DAY_7':
      return ['WHATSAPP', 'EMAIL'];
    default:
      return ['INTERNAL'];
  }
}

function getReminderStageLabel(stage) {
  switch (String(stage || '')) {
    case 'T_MINUS_3':
      return 'due in 3 days';
    case 'DUE_TODAY':
      return 'due today';
    case 'OVERDUE_DAY_1':
      return 'overdue by 1 day';
    case 'OVERDUE_DAY_7':
      return 'overdue by 7 days';
    default:
      return 'payment reminder';
  }
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }

  return ['true', '1', 'yes'].includes(String(value).toLowerCase());
}

function normalizeNotificationChannel(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeTemplatePayload(payload = {}) {
  const channel = normalizeNotificationChannel(payload.channel);
  if (!NOTIFICATION_CHANNELS.includes(channel)) {
    return { valid: false, message: 'channel must be one of SMS, WHATSAPP, EMAIL, INTERNAL' };
  }

  if (!payload.name || !String(payload.name).trim()) {
    return { valid: false, message: 'name is required' };
  }

  if (!payload.body || !String(payload.body).trim()) {
    return { valid: false, message: 'body is required' };
  }

  return {
    valid: true,
    normalized: {
      name: String(payload.name).trim(),
      channel,
      subject: payload.subject ? String(payload.subject).trim() : null,
      body: String(payload.body),
      isActive: payload.isActive === undefined ? true : toBoolean(payload.isActive, true),
    },
  };
}

async function generateBillReminderJobs({ client, daysAhead = 2, includeOverdue = true, createdBy }) {
  const clampedDaysAhead = Math.min(Math.max(toInteger(daysAhead) || 2, 0), 30);

  const result = await client.query(
    `
            WITH stage_windows AS (
         SELECT 'T_MINUS_3'::TEXT AS stage,
           (CURRENT_DATE + INTERVAL '3 day')::DATE AS target_due_date,
           (CURRENT_DATE + TIME '10:00')::TIMESTAMPTZ AS scheduled_for
         UNION ALL
         SELECT 'DUE_TODAY'::TEXT,
           CURRENT_DATE,
           (CURRENT_DATE + TIME '09:00')::TIMESTAMPTZ
         UNION ALL
         SELECT 'OVERDUE_DAY_1'::TEXT,
           (CURRENT_DATE - INTERVAL '1 day')::DATE,
           (CURRENT_DATE + TIME '10:00')::TIMESTAMPTZ
         UNION ALL
         SELECT 'OVERDUE_DAY_7'::TEXT,
           (CURRENT_DATE - INTERVAL '7 day')::DATE,
           (CURRENT_DATE + TIME '10:00')::TIMESTAMPTZ
            ),
            due_bills AS (
        SELECT
          b.id AS bill_id,
          b.party_type,
          b.party_id,
          b.bill_number,
          b.due_date,
          b.amount_due,
          sw.stage,
          sw.scheduled_for,
          CASE
            WHEN b.party_type = 'CUSTOMER' THEN c.name
            ELSE s.name
          END AS recipient_name,
          CASE
            WHEN b.party_type = 'CUSTOMER' THEN c.phone
            ELSE s.phone
          END AS recipient_phone,
          CASE
            WHEN b.party_type = 'CUSTOMER' THEN c.email
            ELSE s.email
          END AS recipient_email
        FROM bills b
        JOIN stage_windows sw ON sw.target_due_date = b.due_date
        LEFT JOIN customers c ON b.party_type = 'CUSTOMER' AND c.id = b.party_id
        LEFT JOIN suppliers s ON b.party_type = 'SUPPLIER' AND s.id = b.party_id
        WHERE b.status IN ('CONFIRMED', 'PARTIALLY_PAID')
          AND b.amount_due > 0
          AND b.due_date IS NOT NULL
          AND (
            sw.stage IN ('T_MINUS_3', 'DUE_TODAY')
            OR ($2::BOOLEAN = TRUE AND sw.stage IN ('OVERDUE_DAY_1', 'OVERDUE_DAY_7'))
          )
      )
      INSERT INTO notification_jobs (
        job_type,
        bill_id,
        party_type,
        party_id,
        recipient_name,
        recipient_phone,
        recipient_email,
        due_date,
        outstanding_amount,
        status,
        scheduled_for,
        payload,
        created_by
      )
      SELECT
        'BILL_DUE_REMINDER',
        db.bill_id,
        db.party_type,
        db.party_id,
        db.recipient_name,
        db.recipient_phone,
        db.recipient_email,
        db.due_date,
        db.amount_due,
        'PENDING',
        db.scheduled_for,
        jsonb_build_object(
          'billNumber', db.bill_number,
          'dueDate', db.due_date,
          'amountDue', db.amount_due,
          'stage', db.stage,
          'stageLabel', CASE db.stage
            WHEN 'T_MINUS_3' THEN 'Due in 3 days'
            WHEN 'DUE_TODAY' THEN 'Due today'
            WHEN 'OVERDUE_DAY_1' THEN 'Overdue by 1 day'
            WHEN 'OVERDUE_DAY_7' THEN 'Overdue by 7 days'
            ELSE 'Payment reminder'
          END
        ),
        $3
      FROM due_bills db
      WHERE NOT EXISTS (
        SELECT 1
        FROM notification_jobs nj
        WHERE nj.bill_id = db.bill_id
          AND nj.job_type = 'BILL_DUE_REMINDER'
          AND nj.status IN ('PENDING', 'SENT')
          AND nj.due_date = db.due_date
          AND COALESCE(nj.payload->>'stage', '') = db.stage
      )
      RETURNING id
    `,
    [clampedDaysAhead, includeOverdue, createdBy || null]
  );

  return {
    createdCount: result.rowCount,
    daysAhead: clampedDaysAhead,
    includeOverdue,
  };
}

async function selectNotificationChannels({ client, jobType = 'BILL_DUE_REMINDER' }) {
  // Get active templates for this job type
  const result = await client.query(
    `
      SELECT DISTINCT channel
      FROM notification_templates
      WHERE is_active = TRUE
        AND channel IN ('SMS', 'WHATSAPP', 'EMAIL', 'INTERNAL')
      ORDER BY channel
    `
  );

  const channels = result.rows.map(row => row.channel);
  if (channels.length === 0) {
    channels.push('INTERNAL'); // Fallback to internal if no templates configured
  }

  return channels;
}

async function deliverNotification({ channel, recipientName, recipientPhone, recipientEmail, message, subject = null }) {
  if (process.env.NODE_ENV === 'test') {
    return { provider: 'test_stub', messageId: `test-${Date.now()}`, status: 'sent' };
  }

  const trimmedChannel = normalizeNotificationChannel(channel);

  // SMS Delivery (Twilio)
  if (trimmedChannel === 'SMS' && recipientPhone) {
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      throw new Error('Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)');
    }

    const twilio = require('twilio')(twilioAccountSid, twilioAuthToken);
    const response = await twilio.messages.create({
      body: message,
      from: twilioFromNumber,
      to: recipientPhone,
    });

    return { provider: 'twilio', messageId: response.sid, status: response.status };
  }

  // WhatsApp Delivery (Twilio)
  if (trimmedChannel === 'WHATSAPP' && recipientPhone) {
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
      throw new Error('Twilio WhatsApp not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER)');
    }

    const twilio = require('twilio')(twilioAccountSid, twilioAuthToken);
    const response = await twilio.messages.create({
      body: message,
      from: `whatsapp:${twilioWhatsAppNumber}`,
      to: `whatsapp:${recipientPhone}`,
    });

    return { provider: 'twilio_whatsapp', messageId: response.sid, status: response.status };
  }

  // Email Delivery (SendGrid)
  if (trimmedChannel === 'EMAIL' && recipientEmail) {
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@shreenaath.com';

    if (!sendgridApiKey) {
      throw new Error('SendGrid API key not configured (SENDGRID_API_KEY)');
    }

    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(sendgridApiKey);

    const emailMsg = {
      to: recipientEmail,
      from: sendgridFromEmail,
      subject: subject || 'Bill Reminder Notification',
      text: message,
      html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
    };

    const response = await sgMail.send(emailMsg);
    return { provider: 'sendgrid', messageId: response[0].headers['x-message-id'], status: 'accepted' };
  }

  // Internal Delivery (Fallback/Demo)
  return {
    provider: 'internal',
    messageId: `internal-${Date.now()}`,
    status: 'logged',
    logEntry: {
      recipientName,
      recipientPhone: recipientPhone ? recipientPhone.slice(-4).padStart(recipientPhone.length, '*') : null,
      recipientEmail: recipientEmail ? recipientEmail.split('@')[0].slice(0, 2) + '***' : null,
      message,
    },
  };
}

async function dispatchPendingNotificationJobs({ client, limit = 20, actorUserId = null }) {
  const clampedLimit = Math.min(Math.max(toInteger(limit) || 20, 1), 100);

  const pendingResult = await client.query(
    `
      SELECT id, job_type, bill_id, recipient_name, recipient_phone, recipient_email, due_date, outstanding_amount, payload
      FROM notification_jobs
      WHERE status = 'PENDING'
        AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC, id ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    `,
    [clampedLimit]
  );

  let sentCount = 0;
  let failedCount = 0;

  for (const job of pendingResult.rows) {
    try {
      const stage = job.payload?.stage;
      const stageLabel = getReminderStageLabel(stage);
      const renderedMessage = `Dear ${job.recipient_name},\n\nReminder: Bill #${job.payload?.billNumber || job.bill_id} is ${stageLabel}. Outstanding amount: ₹${job.outstanding_amount}. Due date: ${job.due_date}.\n\nPlease settle the payment at your earliest convenience.\n\nThank you!`;
      
      // Select delivery channels based on configured templates
      const configuredChannels = await selectNotificationChannels({ client, jobType: job.job_type });
      const preferredChannels = getReminderStageChannels(stage);
      const channels = configuredChannels.filter((channel) => preferredChannels.includes(channel));

      const finalChannels = channels.length > 0 ? channels : ['INTERNAL'];
      let channelSuccessCount = 0;
      let channelFailureCount = 0;
      let lastChannelError = null;

      for (const channel of finalChannels) {
        try {
          const deliveryResult = await deliverNotification({
            channel,
            recipientName: job.recipient_name,
            recipientPhone: job.recipient_phone,
            recipientEmail: job.recipient_email,
            message: renderedMessage,
            subject: `Bill Reminder - ${job.payload?.billNumber || job.bill_id}`,
          });

          await client.query(
            `
              INSERT INTO notification_delivery_logs (job_id, channel, status, provider_message, payload, provider_response)
              VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
              job.id,
              channel,
              'SENT',
              `Delivered via ${deliveryResult.provider}`,
              { recipientName: job.recipient_name },
              deliveryResult,
            ]
          );
          channelSuccessCount += 1;
        } catch (channelError) {
          lastChannelError = channelError.message;
          await client.query(
            `
              INSERT INTO notification_delivery_logs (job_id, channel, status, provider_message, payload, provider_response)
              VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
              job.id,
              channel,
              'FAILED',
              channelError.message,
              { recipientName: job.recipient_name },
              null,
            ]
          );
          channelFailureCount += 1;
        }
      }

      if (channelSuccessCount > 0) {
        await client.query(
          `
            UPDATE notification_jobs
            SET status = 'SENT',
                sent_at = NOW(),
                last_error = NULL,
                attempt_count = attempt_count + 1,
                updated_at = NOW()
            WHERE id = $1
          `,
          [job.id]
        );

        sentCount += 1;
      } else {
        await client.query(
          `
            UPDATE notification_jobs
            SET status = 'FAILED',
                last_error = $2,
                attempt_count = attempt_count + 1,
                updated_at = NOW()
            WHERE id = $1
          `,
          [job.id, lastChannelError || `All channels failed (${channelFailureCount})`]
        );

        failedCount += 1;
      }
    } catch (error) {
      await client.query(
        `
          INSERT INTO notification_delivery_logs (job_id, channel, status, provider_message, payload, provider_response)
          VALUES ($1, 'INTERNAL', 'FAILED', $2, $3, $4)
        `,
        [job.id, error.message, { jobType: job.job_type }, null]
      );

      await client.query(
        `
          UPDATE notification_jobs
          SET status = 'FAILED',
              last_error = $2,
              attempt_count = attempt_count + 1,
              updated_at = NOW()
          WHERE id = $1
        `,
        [job.id, error.message]
      );

      failedCount += 1;
    }
  }

  return {
    pickedCount: pendingResult.rowCount,
    sentCount,
    failedCount,
  };
}

let notificationWorkerTimer = null;
let notificationWorkerActive = false;

async function syncOverdueBillStatuses({ client }) {
  const result = await client.query(
    `
      UPDATE bills
      SET status = 'OVERDUE',
          updated_at = NOW()
      WHERE status IN ('CONFIRMED', 'PARTIALLY_PAID')
        AND amount_due > 0
        AND due_date IS NOT NULL
        AND due_date < CURRENT_DATE
      RETURNING id
    `
  );

  return { overdueUpdatedCount: result.rowCount };
}

async function runNotificationWorkerTick() {
  if (notificationWorkerActive) {
    return;
  }

  notificationWorkerActive = true;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await syncOverdueBillStatuses({ client });
    await generateBillReminderJobs({ client, daysAhead: 3, includeOverdue: true, createdBy: null });
    await dispatchPendingNotificationJobs({ client, limit: 25 });
    await client.query('COMMIT');
  } catch (_error) {
    await client.query('ROLLBACK');
  } finally {
    client.release();
    notificationWorkerActive = false;
  }
}

function startNotificationWorker() {
  if (notificationWorkerTimer) {
    return;
  }

  const enabledDefault = process.env.NODE_ENV === 'test' ? false : true;
  const enabled = toBoolean(process.env.NOTIFICATION_WORKER_ENABLED, enabledDefault);
  if (!enabled) {
    return;
  }

  const intervalMs = Math.min(Math.max(toInteger(process.env.NOTIFICATION_WORKER_INTERVAL_MS) || 60000, 5000), 300000);
  notificationWorkerTimer = setInterval(() => {
    runNotificationWorkerTick();
  }, intervalMs);
}

function stopNotificationWorker() {
  if (notificationWorkerTimer) {
    clearInterval(notificationWorkerTimer);
    notificationWorkerTimer = null;
  }
}

const VOICE_INTENTS = {
  PART_LOOKUP: 'PART_LOOKUP',
  PART_LOCATION_LOOKUP: 'PART_LOCATION_LOOKUP',
  PART_STOCK_LOOKUP: 'PART_STOCK_LOOKUP',
};

const VOICE_STOP_WORDS = new Set([
  'where', 'is', 'are', 'the', 'a', 'an', 'find', 'show', 'me', 'part', 'parts',
  'with', 'for', 'of', 'stock', 'location', 'available', 'quantity', 'do', 'you', 'have',
  'in', 'at', 'to', 'please', 'lookup', 'search', 'need', 'get',
]);

function normalizeVoiceText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function extractYearFromVoiceQuery(text) {
  const match = text.match(/\b(19|20)\d{2}\b/);
  if (!match) {
    return null;
  }

  return toInteger(match[0]);
}

function extractMakeModelFromVoiceQuery(text) {
  const match = text.match(/(?:for|of)\s+([a-zA-Z0-9-]+)(?:\s+([a-zA-Z0-9-]+))?/i);
  if (!match) {
    return { make: null, model: null };
  }

  return {
    make: match[1] ? String(match[1]).toUpperCase() : null,
    model: match[2] ? String(match[2]).toUpperCase() : null,
  };
}

function extractSearchTermFromVoiceQuery(text) {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  const tokens = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token.length > 1 && !VOICE_STOP_WORDS.has(token));

  if (tokens.length === 0) {
    return null;
  }

  return tokens.slice(0, 4).join(' ');
}

function detectVoiceIntent(text) {
  const lower = text.toLowerCase();
  if (/(where|location|shelf|cabinet|section|room)/.test(lower)) {
    return VOICE_INTENTS.PART_LOCATION_LOOKUP;
  }

  if (/(stock|available|quantity|in hand|balance)/.test(lower)) {
    return VOICE_INTENTS.PART_STOCK_LOOKUP;
  }

  return VOICE_INTENTS.PART_LOOKUP;
}

function extractVoiceEntities(text) {
  const year = extractYearFromVoiceQuery(text);
  const { make, model } = extractMakeModelFromVoiceQuery(text);
  const searchTerm = extractSearchTermFromVoiceQuery(text);

  return {
    year,
    make,
    model,
    searchTerm,
  };
}

async function resolveVoiceIntentWithFallback(text) {
  const provider = (process.env.AI_INTENT_PROVIDER || 'rules').toLowerCase();

  // Current phase uses deterministic parsing. LLM provider can be plugged later.
  return {
    provider,
    intent: detectVoiceIntent(text),
    entities: extractVoiceEntities(text),
    usedFallback: provider !== 'rules',
  };
}

async function resolveSpeechToText({ audioBase64, mockTranscript }) {
  const provider = (process.env.STT_PROVIDER || 'mock').toLowerCase();

  if (mockTranscript && String(mockTranscript).trim()) {
    return {
      transcript: normalizeVoiceText(mockTranscript),
      provider: 'mock-input',
      mocked: true,
    };
  }

  if (!audioBase64) {
    return {
      error: 'Either mockTranscript or audioBase64 is required',
      statusCode: 400,
    };
  }

  if (provider === 'mock') {
    return {
      transcript: 'mock transcript from audio payload',
      provider,
      mocked: true,
    };
  }

  return {
    error: `STT provider ${provider} is not configured in this phase`,
    statusCode: 501,
  };
}

async function queryVoicePartMatches({ searchTerm, make, model, year, limit = 5 }) {
  const cappedLimit = Math.min(Math.max(toInteger(limit) || 5, 1), 20);

  const result = await pool.query(
    `
      SELECT
        p.id,
        p.sku,
        p.name,
        p.reorder_threshold,
        COALESCE(stock.current_stock, 0)::INTEGER AS current_stock,
        s.id AS section_id,
        s.name AS section_name,
        c.name AS cabinet_name,
        r.name AS room_name
      FROM parts p
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(sl.quantity_delta), 0) AS current_stock
        FROM stock_ledger sl
        WHERE sl.part_id = p.id
      ) stock ON TRUE
      LEFT JOIN sections s ON s.id = p.section_id
      LEFT JOIN cabinets c ON c.id = s.cabinet_id
      LEFT JOIN rooms r ON r.id = c.room_id
      WHERE (
        $1::TEXT IS NULL
        OR p.name ILIKE ('%' || $1 || '%')
        OR p.sku ILIKE ('%' || $1 || '%')
      )
      AND (
        $2::TEXT IS NULL
        OR EXISTS (
          SELECT 1
          FROM vehicle_compatibility vc
          WHERE vc.part_id = p.id
            AND UPPER(vc.make) = UPPER($2)
        )
      )
      AND (
        $3::TEXT IS NULL
        OR EXISTS (
          SELECT 1
          FROM vehicle_compatibility vc
          WHERE vc.part_id = p.id
            AND UPPER(vc.model) = UPPER($3)
        )
      )
      AND (
        $4::INTEGER IS NULL
        OR EXISTS (
          SELECT 1
          FROM vehicle_compatibility vc
          WHERE vc.part_id = p.id
            AND (vc.year_from IS NULL OR vc.year_from <= $4)
            AND (vc.year_to IS NULL OR vc.year_to >= $4)
        )
      )
      ORDER BY p.name ASC
      LIMIT $5
    `,
    [searchTerm || null, make || null, model || null, year || null, cappedLimit]
  );

  return result.rows;
}

function buildVoiceQueryAnswer({ intent, entities, matches }) {
  if (!matches.length) {
    return 'No matching part found. Try part name/SKU or include make-model-year details.';
  }

  const top = matches.slice(0, 3).map((item) => {
    const location = item.section_name
      ? `${item.room_name || 'Room N/A'} > ${item.cabinet_name || 'Cabinet N/A'} > ${item.section_name}`
      : 'Location not assigned';
    return `${item.name} (${item.sku}) stock ${item.current_stock}, location ${location}`;
  });

  const prefix =
    intent === VOICE_INTENTS.PART_LOCATION_LOOKUP
      ? 'Location lookup:'
      : intent === VOICE_INTENTS.PART_STOCK_LOOKUP
        ? 'Stock lookup:'
        : 'Part lookup:';

  const vehicleHints = [];
  if (entities.make) {
    vehicleHints.push(entities.make);
  }
  if (entities.model) {
    vehicleHints.push(entities.model);
  }
  if (entities.year) {
    vehicleHints.push(String(entities.year));
  }

  const context = vehicleHints.length ? ` for ${vehicleHints.join(' ')}` : '';
  return `${prefix}${context} ${top.join(' | ')}`;
}

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(name).trim();
    const passwordHash = await bcrypt.hash(String(password), 10);

    const result = await pool.query(
      `
        INSERT INTO users (name, email, password_hash, role_id)
        VALUES (
          $1,
          $2,
          $3,
          (SELECT id FROM roles WHERE name = 'VIEW_ONLY')
        )
        RETURNING id, name, email, created_at
      `,
      [normalizedName, normalizedEmail, passwordHash]
    );

    const createdUser = result.rows[0];
    const user = await getUserWithRole(createdUser.id);
    const token = createToken(user);

    await writeAuditLog({
      userId: user.id,
      action: 'AUTH_REGISTER',
      entityType: 'user',
      entityId: user.id,
      newValue: { email: user.email, role: user.role },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: normalizeUserForResponse(user),
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Email already registered' });
    }

    return res.status(500).json({ message: 'Unable to register user', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await getUserByEmailForAuth(normalizedEmail);

    if (!user) {
      await writeAuditLog({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'user',
        ipAddress: req.ip,
        newValue: { email: normalizedEmail },
      });
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(String(password), user.password_hash);

    if (!passwordMatch) {
      await writeAuditLog({
        userId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'user',
        entityId: user.id,
        ipAddress: req.ip,
      });
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = createToken(user);

    await writeAuditLog({
      userId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      entityType: 'user',
      entityId: user.id,
      ipAddress: req.ip,
    });

    return res.json({
      message: 'Login successful',
      token,
      user: normalizeUserForResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to login', error: error.message });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await getUserWithRole(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user: normalizeUserForResponse(user) });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch user profile', error: error.message });
  }
});

app.post('/api/auth/refresh', requireAuth, async (req, res) => {
  try {
    const user = await getUserWithRole(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const token = createToken(user);

    await writeAuditLog({
      userId: user.id,
      action: 'AUTH_TOKEN_REFRESH',
      entityType: 'user',
      entityId: user.id,
      ipAddress: req.ip,
    });

    return res.json({
      message: 'Token refreshed successfully',
      token,
      user: normalizeUserForResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to refresh token', error: error.message });
  }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  await writeAuditLog({
    userId: req.user.userId,
    action: 'AUTH_LOGOUT',
    entityType: 'user',
    entityId: req.user.userId,
    ipAddress: req.ip,
  });

  return res.json({ message: 'Logout successful' });
});

app.get('/api/settings', requireAuth, async (req, res) => {
  try {
    const user = await getUserWithRole(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const settings = await ensureUserSettings(req.user.userId);
    return res.json({
      message: 'Settings fetched successfully',
      profile: normalizeUserForResponse(user),
      settings,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch settings', error: error.message });
  }
});

app.put('/api/settings', requireAuth, async (req, res) => {
  const {
    displayName,
    fontSize,
    isHighContrast,
    isDark,
    autoTaxEnabled,
    pdfSignatureEnabled,
  } = req.body || {};

  const parsedFontSize = fontSize === undefined ? null : toInteger(fontSize);
  if (parsedFontSize !== null && (parsedFontSize < 12 || parsedFontSize > 24)) {
    return res.status(400).json({ message: 'fontSize must be between 12 and 24' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await ensureUserSettings(req.user.userId, client);

    const result = await client.query(
      `
        UPDATE user_settings
        SET
          display_name = COALESCE($1, display_name),
          font_size = COALESCE($2, font_size),
          is_high_contrast = COALESCE($3, is_high_contrast),
          is_dark = COALESCE($4, is_dark),
          auto_tax_enabled = COALESCE($5, auto_tax_enabled),
          pdf_signature_enabled = COALESCE($6, pdf_signature_enabled),
          updated_at = NOW()
        WHERE user_id = $7
        RETURNING
          user_id,
          display_name,
          station_id,
          font_size,
          is_high_contrast,
          is_dark,
          auto_tax_enabled,
          pdf_signature_enabled,
          updated_at
      `,
      [
        displayName ? String(displayName).trim() : null,
        parsedFontSize,
        isHighContrast === undefined ? null : toBoolean(isHighContrast),
        isDark === undefined ? null : toBoolean(isDark),
        autoTaxEnabled === undefined ? null : toBoolean(autoTaxEnabled, true),
        pdfSignatureEnabled === undefined ? null : toBoolean(pdfSignatureEnabled, false),
        req.user.userId,
      ]
    );

    await writeAuditLog({
      userId: req.user.userId,
      action: 'SETTINGS_UPDATED',
      entityType: 'user_settings',
      entityId: req.user.userId,
      newValue: {
        displayName: displayName || undefined,
        fontSize: parsedFontSize || undefined,
        isHighContrast,
        isDark,
        autoTaxEnabled,
        pdfSignatureEnabled,
      },
      ipAddress: req.ip,
    });

    await client.query('COMMIT');
    return res.json({ message: 'Settings updated successfully', settings: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Unable to update settings', error: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/auth/password-reset/request', async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await getUserByEmailForAuth(normalizedEmail);

    if (user) {
      const resetToken = createPasswordResetToken(user.id);

      await writeAuditLog({
        userId: user.id,
        action: 'AUTH_PASSWORD_RESET_REQUEST',
        entityType: 'user',
        entityId: user.id,
        ipAddress: req.ip,
      });

      return res.json({
        message: 'Password reset request created',
        // Dev-only response for current phase; wire to email/SMS provider in production.
        resetToken,
      });
    }

    return res.json({
      message: 'Password reset request created',
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to process password reset request', error: error.message });
  }
});

app.post('/api/auth/password-reset/confirm', async (req, res) => {
  const { token, newPassword } = req.body || {};

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and newPassword are required' });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const decoded = jwt.verify(String(token), jwtSecret);
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ message: 'Invalid reset token type' });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    const result = await pool.query(
      `
        UPDATE users
        SET password_hash = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING id, email
      `,
      [passwordHash, decoded.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await writeAuditLog({
      userId: result.rows[0].id,
      action: 'AUTH_PASSWORD_RESET_CONFIRM',
      entityType: 'user',
      entityId: result.rows[0].id,
      ipAddress: req.ip,
    });

    return res.json({ message: 'Password reset successful' });
  } catch (_error) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }
});

app.get('/api/auth/permissions/check', requireAuth, requirePermission('dashboard:read'), async (_req, res) => {
  return res.json({ message: 'Permission check passed for dashboard:read' });
});

app.get('/api/dashboard/kpis', requireAuth, requirePermission('dashboard:read'), async (_req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          (SELECT COUNT(*) FROM users)::INTEGER AS users_count,
          (SELECT COUNT(*) FROM parts)::INTEGER AS parts_count,
          (SELECT COUNT(*) FROM bills)::INTEGER AS bills_count,
          (SELECT COUNT(*) FROM customers)::INTEGER AS customers_count
      `
    );

    return res.json({
      message: 'Dashboard KPIs fetched successfully',
      kpis: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch dashboard KPIs', error: error.message });
  }
});

app.get('/api/inventory/parts', requireAuth, requirePermission('inventory:read'), async (_req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          p.id,
          p.sku,
          p.name,
          p.description,
          p.cost_price,
          p.selling_price,
          p.reorder_threshold,
          p.section_id,
          COALESCE(SUM(sl.quantity_delta), 0)::INTEGER AS current_stock,
          (COALESCE(SUM(sl.quantity_delta), 0)::INTEGER <= p.reorder_threshold) AS low_stock,
          p.created_at,
          p.updated_at
        FROM parts p
        LEFT JOIN stock_ledger sl ON sl.part_id = p.id
        GROUP BY p.id
        ORDER BY p.id DESC
        LIMIT 50
      `
    );

    return res.json({
      message: 'Inventory parts fetched successfully',
      items: result.rows,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch inventory parts', error: error.message });
  }
});

app.post('/api/inventory/locations/rooms', requireAuth, requirePermission('inventory:write'), async (req, res) => {
  const { name, description } = req.body || {};
  if (!name) {
    return res.status(400).json({ message: 'Room name is required' });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO rooms (name, description)
        VALUES ($1, $2)
        RETURNING id, name, description, created_at
      `,
      [String(name).trim(), description || null]
    );

    return res.status(201).json({ message: 'Room created successfully', room: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Room name already exists' });
    }
    return res.status(500).json({ message: 'Unable to create room', error: error.message });
  }
});

app.post('/api/inventory/locations/cabinets', requireAuth, requirePermission('inventory:write'), async (req, res) => {
  const { roomId, name, code } = req.body || {};
  const parsedRoomId = toInteger(roomId);
  if (!parsedRoomId || !name) {
    return res.status(400).json({ message: 'roomId and cabinet name are required' });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO cabinets (room_id, name, code)
        VALUES ($1, $2, $3)
        RETURNING id, room_id, name, code, created_at
      `,
      [parsedRoomId, String(name).trim(), code || null]
    );

    return res.status(201).json({ message: 'Cabinet created successfully', cabinet: result.rows[0] });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Cabinet name already exists in this room' });
    }
    return res.status(500).json({ message: 'Unable to create cabinet', error: error.message });
  }
});

app.post('/api/inventory/locations/sections', requireAuth, requirePermission('inventory:write'), async (req, res) => {
  const { cabinetId, name, code } = req.body || {};
  const parsedCabinetId = toInteger(cabinetId);
  if (!parsedCabinetId || !name) {
    return res.status(400).json({ message: 'cabinetId and section name are required' });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO sections (cabinet_id, name, code)
        VALUES ($1, $2, $3)
        RETURNING id, cabinet_id, name, code, created_at
      `,
      [parsedCabinetId, String(name).trim(), code || null]
    );

    return res.status(201).json({ message: 'Section created successfully', section: result.rows[0] });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(404).json({ message: 'Cabinet not found' });
    }
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Section name already exists in this cabinet' });
    }
    return res.status(500).json({ message: 'Unable to create section', error: error.message });
  }
});

app.get('/api/inventory/locations/tree', requireAuth, requirePermission('inventory:read'), async (_req, res) => {
  try {
    const roomsResult = await pool.query('SELECT id, name, description, created_at FROM rooms ORDER BY name ASC');
    const cabinetsResult = await pool.query('SELECT id, room_id, name, code, created_at FROM cabinets ORDER BY name ASC');
    const sectionsResult = await pool.query('SELECT id, cabinet_id, name, code, created_at FROM sections ORDER BY name ASC');

    const cabinetsByRoom = new Map();
    for (const cabinet of cabinetsResult.rows) {
      const list = cabinetsByRoom.get(cabinet.room_id) || [];
      list.push({ ...cabinet, sections: [] });
      cabinetsByRoom.set(cabinet.room_id, list);
    }

    const cabinetIndex = new Map();
    for (const cabinets of cabinetsByRoom.values()) {
      for (const cabinet of cabinets) {
        cabinetIndex.set(cabinet.id, cabinet);
      }
    }

    for (const section of sectionsResult.rows) {
      const cabinet = cabinetIndex.get(section.cabinet_id);
      if (cabinet) {
        cabinet.sections.push(section);
      }
    }

    const tree = roomsResult.rows.map((room) => ({
      ...room,
      cabinets: cabinetsByRoom.get(room.id) || [],
    }));

    return res.json({ message: 'Location tree fetched successfully', items: tree });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch location tree', error: error.message });
  }
});

app.post('/api/inventory/parts', requireAuth, requirePermission('inventory:write'), async (req, res) => {
  const {
    sku,
    name,
    description,
    categoryId,
    brandId,
    costPrice,
    sellingPrice,
    reorderThreshold,
    sectionId,
  } = req.body || {};

  if (!sku || !name) {
    return res.status(400).json({ message: 'sku and name are required' });
  }

  const parsedSectionId = toInteger(sectionId);
  if (sectionId !== undefined && sectionId !== null && !parsedSectionId) {
    return res.status(400).json({ message: 'sectionId must be a valid integer' });
  }

  try {
    if (parsedSectionId && !(await sectionExists(parsedSectionId))) {
      return res.status(404).json({ message: 'Section not found' });
    }

    const result = await pool.query(
      `
        INSERT INTO parts (
          sku,
          name,
          description,
          category_id,
          brand_id,
          cost_price,
          selling_price,
          reorder_threshold,
          section_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, sku, name, description, cost_price, selling_price, reorder_threshold, section_id, created_at, updated_at
      `,
      [
        String(sku).trim(),
        String(name).trim(),
        description || null,
        toInteger(categoryId),
        toInteger(brandId),
        toMoney(costPrice, 0),
        toMoney(sellingPrice, 0),
        toInteger(reorderThreshold) || 0,
        parsedSectionId,
      ]
    );

    return res.status(201).json({ message: 'Part created successfully', part: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'SKU already exists' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ message: 'Invalid category, brand, or section reference' });
    }
    return res.status(500).json({ message: 'Unable to create part', error: error.message });
  }
});

app.get('/api/inventory/parts/:id', requireAuth, requirePermission('inventory:read'), async (req, res) => {
  const partId = toInteger(req.params.id);
  if (!partId) {
    return res.status(400).json({ message: 'Invalid part id' });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          p.id,
          p.sku,
          p.name,
          p.description,
          p.cost_price,
          p.selling_price,
          p.reorder_threshold,
          p.section_id,
          COALESCE(SUM(sl.quantity_delta), 0)::INTEGER AS current_stock,
          (COALESCE(SUM(sl.quantity_delta), 0)::INTEGER <= p.reorder_threshold) AS low_stock,
          p.created_at,
          p.updated_at
        FROM parts p
        LEFT JOIN stock_ledger sl ON sl.part_id = p.id
        WHERE p.id = $1
        GROUP BY p.id
      `,
      [partId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Part not found' });
    }

    return res.json({ message: 'Part fetched successfully', part: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch part', error: error.message });
  }
});

app.put('/api/inventory/parts/:id', requireAuth, requirePermission('inventory:write'), async (req, res) => {
  const partId = toInteger(req.params.id);
  if (!partId) {
    return res.status(400).json({ message: 'Invalid part id' });
  }

  const {
    sku,
    name,
    description,
    categoryId,
    brandId,
    costPrice,
    sellingPrice,
    reorderThreshold,
    sectionId,
  } = req.body || {};

  const parsedSectionId = toInteger(sectionId);
  if (sectionId !== undefined && sectionId !== null && !parsedSectionId) {
    return res.status(400).json({ message: 'sectionId must be a valid integer' });
  }

  try {
    if (!(await partExists(partId))) {
      return res.status(404).json({ message: 'Part not found' });
    }

    if (parsedSectionId && !(await sectionExists(parsedSectionId))) {
      return res.status(404).json({ message: 'Section not found' });
    }

    const result = await pool.query(
      `
        UPDATE parts
        SET
          sku = COALESCE($1, sku),
          name = COALESCE($2, name),
          description = $3,
          category_id = $4,
          brand_id = $5,
          cost_price = COALESCE($6, cost_price),
          selling_price = COALESCE($7, selling_price),
          reorder_threshold = COALESCE($8, reorder_threshold),
          section_id = $9,
          updated_at = NOW()
        WHERE id = $10
        RETURNING id, sku, name, description, cost_price, selling_price, reorder_threshold, section_id, created_at, updated_at
      `,
      [
        sku ? String(sku).trim() : null,
        name ? String(name).trim() : null,
        description || null,
        toInteger(categoryId),
        toInteger(brandId),
        costPrice !== undefined ? toMoney(costPrice, 0) : null,
        sellingPrice !== undefined ? toMoney(sellingPrice, 0) : null,
        reorderThreshold !== undefined ? toInteger(reorderThreshold) || 0 : null,
        sectionId !== undefined ? parsedSectionId : null,
        partId,
      ]
    );

    return res.json({ message: 'Part updated successfully', part: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'SKU already exists' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ message: 'Invalid category, brand, or section reference' });
    }
    return res.status(500).json({ message: 'Unable to update part', error: error.message });
  }
});

app.post('/api/inventory/parts/:id/compatibility', requireAuth, requirePermission('inventory:write'), async (req, res) => {
  const partId = toInteger(req.params.id);
  const { make, model, yearFrom, yearTo, notes } = req.body || {};

  if (!partId) {
    return res.status(400).json({ message: 'Invalid part id' });
  }

  if (!make || !model) {
    return res.status(400).json({ message: 'make and model are required' });
  }

  const parsedYearFrom = toInteger(yearFrom);
  const parsedYearTo = toInteger(yearTo);
  if (parsedYearFrom && parsedYearTo && parsedYearFrom > parsedYearTo) {
    return res.status(400).json({ message: 'yearFrom cannot be greater than yearTo' });
  }

  try {
    if (!(await partExists(partId))) {
      return res.status(404).json({ message: 'Part not found' });
    }

    const result = await pool.query(
      `
        INSERT INTO vehicle_compatibility (part_id, make, model, year_from, year_to, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, part_id, make, model, year_from, year_to, notes, created_at
      `,
      [partId, String(make).trim(), String(model).trim(), parsedYearFrom, parsedYearTo, notes || null]
    );

    return res.status(201).json({ message: 'Compatibility added successfully', item: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to add compatibility', error: error.message });
  }
});

app.get('/api/inventory/parts/:id/compatibility', requireAuth, requirePermission('inventory:read'), async (req, res) => {
  const partId = toInteger(req.params.id);
  if (!partId) {
    return res.status(400).json({ message: 'Invalid part id' });
  }

  try {
    if (!(await partExists(partId))) {
      return res.status(404).json({ message: 'Part not found' });
    }

    const result = await pool.query(
      `
        SELECT id, part_id, make, model, year_from, year_to, notes, created_at
        FROM vehicle_compatibility
        WHERE part_id = $1
        ORDER BY id DESC
      `,
      [partId]
    );

    return res.json({ message: 'Compatibility fetched successfully', items: result.rows });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch compatibility', error: error.message });
  }
});

app.post('/api/inventory/stock/adjustments', requireAuth, requirePermission('inventory:write'), async (req, res) => {
  const { partId, sectionId, quantityDelta, reason } = req.body || {};
  const parsedPartId = toInteger(partId);
  const parsedSectionId = toInteger(sectionId);
  const parsedDelta = toInteger(quantityDelta);

  if (!parsedPartId || !parsedDelta || !reason) {
    return res.status(400).json({ message: 'partId, quantityDelta, and reason are required' });
  }

  if (sectionId !== undefined && sectionId !== null && !parsedSectionId) {
    return res.status(400).json({ message: 'sectionId must be a valid integer' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (!(await partExists(parsedPartId, client))) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Part not found' });
    }

    if (parsedSectionId && !(await sectionExists(parsedSectionId, client))) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Section not found' });
    }

    await writeStockLedgerEntry({
      client,
      partId: parsedPartId,
      sectionId: parsedSectionId,
      transactionType: 'ADJUSTMENT',
      quantityDelta: parsedDelta,
      performedBy: req.user.userId,
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'INVENTORY_STOCK_ADJUSTMENT',
      entityType: 'part',
      entityId: parsedPartId,
      newValue: { sectionId: parsedSectionId, quantityDelta: parsedDelta, reason },
      ipAddress: req.ip,
    });

    await client.query('COMMIT');
    return res.status(201).json({ message: 'Stock adjustment recorded successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Unable to record stock adjustment', error: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/inventory/stock/transfers', requireAuth, requirePermission('inventory:write'), async (req, res) => {
  const { partId, fromSectionId, toSectionId, quantity, reason } = req.body || {};
  const parsedPartId = toInteger(partId);
  const parsedFromSectionId = toInteger(fromSectionId);
  const parsedToSectionId = toInteger(toSectionId);
  const parsedQuantity = toInteger(quantity);

  if (!parsedPartId || !parsedFromSectionId || !parsedToSectionId || !parsedQuantity || !reason) {
    return res.status(400).json({ message: 'partId, fromSectionId, toSectionId, quantity, and reason are required' });
  }

  if (parsedQuantity <= 0) {
    return res.status(400).json({ message: 'quantity must be greater than zero' });
  }

  if (parsedFromSectionId === parsedToSectionId) {
    return res.status(400).json({ message: 'fromSectionId and toSectionId cannot be the same' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (!(await partExists(parsedPartId, client))) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Part not found' });
    }

    if (!(await sectionExists(parsedFromSectionId, client)) || !(await sectionExists(parsedToSectionId, client))) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'From/to section not found' });
    }

    const fromSectionStock = await getPartStock(parsedPartId, parsedFromSectionId, client);
    if (fromSectionStock < parsedQuantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient stock in fromSection' });
    }

    await writeStockLedgerEntry({
      client,
      partId: parsedPartId,
      sectionId: parsedFromSectionId,
      transactionType: 'TRANSFER',
      quantityDelta: -parsedQuantity,
      performedBy: req.user.userId,
    });

    await writeStockLedgerEntry({
      client,
      partId: parsedPartId,
      sectionId: parsedToSectionId,
      transactionType: 'TRANSFER',
      quantityDelta: parsedQuantity,
      performedBy: req.user.userId,
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'INVENTORY_STOCK_TRANSFER',
      entityType: 'part',
      entityId: parsedPartId,
      newValue: {
        fromSectionId: parsedFromSectionId,
        toSectionId: parsedToSectionId,
        quantity: parsedQuantity,
        reason,
      },
      ipAddress: req.ip,
    });

    await client.query('COMMIT');
    return res.status(201).json({ message: 'Stock transfer recorded successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Unable to record stock transfer', error: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/inventory/stock/low', requireAuth, requirePermission('inventory:read'), async (_req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          p.id,
          p.sku,
          p.name,
          p.reorder_threshold,
          COALESCE(SUM(sl.quantity_delta), 0)::INTEGER AS current_stock,
          (COALESCE(SUM(sl.quantity_delta), 0)::INTEGER <= p.reorder_threshold) AS low_stock
        FROM parts p
        LEFT JOIN stock_ledger sl ON sl.part_id = p.id
        GROUP BY p.id
        HAVING COALESCE(SUM(sl.quantity_delta), 0)::INTEGER <= p.reorder_threshold
        ORDER BY current_stock ASC, p.name ASC
      `
    );

    return res.json({ message: 'Low stock items fetched successfully', items: result.rows });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch low stock items', error: error.message });
  }
});

function normalizeBillType(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizePartyType(value) {
  return String(value || '').trim().toUpperCase();
}

function resolvePartyTypeForBillType(billType) {
  if (billType === 'SALE') {
    return 'CUSTOMER';
  }
  if (billType === 'PURCHASE') {
    return 'SUPPLIER';
  }
  return null;
}

function generateBillNumber(billType) {
  const suffix = Date.now().toString().slice(-8);
  const prefix = billType === 'PURCHASE' ? 'PUR' : 'SAL';
  return `${prefix}-${suffix}`;
}

function calculateBillTotals(items, tax, discount) {
  const subtotal = items.reduce((sum, item) => sum + toMoney(item.unitPrice, 0) * toInteger(item.quantity), 0);
  const normalizedTax = toMoney(tax, 0);
  const normalizedDiscount = toMoney(discount, 0);
  const total = subtotal + normalizedTax - normalizedDiscount;

  return {
    subtotal,
    tax: normalizedTax,
    discount: normalizedDiscount,
    total,
    amountDue: total,
  };
}

async function calculateOutstandingFromLedger({ client, partyType, partyId }) {
  const result = await client.query(
    `
      SELECT
        COALESCE(SUM(total), 0) AS billed_total,
        COALESCE(SUM(amount_paid), 0) AS paid_total
      FROM bills
      WHERE party_type = $1
        AND party_id = $2
        AND status IN ('CONFIRMED', 'PARTIALLY_PAID', 'PAID')
    `,
    [partyType, partyId]
  );

  const billedTotal = toMoney(result.rows[0].billed_total, 0);
  const paidTotal = toMoney(result.rows[0].paid_total, 0);

  return {
    billedTotal,
    paidTotal,
    outstandingBalance: billedTotal - paidTotal,
  };
}

async function validatePartyReference({ client, partyType, partyId }) {
  const parsedPartyId = toInteger(partyId);
  if (!parsedPartyId) {
    return { valid: false, message: 'partyId is required' };
  }

  if (partyType === 'CUSTOMER') {
    const result = await client.query('SELECT id FROM customers WHERE id = $1 LIMIT 1', [parsedPartyId]);
    return result.rowCount > 0 ? { valid: true, partyId: parsedPartyId } : { valid: false, message: 'Customer not found' };
  }

  if (partyType === 'SUPPLIER') {
    const result = await client.query('SELECT id FROM suppliers WHERE id = $1 LIMIT 1', [parsedPartyId]);
    return result.rowCount > 0 ? { valid: true, partyId: parsedPartyId } : { valid: false, message: 'Supplier not found' };
  }

  return { valid: false, message: 'Invalid party type' };
}

async function updatePartyOutstandingBalance({ client, billType, partyType, partyId, amountDelta }) {
  if (!amountDelta) {
    return;
  }

  if (billType === 'SALE' && partyType === 'CUSTOMER') {
    await client.query(
      'UPDATE customers SET outstanding_balance = outstanding_balance + $1, updated_at = NOW() WHERE id = $2',
      [amountDelta, partyId]
    );
    return;
  }

  if (billType === 'PURCHASE' && partyType === 'SUPPLIER') {
    await client.query(
      'UPDATE suppliers SET outstanding_balance = outstanding_balance + $1, updated_at = NOW() WHERE id = $2',
      [amountDelta, partyId]
    );
  }
}

async function fetchBillWithItems(client, billId) {
  const billResult = await client.query(
    `
      SELECT id, bill_type, bill_number, bill_date, party_id, party_type, subtotal, tax, discount, total,
             amount_paid, amount_due, status, due_date, created_by, created_at
      FROM bills
      WHERE id = $1
      LIMIT 1
    `,
    [billId]
  );

  if (billResult.rowCount === 0) {
    return null;
  }

  const itemsResult = await client.query(
    `
      SELECT bi.id, bi.part_id, p.sku, p.name, p.section_id, bi.quantity, bi.unit_price, bi.line_total
      FROM bill_items bi
      JOIN parts p ON p.id = bi.part_id
      WHERE bi.bill_id = $1
      ORDER BY bi.id ASC
    `,
    [billId]
  );

  const paymentsResult = await client.query(
    `
      SELECT id, amount, payment_mode, reference_number, paid_at, recorded_by
      FROM payments
      WHERE bill_id = $1
      ORDER BY paid_at DESC
    `,
    [billId]
  );

  return {
    bill: billResult.rows[0],
    items: itemsResult.rows,
    payments: paymentsResult.rows,
  };
}

app.get('/api/billing/bills', requireAuth, requirePermission('billing:read'), async (req, res) => {
  const { partyType, partyId, status, billType, limit } = req.query || {};
  const normalizedPartyType = partyType ? normalizePartyType(partyType) : null;
  const normalizedBillType = billType ? normalizeBillType(billType) : null;
  const normalizedStatus = status ? String(status).trim().toUpperCase() : null;
  const normalizedPartyId = partyId ? toInteger(partyId) : null;
  const parsedLimit = Math.min(Math.max(toInteger(limit) || 50, 1), 200);

  if (partyType && !['CUSTOMER', 'SUPPLIER'].includes(normalizedPartyType)) {
    return res.status(400).json({ message: 'partyType must be CUSTOMER or SUPPLIER' });
  }

  if (billType && !['SALE', 'PURCHASE'].includes(normalizedBillType)) {
    return res.status(400).json({ message: 'billType must be SALE or PURCHASE' });
  }

  if (partyId && !normalizedPartyId) {
    return res.status(400).json({ message: 'partyId must be a valid integer' });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          b.id,
          b.bill_number,
          b.bill_type,
          b.status,
          b.party_type,
          b.party_id,
          b.bill_date,
          b.due_date,
          b.total,
          b.amount_paid,
          b.amount_due,
          b.created_at,
          CASE
            WHEN b.party_type = 'CUSTOMER' THEN c.name
            WHEN b.party_type = 'SUPPLIER' THEN s.name
            ELSE NULL
          END AS party_name
        FROM bills b
        LEFT JOIN customers c ON b.party_type = 'CUSTOMER' AND c.id = b.party_id
        LEFT JOIN suppliers s ON b.party_type = 'SUPPLIER' AND s.id = b.party_id
        WHERE ($1::TEXT IS NULL OR b.party_type = $1)
          AND ($2::INTEGER IS NULL OR b.party_id = $2)
          AND ($3::TEXT IS NULL OR b.status = $3)
          AND ($4::TEXT IS NULL OR b.bill_type = $4)
        ORDER BY id DESC
        LIMIT $5
      `,
      [normalizedPartyType, normalizedPartyId, normalizedStatus, normalizedBillType, parsedLimit]
    );

    return res.json({
      message: 'Billing list fetched successfully',
      items: result.rows,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch bills', error: error.message });
  }
});

app.post('/api/billing/bills', requireAuth, requirePermission('billing:write'), async (req, res) => {
  const {
    billType,
    partyType,
    partyId,
    billDate,
    dueDate,
    tax,
    discount,
    items,
    billNumber,
  } = req.body || {};

  const normalizedBillType = normalizeBillType(billType);
  const resolvedPartyType = resolvePartyTypeForBillType(normalizedBillType);
  const normalizedPartyType = normalizePartyType(partyType) || resolvedPartyType;

  if (!['PURCHASE', 'SALE'].includes(normalizedBillType)) {
    return res.status(400).json({ message: 'billType must be PURCHASE or SALE' });
  }

  if (!resolvedPartyType || normalizedPartyType !== resolvedPartyType) {
    return res.status(400).json({ message: 'partyType does not match billType expectations' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'At least one bill item is required' });
  }

  const normalizedItems = [];
  for (const item of items) {
    const parsedPartId = toInteger(item.partId);
    const parsedQty = toInteger(item.quantity);
    const parsedUnitPrice = toMoney(item.unitPrice, NaN);
    if (!parsedPartId || !parsedQty || parsedQty <= 0 || Number.isNaN(parsedUnitPrice)) {
      return res.status(400).json({ message: 'Each item requires valid partId, quantity (>0), and unitPrice' });
    }

    normalizedItems.push({
      partId: parsedPartId,
      quantity: parsedQty,
      unitPrice: parsedUnitPrice,
      lineTotal: parsedQty * parsedUnitPrice,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const partyValidation = await validatePartyReference({ client, partyType: normalizedPartyType, partyId });
    if (!partyValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: partyValidation.message });
    }

    for (const item of normalizedItems) {
      if (!(await partExists(item.partId, client))) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: `Part not found for partId ${item.partId}` });
      }
    }

    const totals = calculateBillTotals(normalizedItems, tax, discount);

    if (normalizedBillType === 'SALE' && normalizedPartyType === 'CUSTOMER') {
      const customerResult = await client.query(
        'SELECT id, credit_limit, outstanding_balance FROM customers WHERE id = $1 LIMIT 1',
        [partyValidation.partyId]
      );

      if (customerResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Customer not found' });
      }

      const customer = customerResult.rows[0];
      const creditLimit = toMoney(customer.credit_limit, 0);
      const currentOutstanding = toMoney(customer.outstanding_balance, 0);

      if (creditLimit > 0 && currentOutstanding + totals.total > creditLimit) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          message: 'Credit limit exceeded for customer',
          code: 'CREDIT_LIMIT_EXCEEDED',
        });
      }
    }

    const generatedBillNumber = billNumber ? String(billNumber).trim() : generateBillNumber(normalizedBillType);

    const billResult = await client.query(
      `
        INSERT INTO bills (
          bill_type, bill_number, bill_date, party_id, party_type,
          subtotal, tax, discount, total, amount_paid, amount_due, status, due_date, created_by
        )
        VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5, $6, $7, $8, $9, 0, $10, 'DRAFT', $11, $12)
        RETURNING id, bill_type, bill_number, status, total, amount_due, created_at
      `,
      [
        normalizedBillType,
        generatedBillNumber,
        billDate || null,
        partyValidation.partyId,
        normalizedPartyType,
        totals.subtotal,
        totals.tax,
        totals.discount,
        totals.total,
        totals.amountDue,
        dueDate || null,
        req.user.userId,
      ]
    );

    const bill = billResult.rows[0];

    for (const item of normalizedItems) {
      await client.query(
        `
          INSERT INTO bill_items (bill_id, part_id, quantity, unit_price, line_total)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [bill.id, item.partId, item.quantity, item.unitPrice, item.lineTotal]
      );
    }

    await writeAuditLog({
      userId: req.user.userId,
      action: 'BILL_DRAFT_CREATED',
      entityType: 'bill',
      entityId: bill.id,
      newValue: { billType: normalizedBillType, partyType: normalizedPartyType, total: bill.total },
      ipAddress: req.ip,
    });

    await client.query('COMMIT');
    return res.status(201).json({ message: 'Bill draft created successfully', bill });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Bill number already exists' });
    }
    return res.status(500).json({ message: 'Unable to create bill draft', error: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/billing/bills/:id', requireAuth, requirePermission('billing:read'), async (req, res) => {
  const billId = toInteger(req.params.id);
  if (!billId) {
    return res.status(400).json({ message: 'Invalid bill id' });
  }

  const client = await pool.connect();
  try {
    const data = await fetchBillWithItems(client, billId);
    if (!data) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    return res.json({ message: 'Bill detail fetched successfully', ...data });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch bill detail', error: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/billing/bills/:id/confirm', requireAuth, requirePermission('billing:write'), async (req, res) => {
  const billId = toInteger(req.params.id);
  if (!billId) {
    return res.status(400).json({ message: 'Invalid bill id' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const billLockResult = await client.query(
      'SELECT * FROM bills WHERE id = $1 FOR UPDATE',
      [billId]
    );

    if (billLockResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Bill not found' });
    }

    const bill = billLockResult.rows[0];
    if (bill.status !== 'DRAFT') {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Only DRAFT bills can be confirmed' });
    }

    const itemsResult = await client.query(
      `
        SELECT bi.id, bi.part_id, bi.quantity, p.section_id
        FROM bill_items bi
        JOIN parts p ON p.id = bi.part_id
        WHERE bi.bill_id = $1
      `,
      [billId]
    );

    if (itemsResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cannot confirm bill without items' });
    }

    const isSale = bill.bill_type === 'SALE';

    for (const item of itemsResult.rows) {
      if (isSale) {
        const consumedFromEntries = await allocateSaleStockFIFO({
          client,
          billId: bill.id,
          partId: item.part_id,
          requiredQuantity: item.quantity,
          performedBy: req.user.userId,
        });

        if (!consumedFromEntries) {
          const availableStock = await getPartStock(item.part_id, null, client);
          if (availableStock < item.quantity) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: `Insufficient stock for part ${item.part_id}` });
          }
        }
      }

      await writeStockLedgerEntry({
        client,
        partId: item.part_id,
        sectionId: item.section_id,
        transactionType: bill.bill_type,
        quantityDelta: isSale ? -item.quantity : item.quantity,
        referenceId: bill.id,
        performedBy: req.user.userId,
      });
    }

    await client.query(
      `
        UPDATE bills
        SET status = 'CONFIRMED'
        WHERE id = $1
      `,
      [bill.id]
    );

    await updatePartyOutstandingBalance({
      client,
      billType: bill.bill_type,
      partyType: bill.party_type,
      partyId: bill.party_id,
      amountDelta: toMoney(bill.total, 0),
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'BILL_CONFIRMED',
      entityType: 'bill',
      entityId: bill.id,
      newValue: { billType: bill.bill_type, total: bill.total },
      ipAddress: req.ip,
    });

    // Generate reminder jobs for SALE bills (customer bills) with due dates
    if (bill.bill_type === 'SALE' && bill.due_date) {
      try {
        await generateBillReminderJobs({
          client,
          daysAhead: 3,
          includeOverdue: false,
          createdBy: req.user.userId,
        });
      } catch (reminderError) {
        // Log but don't block bill confirmation if reminder generation fails
        console.error('Failed to generate bill reminder jobs:', reminderError.message);
      }
    }

    await client.query('COMMIT');
    return res.json({ message: 'Bill confirmed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Unable to confirm bill', error: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/billing/bills/:id/payments', requireAuth, requirePermission('billing:write'), async (req, res) => {
  const billId = toInteger(req.params.id);
  const { amount, paymentMode, referenceNumber } = req.body || {};
  const normalizedAmount = toMoney(amount, NaN);
  const normalizedMode = String(paymentMode || '').trim().toUpperCase();

  if (!billId) {
    return res.status(400).json({ message: 'Invalid bill id' });
  }
  if (Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
    return res.status(400).json({ message: 'amount must be a positive number' });
  }
  if (!['CASH', 'UPI', 'BANK', 'CHEQUE'].includes(normalizedMode)) {
    return res.status(400).json({ message: 'paymentMode must be CASH, UPI, BANK, or CHEQUE' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const billResult = await client.query('SELECT * FROM bills WHERE id = $1 FOR UPDATE', [billId]);
    if (billResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Bill not found' });
    }

    const bill = billResult.rows[0];
    if (!['CONFIRMED', 'PARTIALLY_PAID'].includes(bill.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Payments allowed only for CONFIRMED or PARTIALLY_PAID bills' });
    }

    const remainingDue = toMoney(bill.amount_due, 0);
    if (normalizedAmount > remainingDue) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Payment amount cannot exceed amount due' });
    }

    await client.query(
      `
        INSERT INTO payments (bill_id, amount, payment_mode, reference_number, recorded_by)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [bill.id, normalizedAmount, normalizedMode, referenceNumber || null, req.user.userId]
    );

    const updatedAmountPaid = toMoney(bill.amount_paid, 0) + normalizedAmount;
    const updatedAmountDue = toMoney(bill.total, 0) - updatedAmountPaid;
    const nextStatus = updatedAmountDue <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    await client.query(
      `
        UPDATE bills
        SET amount_paid = $1,
            amount_due = $2,
            status = $3
        WHERE id = $4
      `,
      [updatedAmountPaid, updatedAmountDue, nextStatus, bill.id]
    );

    await updatePartyOutstandingBalance({
      client,
      billType: bill.bill_type,
      partyType: bill.party_type,
      partyId: bill.party_id,
      amountDelta: -normalizedAmount,
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'BILL_PAYMENT_RECORDED',
      entityType: 'bill',
      entityId: bill.id,
      newValue: { amount: normalizedAmount, paymentMode: normalizedMode, status: nextStatus },
      ipAddress: req.ip,
    });

    await client.query('COMMIT');
    return res.status(201).json({
      message: 'Payment recorded successfully',
      bill: {
        id: bill.id,
        status: nextStatus,
        amount_paid: updatedAmountPaid,
        amount_due: updatedAmountDue,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Unable to record payment', error: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/billing/bills/:id/cancel', requireAuth, requirePermission('billing:write'), async (req, res) => {
  const billId = toInteger(req.params.id);
  if (!billId) {
    return res.status(400).json({ message: 'Invalid bill id' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const billResult = await client.query('SELECT * FROM bills WHERE id = $1 FOR UPDATE', [billId]);
    if (billResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Bill not found' });
    }

    const bill = billResult.rows[0];
    if (bill.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Bill is already cancelled' });
    }

    if (toMoney(bill.amount_paid, 0) > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Cannot cancel bill with recorded payments' });
    }

    if (!['DRAFT', 'CONFIRMED'].includes(bill.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: `Cannot cancel bill in ${bill.status} state` });
    }

    if (bill.status === 'CONFIRMED') {
      const itemsResult = await client.query(
        `
          SELECT bi.part_id, bi.quantity, p.section_id
          FROM bill_items bi
          JOIN parts p ON p.id = bi.part_id
          WHERE bi.bill_id = $1
        `,
        [bill.id]
      );

      if (bill.bill_type === 'SALE') {
        await restoreSaleStockForBill({
          client,
          billId: bill.id,
          performedBy: req.user.userId,
        });
      }

      for (const item of itemsResult.rows) {
        const reverseDelta = bill.bill_type === 'SALE' ? item.quantity : -item.quantity;
        await writeStockLedgerEntry({
          client,
          partId: item.part_id,
          sectionId: item.section_id,
          transactionType: 'ADJUSTMENT',
          quantityDelta: reverseDelta,
          referenceId: bill.id,
          performedBy: req.user.userId,
        });
      }

      await updatePartyOutstandingBalance({
        client,
        billType: bill.bill_type,
        partyType: bill.party_type,
        partyId: bill.party_id,
        amountDelta: -toMoney(bill.total, 0),
      });
    }

    await client.query(
      `
        UPDATE bills
        SET status = 'CANCELLED',
            amount_due = 0
        WHERE id = $1
      `,
      [bill.id]
    );

    await writeAuditLog({
      userId: req.user.userId,
      action: 'BILL_CANCELLED',
      entityType: 'bill',
      entityId: bill.id,
      newValue: { previousStatus: bill.status },
      ipAddress: req.ip,
    });

    await client.query('COMMIT');
    return res.json({ message: 'Bill cancelled successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Unable to cancel bill', error: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/billing/bills/:id/invoice', requireAuth, requirePermission('billing:read'), async (req, res) => {
  const billId = toInteger(req.params.id);
  if (!billId) {
    return res.status(400).json({ message: 'Invalid bill id' });
  }

  const client = await pool.connect();
  try {
    const data = await fetchBillWithItems(client, billId);
    if (!data) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const { bill, items } = data;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${bill.bill_number}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).text('SIBMS Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Bill Number: ${bill.bill_number}`);
    doc.text(`Bill Type: ${bill.bill_type}`);
    doc.text(`Status: ${bill.status}`);
    doc.text(`Bill Date: ${bill.bill_date}`);
    doc.text(`Party Type: ${bill.party_type}`);
    doc.text(`Party ID: ${bill.party_id}`);
    doc.moveDown();

    doc.fontSize(13).text('Items');
    doc.moveDown(0.5);
    for (const item of items) {
      doc
        .fontSize(11)
        .text(`${item.name} (${item.sku})  Qty: ${item.quantity}  Unit: ${item.unit_price}  Line: ${item.line_total}`);
    }

    doc.moveDown();
    doc.fontSize(12).text(`Subtotal: ${bill.subtotal}`);
    doc.text(`Tax: ${bill.tax}`);
    doc.text(`Discount: ${bill.discount}`);
    doc.text(`Total: ${bill.total}`);
    doc.text(`Amount Paid: ${bill.amount_paid}`);
    doc.text(`Amount Due: ${bill.amount_due}`);

    doc.end();
  } catch (error) {
    return res.status(500).json({ message: 'Unable to generate invoice PDF', error: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/parties/customers', requireAuth, requirePermission('customers:write'), async (req, res) => {
  const { name, phone, email, address, creditLimit } = req.body || {};

  if (!name) {
    return res.status(400).json({ message: 'Customer name is required' });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO customers (name, phone, email, address, credit_limit)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, phone, email, address, credit_limit, outstanding_balance, created_at, updated_at
      `,
      [String(name).trim(), phone || null, email || null, address || null, toMoney(creditLimit, 0)]
    );

    await writeAuditLog({
      userId: req.user.userId,
      action: 'CUSTOMER_CREATED',
      entityType: 'customer',
      entityId: result.rows[0].id,
      newValue: { name: result.rows[0].name, email: result.rows[0].email },
      ipAddress: req.ip,
    });

    return res.status(201).json({ message: 'Customer created successfully', customer: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create customer', error: error.message });
  }
});

app.get('/api/parties/customers', requireAuth, requirePermission('customers:read'), async (_req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT id, name, phone, email, address, credit_limit, outstanding_balance, created_at, updated_at
        FROM customers
        ORDER BY id DESC
        LIMIT 50
      `
    );

    return res.json({
      message: 'Customers fetched successfully',
      items: result.rows,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch customers', error: error.message });
  }
});

app.get('/api/parties/customers/:id', requireAuth, requirePermission('customers:read'), async (req, res) => {
  const customerId = toInteger(req.params.id);
  if (!customerId) {
    return res.status(400).json({ message: 'Invalid customer id' });
  }

  try {
    const result = await pool.query(
      `
        SELECT id, name, phone, email, address, credit_limit, outstanding_balance, created_at, updated_at
        FROM customers
        WHERE id = $1
        LIMIT 1
      `,
      [customerId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.json({ message: 'Customer fetched successfully', customer: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch customer', error: error.message });
  }
});

app.put('/api/parties/customers/:id', requireAuth, requirePermission('customers:write'), async (req, res) => {
  const customerId = toInteger(req.params.id);
  const { name, phone, email, address, creditLimit } = req.body || {};

  if (!customerId) {
    return res.status(400).json({ message: 'Invalid customer id' });
  }

  try {
    const result = await pool.query(
      `
        UPDATE customers
        SET
          name = COALESCE($1, name),
          phone = $2,
          email = $3,
          address = $4,
          credit_limit = COALESCE($5, credit_limit),
          updated_at = NOW()
        WHERE id = $6
        RETURNING id, name, phone, email, address, credit_limit, outstanding_balance, created_at, updated_at
      `,
      [name ? String(name).trim() : null, phone || null, email || null, address || null, creditLimit !== undefined ? toMoney(creditLimit, 0) : null, customerId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await writeAuditLog({
      userId: req.user.userId,
      action: 'CUSTOMER_UPDATED',
      entityType: 'customer',
      entityId: customerId,
      newValue: { name: result.rows[0].name },
      ipAddress: req.ip,
    });

    return res.json({ message: 'Customer updated successfully', customer: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update customer', error: error.message });
  }
});

app.delete('/api/parties/customers/:id', requireAuth, requirePermission('customers:write'), async (req, res) => {
  const customerId = toInteger(req.params.id);
  if (!customerId) {
    return res.status(400).json({ message: 'Invalid customer id' });
  }

  try {
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING id', [customerId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await writeAuditLog({
      userId: req.user.userId,
      action: 'CUSTOMER_DELETED',
      entityType: 'customer',
      entityId: customerId,
      ipAddress: req.ip,
    });

    return res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to delete customer', error: error.message });
  }
});

app.get('/api/parties/customers/:id/outstanding', requireAuth, requirePermission('customers:read'), async (req, res) => {
  const customerId = toInteger(req.params.id);
  if (!customerId) {
    return res.status(400).json({ message: 'Invalid customer id' });
  }

  const client = await pool.connect();
  try {
    const customerResult = await client.query(
      'SELECT id, name, credit_limit, outstanding_balance FROM customers WHERE id = $1 LIMIT 1',
      [customerId]
    );

    if (customerResult.rowCount === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const summary = await calculateOutstandingFromLedger({ client, partyType: 'CUSTOMER', partyId: customerId });

    return res.json({
      message: 'Customer outstanding summary fetched successfully',
      summary: {
        customerId,
        customerName: customerResult.rows[0].name,
        creditLimit: toMoney(customerResult.rows[0].credit_limit, 0),
        storedOutstanding: toMoney(customerResult.rows[0].outstanding_balance, 0),
        calculatedOutstanding: summary.outstandingBalance,
        billedTotal: summary.billedTotal,
        paidTotal: summary.paidTotal,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch outstanding summary', error: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/parties/customers/:id/history', requireAuth, requirePermission('customers:read'), async (req, res) => {
  const customerId = toInteger(req.params.id);
  if (!customerId) {
    return res.status(400).json({ message: 'Invalid customer id' });
  }

  const client = await pool.connect();
  try {
    const customerResult = await client.query(
      'SELECT id, name, email, phone, outstanding_balance FROM customers WHERE id = $1 LIMIT 1',
      [customerId]
    );

    if (customerResult.rowCount === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const billsResult = await client.query(
      `
        SELECT id, bill_number, bill_type, bill_date, status, total, amount_paid, amount_due, created_at
        FROM bills
        WHERE party_type = 'CUSTOMER' AND party_id = $1
        ORDER BY id DESC
      `,
      [customerId]
    );

    const paymentsResult = await client.query(
      `
        SELECT p.id, p.bill_id, b.bill_number, p.amount, p.payment_mode, p.reference_number, p.paid_at
        FROM payments p
        JOIN bills b ON b.id = p.bill_id
        WHERE b.party_type = 'CUSTOMER' AND b.party_id = $1
        ORDER BY p.paid_at DESC
      `,
      [customerId]
    );

    return res.json({
      message: 'Customer history fetched successfully',
      customer: customerResult.rows[0],
      bills: billsResult.rows,
      payments: paymentsResult.rows,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch customer history', error: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/parties/suppliers', requireAuth, requirePermission('customers:write'), async (req, res) => {
  const { name, phone, email, address } = req.body || {};
  if (!name) {
    return res.status(400).json({ message: 'Supplier name is required' });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO suppliers (name, phone, email, address)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, phone, email, address, outstanding_balance, created_at, updated_at
      `,
      [String(name).trim(), phone || null, email || null, address || null]
    );

    return res.status(201).json({ message: 'Supplier created successfully', supplier: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create supplier', error: error.message });
  }
});

app.get('/api/parties/suppliers', requireAuth, requirePermission('customers:read'), async (_req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT id, name, phone, email, address, outstanding_balance, created_at, updated_at
        FROM suppliers
        ORDER BY id DESC
        LIMIT 50
      `
    );

    return res.json({ message: 'Suppliers fetched successfully', items: result.rows });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch suppliers', error: error.message });
  }
});

app.get('/api/parties/suppliers/:id', requireAuth, requirePermission('customers:read'), async (req, res) => {
  const supplierId = toInteger(req.params.id);
  if (!supplierId) {
    return res.status(400).json({ message: 'Invalid supplier id' });
  }

  try {
    const result = await pool.query(
      `
        SELECT id, name, phone, email, address, outstanding_balance, created_at, updated_at
        FROM suppliers
        WHERE id = $1
        LIMIT 1
      `,
      [supplierId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    return res.json({ message: 'Supplier fetched successfully', supplier: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch supplier', error: error.message });
  }
});

app.put('/api/parties/suppliers/:id', requireAuth, requirePermission('customers:write'), async (req, res) => {
  const supplierId = toInteger(req.params.id);
  const { name, phone, email, address } = req.body || {};
  if (!supplierId) {
    return res.status(400).json({ message: 'Invalid supplier id' });
  }

  try {
    const result = await pool.query(
      `
        UPDATE suppliers
        SET
          name = COALESCE($1, name),
          phone = $2,
          email = $3,
          address = $4,
          updated_at = NOW()
        WHERE id = $5
        RETURNING id, name, phone, email, address, outstanding_balance, created_at, updated_at
      `,
      [name ? String(name).trim() : null, phone || null, email || null, address || null, supplierId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    return res.json({ message: 'Supplier updated successfully', supplier: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update supplier', error: error.message });
  }
});

app.delete('/api/parties/suppliers/:id', requireAuth, requirePermission('customers:write'), async (req, res) => {
  const supplierId = toInteger(req.params.id);
  if (!supplierId) {
    return res.status(400).json({ message: 'Invalid supplier id' });
  }

  try {
    const result = await pool.query('DELETE FROM suppliers WHERE id = $1 RETURNING id', [supplierId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    return res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to delete supplier', error: error.message });
  }
});

app.get('/api/parties/suppliers/:id/outstanding', requireAuth, requirePermission('customers:read'), async (req, res) => {
  const supplierId = toInteger(req.params.id);
  if (!supplierId) {
    return res.status(400).json({ message: 'Invalid supplier id' });
  }

  const client = await pool.connect();
  try {
    const supplierResult = await client.query(
      'SELECT id, name, outstanding_balance FROM suppliers WHERE id = $1 LIMIT 1',
      [supplierId]
    );

    if (supplierResult.rowCount === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const summary = await calculateOutstandingFromLedger({ client, partyType: 'SUPPLIER', partyId: supplierId });

    return res.json({
      message: 'Supplier outstanding summary fetched successfully',
      summary: {
        supplierId,
        supplierName: supplierResult.rows[0].name,
        storedOutstanding: toMoney(supplierResult.rows[0].outstanding_balance, 0),
        calculatedOutstanding: summary.outstandingBalance,
        billedTotal: summary.billedTotal,
        paidTotal: summary.paidTotal,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch supplier outstanding summary', error: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/notifications/templates', requireAuth, requirePermission('billing:read'), async (_req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT id, name, channel, subject, body, is_active, created_at, updated_at
        FROM notification_templates
        ORDER BY id DESC
      `
    );

    return res.json({ message: 'Notification templates fetched successfully', items: result.rows });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch notification templates', error: error.message });
  }
});

app.post('/api/notifications/templates', requireAuth, requirePermission('billing:write'), async (req, res) => {
  const validation = normalizeTemplatePayload(req.body || {});
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  const payload = validation.normalized;
  try {
    const result = await pool.query(
      `
        INSERT INTO notification_templates (name, channel, subject, body, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, channel, subject, body, is_active, created_at, updated_at
      `,
      [payload.name, payload.channel, payload.subject, payload.body, payload.isActive]
    );

    await writeAuditLog({
      userId: req.user.userId,
      action: 'NOTIFICATION_TEMPLATE_CREATED',
      entityType: 'notification_template',
      entityId: result.rows[0].id,
      newValue: { name: payload.name, channel: payload.channel },
      ipAddress: req.ip,
    });

    return res.status(201).json({ message: 'Notification template created successfully', template: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Template name already exists' });
    }
    return res.status(500).json({ message: 'Unable to create notification template', error: error.message });
  }
});

app.put('/api/notifications/templates/:id', requireAuth, requirePermission('billing:write'), async (req, res) => {
  const templateId = toInteger(req.params.id);
  if (!templateId) {
    return res.status(400).json({ message: 'Invalid template id' });
  }

  const body = req.body || {};
  const channel = body.channel === undefined ? null : normalizeNotificationChannel(body.channel);
  if (channel && !NOTIFICATION_CHANNELS.includes(channel)) {
    return res.status(400).json({ message: 'channel must be one of SMS, WHATSAPP, EMAIL, INTERNAL' });
  }

  if (body.name !== undefined && !String(body.name).trim()) {
    return res.status(400).json({ message: 'name cannot be empty' });
  }

  if (body.body !== undefined && !String(body.body).trim()) {
    return res.status(400).json({ message: 'body cannot be empty' });
  }

  try {
    const result = await pool.query(
      `
        UPDATE notification_templates
        SET
          name = COALESCE($1, name),
          channel = COALESCE($2, channel),
          subject = COALESCE($3, subject),
          body = COALESCE($4, body),
          is_active = COALESCE($5, is_active),
          updated_at = NOW()
        WHERE id = $6
        RETURNING id, name, channel, subject, body, is_active, created_at, updated_at
      `,
      [
        body.name !== undefined ? String(body.name).trim() : null,
        channel,
        body.subject !== undefined ? String(body.subject || '').trim() : null,
        body.body !== undefined ? String(body.body) : null,
        body.isActive !== undefined ? toBoolean(body.isActive) : null,
        templateId,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Notification template not found' });
    }

    await writeAuditLog({
      userId: req.user.userId,
      action: 'NOTIFICATION_TEMPLATE_UPDATED',
      entityType: 'notification_template',
      entityId: templateId,
      ipAddress: req.ip,
    });

    return res.json({ message: 'Notification template updated successfully', template: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Template name already exists' });
    }
    return res.status(500).json({ message: 'Unable to update notification template', error: error.message });
  }
});

app.post('/api/notifications/reminders/generate', requireAuth, requirePermission('billing:write'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const summary = await generateBillReminderJobs({
      client,
      daysAhead: req.body?.daysAhead,
      includeOverdue: req.body?.includeOverdue,
      createdBy: req.user.userId,
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'NOTIFICATION_REMINDERS_GENERATED',
      entityType: 'notification_job',
      newValue: summary,
      ipAddress: req.ip,
    });

    await client.query('COMMIT');
    return res.status(201).json({ message: 'Reminder jobs generated successfully', summary });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Unable to generate reminder jobs', error: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/notifications/reminders/dispatch', requireAuth, requirePermission('billing:write'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const summary = await dispatchPendingNotificationJobs({
      client,
      limit: req.body?.limit,
      actorUserId: req.user.userId,
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'NOTIFICATION_REMINDERS_DISPATCHED',
      entityType: 'notification_job',
      newValue: summary,
      ipAddress: req.ip,
    });

    await client.query('COMMIT');
    return res.json({ message: 'Reminder dispatch completed', summary });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Unable to dispatch reminder jobs', error: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/notifications/jobs', requireAuth, requirePermission('billing:read'), async (req, res) => {
  const status = req.query.status ? String(req.query.status).trim().toUpperCase() : null;
  const limit = Math.min(Math.max(toInteger(req.query.limit) || 50, 1), 200);

  if (status && !NOTIFICATION_JOB_STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Invalid status filter' });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          id,
          job_type,
          bill_id,
          party_type,
          party_id,
          recipient_name,
          due_date,
          outstanding_amount,
          status,
          scheduled_for,
          sent_at,
          attempt_count,
          last_error,
          created_at,
          updated_at
        FROM notification_jobs
        WHERE ($1::VARCHAR IS NULL OR status = $1)
        ORDER BY id DESC
        LIMIT $2
      `,
      [status, limit]
    );

    return res.json({ message: 'Notification jobs fetched successfully', items: result.rows });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch notification jobs', error: error.message });
  }
});

app.get('/api/notifications/jobs/:id', requireAuth, requirePermission('billing:read'), async (req, res) => {
  const jobId = toInteger(req.params.id);
  if (!jobId) {
    return res.status(400).json({ message: 'Invalid notification job id' });
  }

  try {
    const jobResult = await pool.query(
      `
        SELECT
          id,
          job_type,
          bill_id,
          party_type,
          party_id,
          recipient_name,
          recipient_phone,
          recipient_email,
          due_date,
          outstanding_amount,
          status,
          scheduled_for,
          sent_at,
          attempt_count,
          last_error,
          payload,
          created_at,
          updated_at
        FROM notification_jobs
        WHERE id = $1
        LIMIT 1
      `,
      [jobId]
    );

    if (jobResult.rowCount === 0) {
      return res.status(404).json({ message: 'Notification job not found' });
    }

    const logsResult = await pool.query(
      `
        SELECT id, channel, status, provider_message, payload, provider_response, created_at
        FROM notification_delivery_logs
        WHERE job_id = $1
        ORDER BY id DESC
      `,
      [jobId]
    );

    return res.json({
      message: 'Notification job detail fetched successfully',
      job: jobResult.rows[0],
      deliveries: logsResult.rows,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch notification job detail', error: error.message });
  }
});

app.post('/api/ai/voice/stt', requireAuth, requirePermission('inventory:read'), async (req, res) => {
  const { audioBase64, mockTranscript } = req.body || {};

  try {
    const stt = await resolveSpeechToText({ audioBase64, mockTranscript });
    if (stt.error) {
      return res.status(stt.statusCode || 500).json({ message: stt.error });
    }

    await writeAuditLog({
      userId: req.user.userId,
      action: 'VOICE_STT_REQUEST',
      entityType: 'voice_agent',
      newValue: { provider: stt.provider, mocked: stt.mocked },
      ipAddress: req.ip,
    });

    return res.json({
      message: 'Speech-to-text conversion completed',
      transcript: stt.transcript,
      provider: stt.provider,
      mocked: stt.mocked,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to process speech input', error: error.message });
  }
});

app.post('/api/ai/voice/query', requireAuth, requirePermission('inventory:read'), async (req, res) => {
  const queryText = normalizeVoiceText(req.body?.queryText);
  const limit = req.body?.limit;

  if (!queryText) {
    return res.status(400).json({ message: 'queryText is required' });
  }

  if (queryText.length < 2 || queryText.length > 280) {
    return res.status(400).json({ message: 'queryText must be between 2 and 280 characters' });
  }

  if (containsUnsafeVoiceQuery(queryText)) {
    return res.status(400).json({
      message: 'Query violates guardrails. Ask only inventory/location lookup questions.',
      code: 'VOICE_GUARDRAIL_BLOCKED',
    });
  }

  try {
    const intentResult = await resolveVoiceIntentWithFallback(queryText);
    const matches = await queryVoicePartMatches({
      searchTerm: intentResult.entities.searchTerm,
      make: intentResult.entities.make,
      model: intentResult.entities.model,
      year: intentResult.entities.year,
      limit,
    });

    const answer = buildVoiceQueryAnswer({
      intent: intentResult.intent,
      entities: intentResult.entities,
      matches,
    });

    await writeAuditLog({
      userId: req.user.userId,
      action: 'VOICE_QUERY_EXECUTED',
      entityType: 'voice_agent',
      newValue: {
        queryText,
        intent: intentResult.intent,
        entityHints: intentResult.entities,
        resultCount: matches.length,
      },
      ipAddress: req.ip,
    });

    return res.json({
      message: 'Voice query processed successfully',
      intent: {
        name: intentResult.intent,
        provider: intentResult.provider,
        usedFallback: intentResult.usedFallback,
      },
      entities: intentResult.entities,
      resultCount: matches.length,
      items: matches,
      answer,
      fallback: matches.length === 0,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to process voice query', error: error.message });
  }
});

// ============================================================================
// EMPLOYEE MANAGEMENT ENDPOINTS
// ============================================================================

app.post('/api/employees', requireAuth, requirePermission('employees:write'), async (req, res) => {
  const { fullName, phone, email } = req.body || {};

  if (!fullName || !email) {
    return res.status(400).json({ message: 'fullName and email are required' });
  }

  try {
    // Generate emp_code: EMP-YYYYMMDD-XXXXX
    const empCode = `EMP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const result = await pool.query(
      `
        INSERT INTO employees (emp_code, full_name, phone, email, is_active)
        VALUES ($1, $2, $3, $4, true)
        RETURNING id, emp_code, full_name, phone, email, is_active, created_at
      `,
      [empCode, String(fullName).trim(), phone ? String(phone).trim() : null, String(email).trim().toLowerCase()]
    );

    const employee = result.rows[0];

    await writeAuditLog({
      userId: req.user.userId,
      action: 'EMPLOYEE_CREATED',
      entityType: 'employee',
      entityId: employee.id,
      newValue: employee,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: 'Employee created successfully',
      employee,
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Employee email already exists' });
    }
    return res.status(500).json({ message: 'Unable to create employee', error: error.message });
  }
});

app.get('/api/employees', requireAuth, requirePermission('employees:read'), async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT 
          e.id, e.emp_code, e.full_name, e.phone, e.email, e.is_active, e.created_at, e.updated_at,
          COALESCE(json_agg(json_build_object('roleId', r.id, 'roleName', r.name)) FILTER (WHERE r.id IS NOT NULL), '[]'::json) as roles
        FROM employees e
        LEFT JOIN employee_roles er ON e.id = er.employee_id
        LEFT JOIN roles r ON er.role_id = r.id
        GROUP BY e.id
        ORDER BY e.created_at DESC
      `
    );

    return res.json({
      message: 'Employees fetched successfully',
      employees: result.rows,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch employees', error: error.message });
  }
});

app.get('/api/employees/:id', requireAuth, requirePermission('employees:read'), async (req, res) => {
  const empId = toInteger(req.params.id);
  if (!empId) {
    return res.status(400).json({ message: 'Invalid employee id' });
  }

  try {
    const result = await pool.query(
      `
        SELECT 
          e.id, e.emp_code, e.full_name, e.phone, e.email, e.is_active, e.created_at, e.updated_at,
          COALESCE(json_agg(json_build_object('roleId', r.id, 'roleName', r.name, 'permissions', r.permissions)) FILTER (WHERE r.id IS NOT NULL), '[]'::json) as roles
        FROM employees e
        LEFT JOIN employee_roles er ON e.id = er.employee_id
        LEFT JOIN roles r ON er.role_id = r.id
        WHERE e.id = $1
        GROUP BY e.id
      `,
      [empId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    return res.json({
      message: 'Employee fetched successfully',
      employee: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch employee', error: error.message });
  }
});

app.put('/api/employees/:id', requireAuth, requirePermission('employees:write'), async (req, res) => {
  const empId = toInteger(req.params.id);
  if (!empId) {
    return res.status(400).json({ message: 'Invalid employee id' });
  }

  const { fullName, phone, email, isActive } = req.body || {};

  try {
    const result = await pool.query(
      `
        UPDATE employees
        SET
          full_name = COALESCE($1, full_name),
          phone = COALESCE($2, phone),
          email = COALESCE($3, email),
          is_active = COALESCE($4, is_active),
          updated_at = NOW()
        WHERE id = $5
        RETURNING id, emp_code, full_name, phone, email, is_active, created_at, updated_at
      `,
      [
        fullName ? String(fullName).trim() : null,
        phone ? String(phone).trim() : null,
        email ? String(email).trim().toLowerCase() : null,
        isActive !== undefined ? Boolean(isActive) : null,
        empId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const employee = result.rows[0];

    await writeAuditLog({
      userId: req.user.userId,
      action: 'EMPLOYEE_UPDATED',
      entityType: 'employee',
      entityId: empId,
      newValue: employee,
      ipAddress: req.ip,
    });

    return res.json({
      message: 'Employee updated successfully',
      employee,
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Email already in use' });
    }
    return res.status(500).json({ message: 'Unable to update employee', error: error.message });
  }
});

app.post('/api/employees/:id/roles', requireAuth, requirePermission('employees:write'), async (req, res) => {
  const empId = toInteger(req.params.id);
  const { roleId } = req.body || {};
  const parsedRoleId = toInteger(roleId);

  if (!empId || !parsedRoleId) {
    return res.status(400).json({ message: 'Invalid employee id or role id' });
  }

  try {
    // Check if employee exists
    const empCheck = await pool.query('SELECT id FROM employees WHERE id = $1', [empId]);
    if (empCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if role exists
    const roleCheck = await pool.query('SELECT id FROM roles WHERE id = $1', [parsedRoleId]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Insert role assignment
    await pool.query(
      `
        INSERT INTO employee_roles (employee_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT (employee_id, role_id) DO NOTHING
      `,
      [empId, parsedRoleId]
    );

    await writeAuditLog({
      userId: req.user.userId,
      action: 'EMPLOYEE_ROLE_ASSIGNED',
      entityType: 'employee_role',
      entityId: empId,
      newValue: { employeeId: empId, roleId: parsedRoleId },
      ipAddress: req.ip,
    });

    return res.status(201).json({ message: 'Role assigned successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to assign role', error: error.message });
  }
});

// ============================================================================
// STOCK MANAGEMENT ENDPOINTS (ADVANCED)
// ============================================================================

app.post('/api/stock/entries', requireAuth, requirePermission('inventory:write'), async (req, res) => {
  const { partId, sectionId, supplierId, batchNumber, quantity, costPrice, receivedDate, expiryDate, billDocUrl, notes } = req.body || {};

  const parsedPartId = toInteger(partId);
  const parsedSectionId = toInteger(sectionId);
  const parsedSupplierId = toInteger(supplierId);
  const parsedQuantity = toInteger(quantity);
  const parsedCostPrice = toMoney(costPrice, 2);

  if (!parsedPartId || !parsedSectionId || !parsedQuantity || !parsedCostPrice) {
    return res.status(400).json({ message: 'partId, sectionId, quantity, and costPrice are required' });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO stock_entries (part_id, section_id, supplier_id, batch_number, quantity, cost_price, received_date, expiry_date, added_by, bill_doc_url, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, part_id, section_id, supplier_id, batch_number, quantity, cost_price, received_date, expiry_date, created_at
      `,
      [
        parsedPartId,
        parsedSectionId,
        parsedSupplierId || null,
        batchNumber ? String(batchNumber).trim() : null,
        parsedQuantity,
        parsedCostPrice,
        receivedDate || null,
        expiryDate || null,
        req.user.userId,
        billDocUrl ? String(billDocUrl).trim() : null,
        notes ? String(notes).trim() : null,
      ]
    );

    const entry = result.rows[0];

    // Create immutable stock log entry
    await pool.query(
      `
        INSERT INTO stock_logs (stock_entry_id, part_id, action, quantity_change, balance_after, reference_type, reference_id, performed_by, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        entry.id,
        parsedPartId,
        'STOCK_ENTRY_CREATED',
        parsedQuantity,
        parsedQuantity, // Initial balance is the quantity added
        'stock_entry',
        entry.id,
        req.user.userId,
        `Stock entry created: Batch ${batchNumber || 'N/A'}, Qty ${parsedQuantity}`,
      ]
    );

    await writeAuditLog({
      userId: req.user.userId,
      action: 'STOCK_ENTRY_CREATED',
      entityType: 'stock_entry',
      entityId: entry.id,
      newValue: entry,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: 'Stock entry created successfully',
      entry,
    });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({ message: 'Invalid part, section, or supplier reference' });
    }
    return res.status(500).json({ message: 'Unable to create stock entry', error: error.message });
  }
});

app.get('/api/stock/entries', requireAuth, requirePermission('inventory:read'), async (req, res) => {
  const { partId, sectionId, supplierId, limit = 100 } = req.query || {};
  const parsedLimit = Math.min(toInteger(limit) || 100, 1000);

  let query = `
    SELECT id, part_id, section_id, supplier_id, batch_number, quantity, cost_price, received_date, expiry_date, created_at
    FROM stock_entries
    WHERE 1=1
  `;
  const params = [];

  if (partId) {
    params.push(toInteger(partId));
    query += ` AND part_id = $${params.length}`;
  }
  if (sectionId) {
    params.push(toInteger(sectionId));
    query += ` AND section_id = $${params.length}`;
  }
  if (supplierId) {
    params.push(toInteger(supplierId));
    query += ` AND supplier_id = $${params.length}`;
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(parsedLimit);

  try {
    const result = await pool.query(query, params);
    return res.json({
      message: 'Stock entries fetched successfully',
      entries: result.rows,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch stock entries', error: error.message });
  }
});

app.get('/api/stock/logs', requireAuth, requirePermission('inventory:read'), async (req, res) => {
  const { partId, limit = 100 } = req.query || {};
  const parsedLimit = Math.min(toInteger(limit) || 100, 1000);

  let query = `
    SELECT id, stock_entry_id, part_id, action, quantity_change, balance_after, reference_type, reference_id, performed_by, notes, created_at
    FROM stock_logs
    WHERE 1=1
  `;
  const params = [];

  if (partId) {
    params.push(toInteger(partId));
    query += ` AND part_id = $${params.length}`;
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(parsedLimit);

  try {
    const result = await pool.query(query, params);
    return res.json({
      message: 'Stock logs fetched successfully',
      logs: result.rows,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch stock logs', error: error.message });
  }
});

// ============================================================================
// ACTIVITY & DEMAND LOGGING ENDPOINTS
// ============================================================================

app.get('/api/activity-logs', requireAuth, requirePermission('audit:read'), async (req, res) => {
  const { employeeId, entityType, limit = 100, offset = 0 } = req.query || {};
  const parsedLimit = Math.min(toInteger(limit) || 100, 1000);
  const parsedOffset = toInteger(offset) || 0;

  let query = `
    SELECT id, employee_id, action, entity_type, entity_id, ip_address, metadata, created_at
    FROM activity_logs
    WHERE 1=1
  `;
  const params = [];

  if (employeeId) {
    params.push(toInteger(employeeId));
    query += ` AND employee_id = $${params.length}`;
  }
  if (entityType) {
    params.push(String(entityType).trim());
    query += ` AND entity_type = $${params.length}`;
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parsedLimit, parsedOffset);

  try {
    const result = await pool.query(query, params);
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM activity_logs WHERE 1=1${employeeId ? ` AND employee_id = ${toInteger(employeeId)}` : ''}${entityType ? ` AND entity_type = '${String(entityType).trim()}'` : ''}`
    );

    return res.json({
      message: 'Activity logs fetched successfully',
      logs: result.rows,
      total: toInteger(countResult.rows[0].total),
      limit: parsedLimit,
      offset: parsedOffset,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch activity logs', error: error.message });
  }
});

app.get('/api/demand-logs', requireAuth, requirePermission('ai_agent:read'), async (req, res) => {
  const { fulfilled, limit = 100, offset = 0 } = req.query || {};
  const parsedLimit = Math.min(toInteger(limit) || 100, 1000);
  const parsedOffset = toInteger(offset) || 0;

  let query = `
    SELECT id, source, query_text, product_id, vehicle_make, vehicle_model, quantity_req, fulfilled, caller_phone, created_at
    FROM demand_logs
    WHERE 1=1
  `;
  const params = [];

  if (fulfilled !== undefined) {
    params.push(fulfilled === 'true' || fulfilled === true);
    query += ` AND fulfilled = $${params.length}`;
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parsedLimit, parsedOffset);

  try {
    const result = await pool.query(query, params);
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM demand_logs${fulfilled !== undefined ? ` WHERE fulfilled = ${fulfilled === 'true' || fulfilled === true}` : ''}`
    );

    return res.json({
      message: 'Demand logs fetched successfully',
      logs: result.rows,
      total: toInteger(countResult.rows[0].total),
      limit: parsedLimit,
      offset: parsedOffset,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch demand logs', error: error.message });
  }
});

app.post('/api/demand-logs', requireAuth, async (req, res) => {
  const { source, queryText, productId, vehicleMake, vehicleModel, quantityReq, callerPhone, fulfilled } = req.body || {};

  if (!source || !queryText) {
    return res.status(400).json({ message: 'source and queryText are required' });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO demand_logs (source, query_text, product_id, vehicle_make, vehicle_model, quantity_req, fulfilled, caller_phone)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, source, query_text, product_id, vehicle_make, vehicle_model, quantity_req, fulfilled, caller_phone, created_at
      `,
      [
        String(source).trim(),
        String(queryText).trim(),
        toInteger(productId) || null,
        vehicleMake ? String(vehicleMake).trim() : null,
        vehicleModel ? String(vehicleModel).trim() : null,
        toInteger(quantityReq) || 0,
        fulfilled === true || fulfilled === 'true',
        callerPhone ? String(callerPhone).trim() : null,
      ]
    );

    await writeAuditLog({
      userId: req.user.userId,
      action: 'DEMAND_LOG_CREATED',
      entityType: 'demand',
      entityId: result.rows[0].id,
      newValue: result.rows[0],
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: 'Demand logged successfully',
      log: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to log demand', error: error.message });
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    const db = await checkDatabaseConnection();
    res.json({
      status: 'ok',
      message: 'Backend and PostgreSQL are connected',
      databaseTime: db.now,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Backend is running but PostgreSQL is not reachable',
      error: error.message,
    });
  }
});

// ============================================================================
// DASHBOARD ENHANCED KPIs ENDPOINT (PHASE 3)
// ============================================================================

app.get('/api/dashboard/kpis-enhanced', requireAuth, requirePermission('dashboard:read'), async (_req, res) => {
  try {
    // Total stock value (sum of all stock entries)
    const stockValueResult = await pool.query(
      `
        SELECT COALESCE(SUM(se.quantity * se.cost_price), 0)::NUMERIC AS total_stock_value
        FROM stock_entries se
      `
    );

    // Pending bills value
    const pendingBillsResult = await pool.query(
      `
        SELECT COALESCE(SUM(amount_due), 0)::NUMERIC AS pending_bills_value,
               COUNT(*) AS pending_bills_count
        FROM bills
        WHERE status IN ('CONFIRMED', 'PARTIALLY_PAID', 'OVERDUE')
      `
    );

    // Low stock products
    const lowStockResult = await pool.query(
      `
        SELECT COUNT(*) AS low_stock_count
        FROM parts p
        LEFT JOIN stock_entries se ON p.id = se.part_id
        GROUP BY p.id
        HAVING COALESCE(SUM(se.quantity), 0) <= p.reorder_threshold
      `
    );

    // Today's sales
    const todaySalesResult = await pool.query(
      `
        SELECT COALESCE(SUM(total), 0)::NUMERIC AS today_sales,
               COUNT(*) AS today_sales_count
        FROM bills
        WHERE bill_type = 'SALE'
          AND DATE(bill_date) = CURRENT_DATE
          AND status IN ('CONFIRMED', 'PARTIALLY_PAID', 'PAID')
      `
    );

    // Top 10 products (by sales quantity in last 30 days)
    const topProductsResult = await pool.query(
      `
        SELECT p.id, p.name, p.sku, COALESCE(SUM(bi.quantity), 0)::INTEGER AS sales_qty
        FROM parts p
        LEFT JOIN bill_items bi ON p.id = bi.part_id
        LEFT JOIN bills b ON bi.bill_id = b.id AND b.bill_type = 'SALE'
        WHERE b.bill_date >= CURRENT_DATE - INTERVAL '30 days' OR b.bill_date IS NULL
        GROUP BY p.id, p.name, p.sku
        ORDER BY sales_qty DESC
        LIMIT 10
      `
    );

    // Dead stock (no movement in 90+ days)
    const deadStockResult = await pool.query(
      `
        SELECT COUNT(*) AS dead_stock_count
        FROM parts p
        WHERE NOT EXISTS (
          SELECT 1 FROM bills b
          JOIN bill_items bi ON b.id = bi.bill_id
          WHERE bi.part_id = p.id
            AND b.bill_type = 'SALE'
            AND b.bill_date >= CURRENT_DATE - INTERVAL '90 days'
        )
      `
    );

    // Overdue bills summary
    const overdueResult = await pool.query(
      `
        SELECT COUNT(*) AS overdue_count,
               COALESCE(SUM(amount_due), 0)::NUMERIC AS overdue_amount
        FROM bills
        WHERE status IN ('CONFIRMED', 'PARTIALLY_PAID')
          AND due_date < CURRENT_DATE
      `
    );

    return res.json({
      message: 'Enhanced dashboard KPIs fetched successfully',
      kpis: {
        totalStockValue: toMoney(stockValueResult.rows[0].total_stock_value, 0),
        pendingBillsValue: toMoney(pendingBillsResult.rows[0].pending_bills_value, 0),
        pendingBillsCount: toInteger(pendingBillsResult.rows[0].pending_bills_count),
        lowStockCount: toInteger(lowStockResult.rows[0]?.low_stock_count || 0),
        todaysSales: toMoney(todaySalesResult.rows[0].today_sales, 0),
        todaysSalesCount: toInteger(todaySalesResult.rows[0].today_sales_count),
        deadStockCount: toInteger(deadStockResult.rows[0].dead_stock_count),
        overdueCount: toInteger(overdueResult.rows[0].overdue_count),
        overdueAmount: toMoney(overdueResult.rows[0].overdue_amount, 0),
        topProducts: topProductsResult.rows,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch enhanced dashboard KPIs', error: error.message });
  }
});

// ============================================================================
// SYSTEM AI FEATURES (PHASE 3)
// ============================================================================

app.get('/api/ai/reorder-suggestions', requireAuth, requirePermission('inventory:read'), async (_req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          p.id,
          p.sku,
          p.name,
          p.reorder_threshold,
          COALESCE(SUM(se.quantity), 0)::INTEGER AS current_stock,
          p.cost_price,
          (p.reorder_threshold - COALESCE(SUM(se.quantity), 0))::INTEGER AS suggested_order_qty,
          s.name AS supplier_name,
          s.phone AS supplier_phone
        FROM parts p
        LEFT JOIN stock_entries se ON p.id = se.part_id
        LEFT JOIN suppliers s ON se.supplier_id = s.id
        WHERE COALESCE(SUM(se.quantity), 0) <= p.reorder_threshold
        GROUP BY p.id, p.name, p.sku, p.cost_price, p.reorder_threshold, s.id, s.name, s.phone
        ORDER BY current_stock ASC, p.name ASC
        LIMIT 50
      `
    );

    return res.json({
      message: 'Reorder suggestions fetched successfully',
      suggestions: result.rows,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch reorder suggestions', error: error.message });
  }
});

app.get('/api/ai/sales-trends', requireAuth, requirePermission('inventory:read'), async (req, res) => {
  const days = Math.min(Math.max(toInteger(req.query.days) || 30, 1), 365);

  try {
    const result = await pool.query(
      `
        SELECT
          p.id,
          p.name,
          p.sku,
          COALESCE(SUM(bi.quantity), 0)::INTEGER AS total_qty_sold,
          COALESCE(SUM(bi.line_total), 0)::NUMERIC AS total_revenue,
          COUNT(DISTINCT b.id)::INTEGER AS transaction_count,
          ROUND(AVG(bi.unit_price)::NUMERIC, 2) AS avg_price
        FROM parts p
        LEFT JOIN bill_items bi ON p.id = bi.part_id
        LEFT JOIN bills b ON bi.bill_id = b.id
        WHERE b.bill_type = 'SALE'
          AND (b.bill_date IS NULL OR b.bill_date >= CURRENT_DATE - ($1::INTEGER * INTERVAL '1 day'))
        GROUP BY p.id, p.name, p.sku
        HAVING COALESCE(SUM(bi.quantity), 0) > 0
        ORDER BY total_revenue DESC
        LIMIT 20
      `,
      [days]
    );

    return res.json({
      message: 'Sales trends fetched successfully',
      trends: result.rows,
      period: `Last ${days} days`,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch sales trends', error: error.message });
  }
});

app.get('/api/ai/demand-forecast', requireAuth, requirePermission('inventory:read'), async (_req, res) => {
  try {
    const result = await pool.query(
      `
        WITH sales_30d AS (
          SELECT
            p.id,
            p.name,
            p.sku,
            COALESCE(SUM(bi.quantity), 0)::INTEGER AS sales_qty_30d,
            COALESCE(COUNT(DISTINCT DATE(b.bill_date)), 1)::INTEGER AS days_active
          FROM parts p
          LEFT JOIN bill_items bi ON p.id = bi.part_id
          LEFT JOIN bills b ON bi.bill_id = b.id AND b.bill_type = 'SALE'
          WHERE b.bill_date >= CURRENT_DATE - INTERVAL '30 days' OR b.bill_date IS NULL
          GROUP BY p.id, p.name, p.sku
        )
        SELECT
          id,
          name,
          sku,
          sales_qty_30d,
          GREATEST(1, (sales_qty_30d / NULLIF(days_active, 0)))::INTEGER AS daily_avg,
          (GREATEST(1, (sales_qty_30d / NULLIF(days_active, 0))) * 30)::INTEGER AS projected_30d_demand
        FROM sales_30d
        WHERE sales_qty_30d > 0
        ORDER BY projected_30d_demand DESC
        LIMIT 30
      `
    );

    return res.json({
      message: 'Demand forecast fetched successfully',
      forecast: result.rows,
      period: 'Next 30 days',
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to generate demand forecast', error: error.message });
  }
});

// ============================================================================
// REPORTS API (PHASE 4)
// ============================================================================

app.get('/api/reports/stock', requireAuth, requirePermission('inventory:read'), async (req, res) => {
  const { format = 'json', sectionId } = req.query;
  const parsedSectionId = sectionId ? toInteger(sectionId) : null;

  try {
    let query = `
      SELECT
        p.id,
        p.sku,
        p.name,
        p.cost_price,
        p.selling_price,
        p.reorder_threshold,
        s.name AS section_name,
        c.name AS cabinet_name,
        r.name AS room_name,
        COALESCE(SUM(se.quantity), 0)::INTEGER AS current_stock,
        COALESCE(SUM(se.quantity * se.cost_price), 0)::NUMERIC AS stock_value,
        (COALESCE(SUM(se.quantity), 0) <= p.reorder_threshold) AS is_low_stock
      FROM parts p
      LEFT JOIN sections s ON p.section_id = s.id
      LEFT JOIN cabinets c ON s.cabinet_id = c.id
      LEFT JOIN rooms r ON c.room_id = r.id
      LEFT JOIN stock_entries se ON p.id = se.part_id
    `;

    const params = [];
    if (parsedSectionId) {
      params.push(parsedSectionId);
      query += ` WHERE s.id = $${params.length}`;
    }

    query += `
      GROUP BY p.id, p.sku, p.name, p.cost_price, p.selling_price, p.reorder_threshold, s.id, s.name, c.id, c.name, r.id, r.name
      ORDER BY r.name, c.name, s.name, p.name
    `;

    const result = await pool.query(query, params);

    if (format === 'csv') {
      const csv = [
        ['SKU', 'Name', 'Section', 'Cabinet', 'Room', 'Current Stock', 'Cost Price', 'Selling Price', 'Stock Value', 'Is Low Stock'].join(','),
        ...result.rows.map((row) =>
          [
            row.sku,
            row.name,
            row.section_name || 'N/A',
            row.cabinet_name || 'N/A',
            row.room_name || 'N/A',
            row.current_stock,
            row.cost_price,
            row.selling_price,
            row.stock_value || 0,
            row.is_low_stock ? 'Yes' : 'No',
          ].join(',')
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="stock-report.csv"');
      return res.send(csv);
    }

    return res.json({
      message: 'Stock report fetched successfully',
      report: result.rows,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to generate stock report', error: error.message });
  }
});

app.get('/api/reports/sales', requireAuth, requirePermission('billing:read'), async (req, res) => {
  const { format = 'json', startDate, endDate } = req.query;

  let dateCondition = 'AND b.bill_date IS NOT NULL';
  const params = [];

  if (startDate) {
    params.push(startDate);
    dateCondition += ` AND b.bill_date >= $${params.length}`;
  }
  if (endDate) {
    params.push(endDate);
    dateCondition += ` AND b.bill_date <= $${params.length}`;
  }

  try {
    const query = `
      SELECT
        b.id,
        b.bill_number,
        b.bill_date,
        b.party_type,
        CASE
          WHEN b.party_type = 'CUSTOMER' THEN c.name
          ELSE s.name
        END AS party_name,
        b.subtotal,
        b.tax,
        b.discount,
        b.total,
        b.amount_paid,
        b.amount_due,
        b.status,
        (SELECT STRING_AGG(p.name || ' (x' || bi.quantity || ')', ', ')
         FROM bill_items bi
         JOIN parts p ON bi.part_id = p.id
         WHERE bi.bill_id = b.id) AS items_summary
      FROM bills b
      LEFT JOIN customers c ON b.party_type = 'CUSTOMER' AND b.party_id = c.id
      LEFT JOIN suppliers s ON b.party_type = 'SUPPLIER' AND b.party_id = s.id
      WHERE b.bill_type = 'SALE'
        ${dateCondition}
      ORDER BY b.bill_date DESC
    `;

    const result = await pool.query(query, params);

    if (format === 'csv') {
      const csv = [
        ['Bill Number', 'Date', 'Party Type', 'Party Name', 'Subtotal', 'Tax', 'Discount', 'Total', 'Amount Paid', 'Amount Due', 'Status', 'Items'].join(','),
        ...result.rows.map((row) =>
          [
            row.bill_number,
            row.bill_date,
            row.party_type,
            row.party_name || 'N/A',
            row.subtotal,
            row.tax,
            row.discount,
            row.total,
            row.amount_paid,
            row.amount_due,
            row.status,
            `"${row.items_summary || 'N/A'}"`,
          ].join(',')
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sales-report.csv"');
      return res.send(csv);
    }

    return res.json({
      message: 'Sales report fetched successfully',
      report: result.rows,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to generate sales report', error: error.message });
  }
});

// ============================================================================
// TWILIO VOICE AI WEBHOOK (PHASE 4)
// ============================================================================

app.post('/api/ai/voice/webhook/inbound', async (req, res) => {
  // Twilio webhook handler - processes inbound voice calls
  // In development: accept and simulate; in production: integrate with Twilio SDK
  const { From, To, CallSid } = req.body || {};

  if (!CallSid) {
    return res.status(400).json({ message: 'Missing CallSid from Twilio' });
  }

  try {
    // Log demand entry for incoming call
    await pool.query(
      `
        INSERT INTO demand_logs (source, query_text, caller_phone, fulfilled)
        VALUES ('VOICE_CALL', $1, $2, FALSE)
      `,
      [`Inbound voice call: ${From || 'Unknown'}`, From || 'Unknown']
    );

    // Return TwiML response
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say>Hello! Welcome to SIBMS Voice Agent. Please describe what auto part you need.</Say>
      <Gather numDigits="1" action="/api/ai/voice/webhook/process" method="POST">
        <Say>Or press 1 to list popular parts.</Say>
      </Gather>
    </Response>`;

    res.setHeader('Content-Type', 'application/xml');
    return res.send(twimlResponse);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to process voice webhook', error: error.message });
  }
});

// ============================================================================
// BARCODE/QR SCANNING SUPPORT ENDPOINT (PHASE 3)
// ============================================================================

app.post('/api/barcode/lookup', requireAuth, requirePermission('inventory:read'), async (req, res) => {
  const { barcode, sku } = req.body || {};
  const searchValue = barcode || sku;

  if (!searchValue) {
    return res.status(400).json({ message: 'barcode or sku is required' });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          p.id,
          p.sku,
          p.name,
          p.description,
          p.cost_price,
          p.selling_price,
          p.reorder_threshold,
          COALESCE(SUM(se.quantity), 0)::INTEGER AS current_stock,
          s.id AS section_id,
          s.name AS section_name,
          c.name AS cabinet_name,
          r.name AS room_name
        FROM parts p
        LEFT JOIN stock_entries se ON p.id = se.part_id
        LEFT JOIN sections s ON p.section_id = s.id
        LEFT JOIN cabinets c ON s.cabinet_id = c.id
        LEFT JOIN rooms r ON c.room_id = r.id
        WHERE p.sku ILIKE $1 OR p.name ILIKE $1
        GROUP BY p.id, p.sku, p.name, p.description, p.cost_price, p.selling_price, p.reorder_threshold, s.id, s.name, c.id, c.name, r.id, r.name
        LIMIT 1
      `,
      [`%${searchValue}%`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found for barcode/SKU', code: 'PRODUCT_NOT_FOUND' });
    }

    const part = result.rows[0];
    return res.json({
      message: 'Product found via barcode/SKU lookup',
      product: {
        id: part.id,
        sku: part.sku,
        name: part.name,
        description: part.description,
        cost_price: part.cost_price,
        selling_price: part.selling_price,
        current_stock: part.current_stock,
        location: {
          room: part.room_name || 'Unknown',
          cabinet: part.cabinet_name || 'Unknown',
          section: part.section_name || 'Unknown',
        },
        low_stock: part.current_stock <= part.reorder_threshold,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to process barcode lookup', error: error.message });
  }
});

async function startServer() {
  try {
    await initializeSchema();
    startNotificationWorker();
    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize database schema:', error.message);
    process.exit(1);
  }
}

startServer();

process.on('SIGINT', async () => {
  stopNotificationWorker();
  await pool.end();
  process.exit(0);
});
