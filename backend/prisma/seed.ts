import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultRoles = [
  {
    name: "Admin",
    permissions: {
      dashboard: true,
      products: true,
      stock: true,
      billing: true,
      employees: true,
      reports: true,
      reminders: true,
      ai: true
    }
  },
  {
    name: "Manager",
    permissions: {
      dashboard: true,
      products: true,
      stock: true,
      billing: true,
      employees: false,
      reports: true,
      reminders: true,
      ai: false
    }
  },
  {
    name: "Billing",
    permissions: {
      dashboard: true,
      products: false,
      stock: false,
      billing: true,
      employees: false,
      reports: false,
      reminders: true,
      ai: false
    }
  },
  {
    name: "Warehouse",
    permissions: {
      dashboard: true,
      products: false,
      stock: true,
      billing: false,
      employees: false,
      reports: false,
      reminders: false,
      ai: false
    }
  }
];

async function main() {
  for (const role of defaultRoles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { permissions: role.permissions },
      create: role
    });
  }

  const adminPassword = await bcrypt.hash("Admin@12345", 12);

  const admin = await prisma.employee.upsert({
    where: { empCode: "EMP-0001" },
    update: {},
    create: {
      empCode: "EMP-0001",
      fullName: "System Admin",
      email: "admin@sibms.local",
      phone: "9999999999",
      passwordHash: adminPassword,
      mustChangePassword: true
    }
  });

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: "Admin" }
  });

  await prisma.employeeRole.upsert({
    where: {
      employeeId_roleId: {
        employeeId: admin.id,
        roleId: adminRole.id
      }
    },
    update: {},
    create: {
      employeeId: admin.id,
      roleId: adminRole.id
    }
  });

  console.log("Seed complete.");
  console.log("Admin login: EMP-0001 / Admin@12345");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
