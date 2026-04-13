import { prisma } from "./prisma.js";

type ActivityInput = {
  employeeId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
};

export function logActivity(input: ActivityInput) {
  return prisma.activityLog.create({
    data: {
      employeeId: input.employeeId ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata as object | undefined
    }
  });
}
