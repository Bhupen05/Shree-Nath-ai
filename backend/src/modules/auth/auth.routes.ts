import { Router } from "express";
import { z } from "zod";
import { logActivity } from "../../lib/activity.js";
import { ApiError, asyncHandler } from "../../lib/http.js";
import { comparePassword, hashPassword } from "../../lib/password.js";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/tokens.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(8)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8)
});

function serializeEmployee(employee: {
  id: string;
  empCode: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  mustChangePassword: boolean;
  employeeRoles: Array<{ role: { name: string } }>;
}) {
  return {
    id: employee.id,
    empCode: employee.empCode,
    fullName: employee.fullName,
    email: employee.email,
    phone: employee.phone,
    roles: employee.employeeRoles.map((employeeRole) => employeeRole.role.name),
    mustChangePassword: employee.mustChangePassword
  };
}

router.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const { identifier, password } = loginSchema.parse(req.body);

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [{ empCode: identifier }, { email: identifier }],
        isActive: true
      },
      include: {
        employeeRoles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!employee) {
      throw new ApiError(401, "Invalid credentials");
    }

    const isPasswordValid = await comparePassword(password, employee.passwordHash);

    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid credentials");
    }

    const user = {
      id: employee.id,
      empCode: employee.empCode,
      fullName: employee.fullName,
      roles: employee.employeeRoles.map((employeeRole) => employeeRole.role.name)
    };

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.cookie("sibms_refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await logActivity({
      employeeId: employee.id,
      action: "AUTH_LOGIN",
      entityType: "employee",
      entityId: employee.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: { roles: user.roles }
    });

    res.json({
      success: true,
      accessToken,
      employee: serializeEmployee(employee)
    });
  })
);

router.post(
  "/auth/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.clearCookie("sibms_refresh_token");

    await logActivity({
      employeeId: req.user?.id,
      action: "AUTH_LOGOUT",
      entityType: "employee",
      entityId: req.user?.id ?? null,
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });

    res.json({
      success: true,
      message: "Logged out"
    });
  })
);

router.post(
  "/auth/refresh",
  asyncHandler(async (req, res) => {
    const refreshToken =
      req.cookies?.sibms_refresh_token ??
      z.object({ refreshToken: z.string().optional() }).parse(req.body).refreshToken;

    if (!refreshToken) {
      throw new ApiError(401, "Refresh token missing");
    }

    const payload = verifyRefreshToken(refreshToken);

    const employee = await prisma.employee.findUnique({
      where: { id: payload.id },
      include: {
        employeeRoles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!employee || !employee.isActive) {
      throw new ApiError(401, "Employee not found");
    }

    const accessToken = signAccessToken({
      id: employee.id,
      empCode: employee.empCode,
      fullName: employee.fullName,
      roles: employee.employeeRoles.map((employeeRole) => employeeRole.role.name)
    });

    res.json({
      success: true,
      accessToken
    });
  })
);

router.post(
  "/auth/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const employee = await prisma.employee.findUnique({
      where: { id: req.user!.id }
    });

    if (!employee) {
      throw new ApiError(404, "Employee not found");
    }

    const isPasswordValid = await comparePassword(currentPassword, employee.passwordHash);

    if (!isPasswordValid) {
      throw new ApiError(400, "Current password is incorrect");
    }

    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false
      }
    });

    await logActivity({
      employeeId: employee.id,
      action: "PASSWORD_CHANGE",
      entityType: "employee",
      entityId: employee.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });

    res.json({
      success: true,
      message: "Password updated"
    });
  })
);

export { router as authRouter };
