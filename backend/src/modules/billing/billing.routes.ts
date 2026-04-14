import {
  BillStatus,
  BillType,
  PaymentMode,
  Prisma,
  ReferenceType,
  StockAction
} from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { logActivity } from "../../lib/activity.js";
import { ApiError, asyncHandler } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireRoles } from "../../middleware/auth.js";

const router = Router();

const billSchema = z.object({
  billType: z.nativeEnum(BillType),
  customerId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  billDate: z.string(),
  dueDate: z.string().optional(),
  discount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative().optional(),
        discountPct: z.number().min(0).max(100).default(0),
        taxPct: z.number().min(0).max(100).default(0)
      })
    )
    .min(1)
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  paymentMode: z.nativeEnum(PaymentMode),
  referenceNo: z.string().optional(),
  paymentDate: z.string(),
  notes: z.string().optional()
});

const shareSchema = z.object({
  channels: z.array(z.enum(["WHATSAPP", "EMAIL"])).min(1),
  recipient: z.string().min(3)
});

const customerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  creditLimit: z.number().nonnegative().default(0)
});

const supplierSchema = z.object({
  name: z.string().min(2),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  gstin: z.string().optional()
});

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function billPrefix(billType: BillType) {
  switch (billType) {
    case BillType.PURCHASE:
      return "PUR";
    case BillType.RETURN:
      return "RET";
    case BillType.CREDIT_NOTE:
      return "CRN";
    default:
      return "SALE";
  }
}

async function generateBillNumber(billType: BillType) {
  const prefix = billPrefix(billType);
  const year = new Date().getFullYear();
  const count = await prisma.bill.count({
    where: {
      billType
    }
  });

  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}

function resolveBillStatus(totalAmount: number, paidAmount: number, dueDate?: Date | null) {
  if (paidAmount >= totalAmount) {
    return BillStatus.PAID;
  }

  if (paidAmount > 0) {
    return BillStatus.PARTIAL;
  }

  if (dueDate && dueDate < new Date()) {
    return BillStatus.OVERDUE;
  }

  return BillStatus.CONFIRMED;
}

function routeId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function createDefaultReminders(
  billId: string,
  dueDate: Date,
  totalAmount: number,
  partyName: string
) {
  const schedules = [
    {
      channel: "WHATSAPP",
      date: new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000),
      message: `Reminder: payment of Rs ${totalAmount.toFixed(2)} for ${partyName} is due in 3 days.`
    },
    {
      channel: "EMAIL",
      date: new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000),
      message: `Advance reminder: bill payment for ${partyName} is due shortly.`
    },
    {
      channel: "SMS",
      date: dueDate,
      message: `Payment due today for ${partyName}. Amount pending: Rs ${totalAmount.toFixed(2)}.`
    },
    {
      channel: "WHATSAPP",
      date: dueDate,
      message: `Payment is due today for ${partyName}. Please clear the outstanding amount.`
    },
    {
      channel: "SMS",
      date: new Date(dueDate.getTime() + 1 * 24 * 60 * 60 * 1000),
      message: `Overdue notice: payment remains pending for ${partyName}.`
    },
    {
      channel: "EMAIL",
      date: new Date(dueDate.getTime() + 1 * 24 * 60 * 60 * 1000),
      message: `Overdue notice: please review the outstanding balance for ${partyName}.`
    },
    {
      channel: "WHATSAPP",
      date: new Date(dueDate.getTime() + 7 * 24 * 60 * 60 * 1000),
      message: `Final overdue notice for ${partyName}. Please contact the business team.`
    },
    {
      channel: "EMAIL",
      date: new Date(dueDate.getTime() + 7 * 24 * 60 * 60 * 1000),
      message: `Final overdue notice for ${partyName}.`
    }
  ] as const;

  await prisma.paymentReminder.createMany({
    data: schedules.map((schedule) => ({
      billId,
      channel: schedule.channel,
      scheduledAt: schedule.date,
      messageBody: schedule.message
    }))
  });
}

router.use(requireAuth);

router.get(
  "/bills",
  requireRoles("Admin", "Manager", "Billing"),
  asyncHandler(async (req, res) => {
    const bills = await prisma.bill.findMany({
      where: {
        billType:
          typeof req.query.billType === "string"
            ? (req.query.billType as BillType)
            : undefined,
        status:
          typeof req.query.status === "string"
            ? (req.query.status as BillStatus)
            : undefined
      },
      include: {
        customer: true,
        supplier: true,
        createdBy: true,
        billPayments: true
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(req.query.limit ?? 50), 100)
    });

    res.json({
      success: true,
      bills
    });
  })
);

router.post(
  "/bills",
  requireRoles("Admin", "Manager", "Billing"),
  asyncHandler(async (req, res) => {
    const payload = billSchema.parse(req.body);

    if (payload.billType === BillType.SALES && !payload.customerId) {
      throw new ApiError(400, "customerId is required for sales bills");
    }

    if (payload.billType === BillType.PURCHASE && !payload.supplierId) {
      throw new ApiError(400, "supplierId is required for purchase bills");
    }

    const productIds = payload.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds }
      }
    });

    if (products.length !== productIds.length) {
      throw new ApiError(400, "One or more bill items reference invalid products");
    }

    const productMap = new Map(products.map((product) => [product.id, product]));

    const lineItems = payload.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice =
        item.unitPrice ??
        (payload.billType === BillType.PURCHASE
          ? Number(product.costPrice ?? product.sellingPrice)
          : Number(product.sellingPrice));
      const base = item.quantity * unitPrice;
      const discountAmount = base * (item.discountPct / 100);
      const taxable = base - discountAmount;
      const taxAmount = taxable * (item.taxPct / 100);

      return {
        ...item,
        unitPrice,
        lineTotal: roundCurrency(taxable + taxAmount)
      };
    });

    const subtotal = roundCurrency(lineItems.reduce((sum, item) => sum + item.lineTotal, 0));
    const totalAmount = roundCurrency(subtotal - payload.discount + payload.taxAmount);

    const bill = await prisma.bill.create({
      data: {
        billNumber: await generateBillNumber(payload.billType),
        billType: payload.billType,
        status: BillStatus.DRAFT,
        customerId: payload.customerId,
        supplierId: payload.supplierId,
        partyType: payload.billType === BillType.PURCHASE ? "SUPPLIER" : "CUSTOMER",
        billDate: new Date(payload.billDate),
        dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
        subtotal,
        discount: payload.discount,
        taxAmount: payload.taxAmount,
        totalAmount,
        notes: payload.notes,
        createdById: req.user?.id,
        billItems: {
          create: lineItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPct: item.discountPct,
            taxPct: item.taxPct,
            lineTotal: item.lineTotal
          }))
        }
      },
      include: {
        billItems: {
          include: { product: true }
        },
        customer: true,
        supplier: true
      }
    });

    await logActivity({
      employeeId: req.user?.id,
      action: "BILL_CREATE",
      entityType: "bill",
      entityId: bill.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: {
        billType: bill.billType,
        totalAmount: Number(bill.totalAmount)
      }
    });

    res.status(201).json({
      success: true,
      bill
    });
  })
);

router.get(
  "/bills/:id",
  requireRoles("Admin", "Manager", "Billing"),
  asyncHandler(async (req, res) => {
    const billId = routeId(req.params.id);

    if (!billId) {
      throw new ApiError(400, "Bill id is required");
    }

    const bill = (await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        customer: true,
        supplier: true,
        createdBy: true,
        billItems: {
          include: {
            product: true,
            stockEntry: {
              include: {
                location: true
              }
            }
          }
        },
        billPayments: true,
        reminders: true
      }
    })) as Prisma.BillGetPayload<{
      include: {
        customer: true;
        supplier: true;
        createdBy: true;
        billItems: { include: { product: true; stockEntry: { include: { location: true } } } };
        billPayments: true;
        reminders: true;
      };
    }> | null;

    if (!bill) {
      throw new ApiError(404, "Bill not found");
    }

    res.json({
      success: true,
      bill
    });
  })
);

router.put(
  "/bills/:id/confirm",
  requireRoles("Admin", "Manager", "Billing"),
  asyncHandler(async (req, res) => {
    const billId = routeId(req.params.id);

    if (!billId) {
      throw new ApiError(400, "Bill id is required");
    }

    const confirmedBill = await prisma.$transaction(async (transaction) => {
      const bill = (await transaction.bill.findUnique({
        where: { id: billId },
        include: {
          customer: true,
          supplier: true,
          billItems: {
            include: {
              product: true
            }
          }
        }
      })) as Prisma.BillGetPayload<{
        include: {
          customer: true;
          supplier: true;
          billItems: { include: { product: true } };
        };
      }> | null;

      if (!bill) {
        throw new ApiError(404, "Bill not found");
      }

      if (bill.status !== BillStatus.DRAFT) {
        throw new ApiError(400, "Only draft bills can be confirmed");
      }

      if (bill.billType === BillType.SALES) {
        for (const item of bill.billItems) {
          let remaining = item.quantity;
          const stockEntries = await transaction.stockEntry.findMany({
            where: {
              productId: item.productId,
              quantity: { gt: 0 }
            },
            orderBy: [{ receivedDate: "asc" }, { createdAt: "asc" }]
          });

          const totalAvailable = stockEntries.reduce((sum, entry) => sum + entry.quantity, 0);

          if (totalAvailable < item.quantity) {
            throw new ApiError(
              400,
              `Insufficient stock for ${item.product.name}. Required ${item.quantity}, available ${totalAvailable}`
            );
          }

          let primaryStockEntryId: string | null = null;

          for (const stockEntry of stockEntries) {
            if (remaining <= 0) {
              break;
            }

            const quantityToDeduct = Math.min(stockEntry.quantity, remaining);
            const nextBalance = stockEntry.quantity - quantityToDeduct;

            await transaction.stockEntry.update({
              where: { id: stockEntry.id },
              data: {
                quantity: nextBalance
              }
            });

            await transaction.stockLog.create({
              data: {
                stockEntryId: stockEntry.id,
                productId: item.productId,
                action: StockAction.OUT,
                quantityChange: -quantityToDeduct,
                balanceAfter: nextBalance,
                referenceType: ReferenceType.BILL,
                referenceId: bill.id,
                performedById: req.user?.id,
                notes: `Sales bill ${bill.billNumber}`
              }
            });

            primaryStockEntryId ??= stockEntry.id;
            remaining -= quantityToDeduct;
          }

          if (primaryStockEntryId) {
            await transaction.billItem.update({
              where: { id: item.id },
              data: {
                stockEntryId: primaryStockEntryId
              }
            });
          }
        }
      }

      const nextStatus = resolveBillStatus(
        Number(bill.totalAmount),
        Number(bill.paidAmount),
        bill.dueDate
      );

      return transaction.bill.update({
        where: { id: bill.id },
        data: {
          status: nextStatus
        },
        include: {
          customer: true,
          supplier: true,
          billItems: {
            include: {
              product: true
            }
          },
          billPayments: true
        }
      });
    });

    if (
      confirmedBill.dueDate &&
      Number(confirmedBill.totalAmount) > Number(confirmedBill.paidAmount) &&
      (confirmedBill.customer?.name || confirmedBill.supplier?.name)
    ) {
      await createDefaultReminders(
        confirmedBill.id,
        confirmedBill.dueDate,
        Number(confirmedBill.totalAmount) - Number(confirmedBill.paidAmount),
        confirmedBill.customer?.name ?? confirmedBill.supplier?.name ?? "Party"
      );
    }

    await logActivity({
      employeeId: req.user?.id,
      action: "BILL_CONFIRM",
      entityType: "bill",
      entityId: confirmedBill.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: {
        billNumber: confirmedBill.billNumber,
        billType: confirmedBill.billType
      }
    });

    res.json({
      success: true,
      bill: confirmedBill
    });
  })
);

router.put(
  "/bills/:id/cancel",
  requireRoles("Admin", "Manager"),
  asyncHandler(async (req, res) => {
    const billId = routeId(req.params.id);

    if (!billId) {
      throw new ApiError(400, "Bill id is required");
    }

    const body = z.object({ reason: z.string().min(5) }).parse(req.body);

    const cancelledBill = await prisma.$transaction(async (transaction) => {
      const bill = await transaction.bill.findUnique({
        where: { id: billId }
      });

      if (!bill) {
        throw new ApiError(404, "Bill not found");
      }

      if (bill.status === BillStatus.CANCELLED) {
        throw new ApiError(400, "Bill is already cancelled");
      }

      const reversalLogs = await transaction.stockLog.findMany({
        where: {
          referenceId: bill.id,
          referenceType: ReferenceType.BILL,
          action: StockAction.OUT
        }
      });

      for (const reversalLog of reversalLogs) {
        const quantityToRestore = Math.abs(reversalLog.quantityChange);

        await transaction.stockEntry.update({
          where: { id: reversalLog.stockEntryId },
          data: {
            quantity: {
              increment: quantityToRestore
            }
          }
        });

        const restoredEntry = await transaction.stockEntry.findUniqueOrThrow({
          where: { id: reversalLog.stockEntryId }
        });

        await transaction.stockLog.create({
          data: {
            stockEntryId: reversalLog.stockEntryId,
            productId: reversalLog.productId,
            action: StockAction.ADJUST,
            quantityChange: quantityToRestore,
            balanceAfter: restoredEntry.quantity,
            referenceType: ReferenceType.ADJUSTMENT,
            referenceId: bill.id,
            performedById: req.user?.id,
            notes: `Bill cancelled: ${body.reason}`
          }
        });
      }

      return transaction.bill.update({
        where: { id: bill.id },
        data: {
          status: BillStatus.CANCELLED,
          notes: bill.notes ? `${bill.notes}\nCancelled: ${body.reason}` : `Cancelled: ${body.reason}`
        }
      });
    });

    await logActivity({
      employeeId: req.user?.id,
      action: "BILL_CANCEL",
      entityType: "bill",
      entityId: billId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: body
    });

    res.json({
      success: true,
      bill: cancelledBill
    });
  })
);

router.post(
  "/bills/:id/payments",
  requireRoles("Admin", "Manager", "Billing"),
  asyncHandler(async (req, res) => {
    const billId = routeId(req.params.id);

    if (!billId) {
      throw new ApiError(400, "Bill id is required");
    }

    const payload = paymentSchema.parse(req.body);

    const bill = await prisma.bill.findUnique({
      where: { id: billId }
    });

    if (!bill) {
      throw new ApiError(404, "Bill not found");
    }

    const nextPaidAmount = Number(bill.paidAmount) + payload.amount;
    const nextStatus = resolveBillStatus(Number(bill.totalAmount), nextPaidAmount, bill.dueDate);

    const payment = await prisma.billPayment.create({
      data: {
        billId: bill.id,
        amount: payload.amount,
        paymentMode: payload.paymentMode,
        referenceNo: payload.referenceNo,
        paymentDate: new Date(payload.paymentDate),
        receivedById: req.user?.id,
        notes: payload.notes
      }
    });

    const updatedBill = await prisma.bill.update({
      where: { id: bill.id },
      data: {
        paidAmount: nextPaidAmount,
        status: nextStatus
      }
    });

    await logActivity({
      employeeId: req.user?.id,
      action: "BILL_PAYMENT",
      entityType: "bill",
      entityId: bill.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: {
        amount: payload.amount,
        paymentMode: payload.paymentMode
      }
    });

    res.status(201).json({
      success: true,
      payment,
      bill: updatedBill
    });
  })
);

router.get(
  "/bills/:id/pdf",
  requireRoles("Admin", "Manager", "Billing"),
  asyncHandler(async (req, res) => {
    const billId = routeId(req.params.id);

    if (!billId) {
      throw new ApiError(400, "Bill id is required");
    }

    const bill = (await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        billItems: true
      }
    })) as Prisma.BillGetPayload<{
      include: {
        billItems: true;
      };
    }> | null;

    if (!bill) {
      throw new ApiError(404, "Bill not found");
    }

    res.json({
      success: true,
      message: "PDF generation is scaffolded for a later pdfkit integration.",
      bill: {
        id: bill.id,
        billNumber: bill.billNumber,
        billType: bill.billType,
        totalAmount: bill.totalAmount,
        items: bill.billItems.length
      }
    });
  })
);

router.post(
  "/bills/:id/share",
  requireRoles("Admin", "Manager", "Billing"),
  asyncHandler(async (req, res) => {
    const billId = routeId(req.params.id);

    if (!billId) {
      throw new ApiError(400, "Bill id is required");
    }

    const payload = shareSchema.parse(req.body);

    const bill = await prisma.bill.findUnique({
      where: { id: billId }
    });

    if (!bill) {
      throw new ApiError(404, "Bill not found");
    }

    await logActivity({
      employeeId: req.user?.id,
      action: "BILL_SHARE",
      entityType: "bill",
      entityId: bill.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: payload
    });

    res.json({
      success: true,
      message: "Share workflow stubbed. Hook WhatsApp Business API and email provider in the next step.",
      deliveryPlan: payload.channels.map((channel) => ({
        channel,
        recipient: payload.recipient,
        status: "QUEUED"
      }))
    });
  })
);

router.get(
  "/customers",
  requireRoles("Admin", "Manager", "Billing"),
  asyncHandler(async (_req, res) => {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" }
    });

    res.json({
      success: true,
      customers
    });
  })
);

router.post(
  "/customers",
  requireRoles("Admin", "Manager", "Billing"),
  asyncHandler(async (req, res) => {
    const payload = customerSchema.parse(req.body);
    const customer = await prisma.customer.create({
      data: payload
    });

    await logActivity({
      employeeId: req.user?.id,
      action: "CUSTOMER_CREATE",
      entityType: "customer",
      entityId: customer.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: { name: customer.name }
    });

    res.status(201).json({
      success: true,
      customer
    });
  })
);

router.get(
  "/suppliers",
  requireRoles("Admin", "Manager", "Billing", "Warehouse"),
  asyncHandler(async (_req, res) => {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { createdAt: "desc" }
    });

    res.json({
      success: true,
      suppliers
    });
  })
);

router.post(
  "/suppliers",
  requireRoles("Admin", "Manager"),
  asyncHandler(async (req, res) => {
    const payload = supplierSchema.parse(req.body);
    const supplier = await prisma.supplier.create({
      data: payload
    });

    await logActivity({
      employeeId: req.user?.id,
      action: "SUPPLIER_CREATE",
      entityType: "supplier",
      entityId: supplier.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: { name: supplier.name }
    });

    res.status(201).json({
      success: true,
      supplier
    });
  })
);

export { router as billingRouter };
