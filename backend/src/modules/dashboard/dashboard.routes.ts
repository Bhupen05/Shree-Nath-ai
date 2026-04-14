import { BillStatus, BillType } from "@prisma/client";
import { Router } from "express";
import { asyncHandler } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

function sumStock(entries: Array<{ quantity: number }>) {
  return entries.reduce((sum, entry) => sum + entry.quantity, 0);
}

router.use(requireAuth);

router.get(
  "/dashboard/kpis",
  asyncHandler(async (_req, res) => {
    const [stockEntries, pendingBills, salesBills, products, activityLogs] = await Promise.all([
      prisma.stockEntry.findMany({
        include: {
          product: true
        }
      }),
      prisma.bill.findMany({
        where: {
          status: {
            in: [BillStatus.PARTIAL, BillStatus.OVERDUE]
          }
        }
      }),
      prisma.bill.findMany({
        where: {
          billType: BillType.SALES,
          billDate: {
            gte: new Date(new Date().toDateString())
          }
        }
      }),
      prisma.product.findMany({
        where: { isActive: true },
        include: {
          stockEntries: true
        }
      }),
      prisma.activityLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          employee: true
        }
      })
    ]);

    const stockValue = stockEntries.reduce((sum, entry) => {
      const cost = entry.costPrice ? Number(entry.costPrice) : Number(entry.product.costPrice ?? 0);
      return sum + entry.quantity * cost;
    }, 0);

    const pendingBillsValue = pendingBills.reduce((sum, bill) => {
      return sum + (Number(bill.totalAmount) - Number(bill.paidAmount));
    }, 0);

    const todaysSales = salesBills.reduce((sum, bill) => {
      return sum + Number(bill.totalAmount);
    }, 0);

    const lowStockProducts = products.filter((product) => {
      const currentQty = sumStock(product.stockEntries);
      return currentQty < product.reorderLevel;
    });

    res.json({
      success: true,
      kpis: {
        totalStockValue: Number(stockValue.toFixed(2)),
        pendingBillsValue: Number(pendingBillsValue.toFixed(2)),
        lowStockCount: lowStockProducts.length,
        todaysSales: Number(todaysSales.toFixed(2))
      },
      recentActivity: activityLogs.map((log) => ({
        id: log.id,
        createdAt: log.createdAt,
        action: log.action,
        employeeName: log.employee?.fullName ?? "System",
        metadata: log.metadata
      }))
    });
  })
);

router.get(
  "/dashboard/low-stock",
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: {
        isActive: true
      },
      include: {
        stockEntries: {
          include: {
            location: true
          }
        }
      }
    });

    const lowStock = products
      .map((product) => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        reorderLevel: product.reorderLevel,
        currentQty: sumStock(product.stockEntries),
        stockEntries: product.stockEntries
      }))
      .filter((product) => product.currentQty < product.reorderLevel)
      .sort((left, right) => left.currentQty - right.currentQty);

    res.json({
      success: true,
      products: lowStock
    });
  })
);

router.get(
  "/dashboard/top-products",
  asyncHandler(async (_req, res) => {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 30);

    const billItems = await prisma.billItem.findMany({
      where: {
        bill: {
          billType: BillType.SALES,
          billDate: {
            gte: windowStart
          }
        }
      },
      include: {
        product: true
      }
    });

    const map = new Map<
      string,
      { productId: string; name: string; sku: string; quantity: number; revenue: number }
    >();

    for (const item of billItems) {
      const existing = map.get(item.productId) ?? {
        productId: item.productId,
        name: item.product.name,
        sku: item.product.sku,
        quantity: 0,
        revenue: 0
      };

      existing.quantity += item.quantity;
      existing.revenue += Number(item.lineTotal);
      map.set(item.productId, existing);
    }

    const topProducts = Array.from(map.values())
      .sort((left, right) => right.quantity - left.quantity)
      .slice(0, 10);

    res.json({
      success: true,
      products: topProducts
    });
  })
);

export { router as dashboardRouter };
