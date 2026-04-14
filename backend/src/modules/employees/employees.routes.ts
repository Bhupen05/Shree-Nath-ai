import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { logActivity } from "../../lib/activity.js";
import { ApiError, asyncHandler } from "../../lib/http.js";
import { hashPassword } from "../../lib/password.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireRoles } from "../../middleware/auth.js";

const router = Router();

const employeeSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10).max(15).optional(),
  email: z.string().email().optional(),
  roleNames: z.array(z.enum(["Admin", "Manager", "Billing", "Warehouse"])).min(1),
  password: z.string().min(8).optional()
});

const updateEmployeeSchema = employeeSchema.partial().extend({
  isActive: z.boolean().optional()
});

function generateTempPassword() {
  return `SIBMS@${Math.floor(100000 + Math.random() * 900000)}`;
}

function routeId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function generateEmployeeCode() {
  const count = await prisma.employee.count();
  return `EMP-${String(count + 1).padStart(4, "0")}`;
}

router.use(requireAuth);

router.get(
  "/employees",
  requireRoles("Admin"),
  asyncHandler(async (_req, res) => {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        employeeRoles: {
          include: {
            role: true
          }
        }
      }
    });

    res.json({
      success: true,
      employees: employees.map((employee) => ({
        id: employee.id,
        empCode: employee.empCode,
        fullName: employee.fullName,
        phone: employee.phone,
        email: employee.email,
        isActive: employee.isActive,
        mustChangePassword: employee.mustChangePassword,
        roles: employee.employeeRoles.map((employeeRole) => employeeRole.role.name),
        createdAt: employee.createdAt
      }))
    });
  })
);

router.post(
  "/employees",
  requireRoles("Admin"),
  asyncHandler(async (req, res) => {
    const payload = employeeSchema.parse(req.body);
    const password = payload.password ?? generateTempPassword();
    const empCode = await generateEmployeeCode();

    const roles = await prisma.role.findMany({
      where: {
        name: {
          in: payload.roleNames
        }
      }
    });

    if (roles.length !== payload.roleNames.length) {
      throw new ApiError(400, "One or more roles are invalid");
    }

    const employee = await prisma.employee.create({
      data: {
        empCode,
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email,
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
        employeeRoles: {
          create: roles.map((role) => ({
            roleId: role.id
          }))
        }
      },
      include: {
        employeeRoles: {
          include: {
            role: true
          }
        }
      }
    });

    await logActivity({
      employeeId: req.user?.id,
      action: "EMPLOYEE_CREATE",
      entityType: "employee",
      entityId: employee.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: { roleNames: payload.roleNames }
    });

    res.status(201).json({
      success: true,
      employee: {
        id: employee.id,
        empCode: employee.empCode,
        fullName: employee.fullName,
        phone: employee.phone,
        email: employee.email,
        roles: employee.employeeRoles.map((employeeRole) => employeeRole.role.name)
      },
      temporaryPassword: password
    });
  })
);

router.put(
  "/employees/:id",
  requireRoles("Admin"),
  asyncHandler(async (req, res) => {
    const employeeId = routeId(req.params.id);

    if (!employeeId) {
      throw new ApiError(400, "Employee id is required");
    }

    const payload = updateEmployeeSchema.parse(req.body);
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      throw new ApiError(404, "Employee not found");
    }

    const updateData = {
      fullName: payload.fullName,
      phone: payload.phone,
      email: payload.email,
      isActive: payload.isActive
    };

    await prisma.$transaction(async (transaction) => {
      await transaction.employee.update({
        where: { id: employeeId },
        data: updateData
      });

      if (payload.password) {
        await transaction.employee.update({
          where: { id: employeeId },
          data: {
            passwordHash: await hashPassword(payload.password),
            mustChangePassword: true
          }
        });
      }

      if (payload.roleNames) {
        const roles = await transaction.role.findMany({
          where: { name: { in: payload.roleNames } }
        });

        await transaction.employeeRole.deleteMany({
          where: { employeeId }
        });

        await transaction.employeeRole.createMany({
          data: roles.map((role) => ({
            employeeId,
            roleId: role.id
          }))
        });
      }
    });

    await logActivity({
      employeeId: req.user?.id,
      action: "EMPLOYEE_UPDATE",
      entityType: "employee",
      entityId: employeeId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: payload
    });

    const updated = (await prisma.employee.findUniqueOrThrow({
      where: { id: employeeId },
      include: {
        employeeRoles: {
          include: {
            role: true
          }
        }
      }
    })) as Prisma.EmployeeGetPayload<{
      include: {
        employeeRoles: { include: { role: true } };
      };
    }>;

    res.json({
      success: true,
      employee: {
        id: updated.id,
        empCode: updated.empCode,
        fullName: updated.fullName,
        phone: updated.phone,
        email: updated.email,
        isActive: updated.isActive,
        roles: updated.employeeRoles.map((employeeRole) => employeeRole.role.name)
      }
    });
  })
);

router.delete(
  "/employees/:id",
  requireRoles("Admin"),
  asyncHandler(async (req, res) => {
    const employeeId = routeId(req.params.id);

    if (!employeeId) {
      throw new ApiError(400, "Employee id is required");
    }

    await prisma.employee.update({
      where: { id: employeeId },
      data: { isActive: false }
    });

    await logActivity({
      employeeId: req.user?.id,
      action: "EMPLOYEE_DEACTIVATE",
      entityType: "employee",
      entityId: employeeId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });

    res.json({
      success: true,
      message: "Employee deactivated"
    });
  })
);

router.get(
  "/activity-logs",
  requireRoles("Admin", "Manager"),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const action = typeof req.query.action === "string" ? req.query.action : undefined;

    const activityLogs = await prisma.activityLog.findMany({
      where: {
        action: action ? { equals: action } : undefined
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        employee: true
      }
    });

    res.json({
      success: true,
      activityLogs: activityLogs.map((activityLog) => ({
        id: activityLog.id,
        createdAt: activityLog.createdAt,
        action: activityLog.action,
        entityType: activityLog.entityType,
        entityId: activityLog.entityId,
        employee: activityLog.employee
          ? {
              id: activityLog.employee.id,
              fullName: activityLog.employee.fullName,
              empCode: activityLog.employee.empCode
            }
          : null,
        metadata: activityLog.metadata
      }))
    });
  })
);

router.get(
  "/demand-logs",
  requireRoles("Admin", "Manager"),
  asyncHandler(async (req, res) => {
    const demandLogs = await prisma.demandLog.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(req.query.limit ?? 50), 100),
      include: {
        product: true
      }
    });

    res.json({
      success: true,
      demandLogs
    });
  })
);

export { router as employeesRouter };
