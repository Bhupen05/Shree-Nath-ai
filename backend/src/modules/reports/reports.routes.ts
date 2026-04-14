import { BillType } from "@prisma/client";
import { Router } from "express";
import { asyncHandler } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireRoles } from "../../middleware/auth.js";

const router = Router();

function csvEscape(value: unknown) {
  const raw = value == null ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

router.use(requireAuth);

router.get(
  "/reports/stock",
  requireRoles("Admin", "Manager"),
  asyncHandler(async (req, res) => {
    const stockEntries = await prisma.stockEntry.findMany({
      include: {
        product: true,
        location: true,
        supplier: true
      },
      orderBy: [{ receivedDate: "desc" }, { createdAt: "desc" }]
    });

    if (req.query.format === "json") {
      res.json({
        success: true,
        stockEntries
      });
      return;
    }

    const header = [
      "SKU",
      "Product",
      "Quantity",
      "Cost Price",
      "Room",
      "Cabinet",
      "Section",
      "Supplier",
      "Received Date",
      "Bill Reference"
    ];

    const rows = stockEntries.map((entry) => [
      entry.product.sku,
      entry.product.name,
      entry.quantity,
      entry.costPrice ?? "",
      entry.location.room,
      entry.location.cabinet,
      entry.location.section,
      entry.supplier?.name ?? "",
      formatDate(entry.receivedDate),
      entry.billReference ?? ""
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => csvEscape(cell)).join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="stock-report.csv"');
    res.send(csv);
  })
);

router.get(
  "/reports/sales",
  requireRoles("Admin", "Manager"),
  asyncHandler(async (req, res) => {
    const dateFrom = typeof req.query.dateFrom === "string" ? new Date(req.query.dateFrom) : undefined;
    const dateTo = typeof req.query.dateTo === "string" ? new Date(req.query.dateTo) : undefined;

    const bills = await prisma.bill.findMany({
      where: {
        billType: BillType.SALES,
        billDate: {
          gte: dateFrom,
          lte: dateTo
        }
      },
      include: {
        customer: true,
        billItems: {
          include: {
            product: true
          }
        }
      },
      orderBy: { billDate: "desc" }
    });

    const summary = {
      totalBills: bills.length,
      grossSales: bills.reduce((sum, bill) => sum + Number(bill.totalAmount), 0),
      totalCollected: bills.reduce((sum, bill) => sum + Number(bill.paidAmount), 0),
      overdueBills: bills.filter((bill) => bill.status === "OVERDUE").length
    };

    res.json({
      success: true,
      summary,
      bills
    });
  })
);

export { router as reportsRouter };
