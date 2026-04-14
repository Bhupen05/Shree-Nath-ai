import { Prisma, ReferenceType, StockAction } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { logActivity } from "../../lib/activity.js";
import { ApiError, asyncHandler } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireRoles } from "../../middleware/auth.js";

const router = Router();

const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  yearFrom: z.number().int().optional(),
  yearTo: z.number().int().optional(),
  notes: z.string().optional()
});

const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  unit: z.string().default("pcs"),
  sellingPrice: z.number().nonnegative(),
  costPrice: z.number().nonnegative().optional(),
  reorderLevel: z.number().int().min(0).default(5),
  barcode: z.string().optional(),
  imageUrl: z.string().url().optional(),
  vehicles: z.array(vehicleSchema).optional()
});

const bulkStockSchema = z.object({
  supplierId: z.string().uuid().optional(),
  billReference: z.string().optional(),
  billDocUrl: z.string().url().optional(),
  receivedDate: z.string(),
  notes: z.string().optional(),
  entries: z
    .array(
      z.object({
        productId: z.string().uuid(),
        locationId: z.string().uuid(),
        quantity: z.number().int().positive(),
        costPrice: z.number().nonnegative().optional(),
        batchNumber: z.string().optional(),
        expiryDate: z.string().optional(),
        notes: z.string().optional()
      })
    )
    .min(1)
});

const stockUpdateSchema = z.object({
  locationId: z.string().uuid().optional(),
  quantity: z.number().int().min(0).optional(),
  notes: z.string().optional()
});

const locationSchema = z.object({
  room: z.string().min(1),
  cabinet: z.string().min(1),
  section: z.string().min(1),
  description: z.string().optional()
});

function routeId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

router.use(requireAuth);

router.get(
  "/products/search",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? "").trim();

    if (!q) {
      res.json({ success: true, products: [] });
      return;
    }

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { barcode: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
          {
            vehicles: {
              some: {
                OR: [
                  { make: { contains: q, mode: "insensitive" } },
                  { model: { contains: q, mode: "insensitive" } }
                ]
              }
            }
          }
        ]
      },
      include: {
        vehicles: true,
        stockEntries: {
          include: {
            location: true
          }
        }
      },
      take: 25
    });

    res.json({
      success: true,
      products: products.map((product) => ({
        ...product,
        totalStock: product.stockEntries.reduce((sum, entry) => sum + entry.quantity, 0)
      }))
    });
  })
);

router.get(
  "/products",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 25), 100);
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const brand = typeof req.query.brand === "string" ? req.query.brand : undefined;

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        category: category ? { equals: category } : undefined,
        brand: brand ? { equals: brand } : undefined
      },
      include: {
        vehicles: true,
        stockEntries: true
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
    });

    res.json({
      success: true,
      nextCursor: products.length === limit ? products[products.length - 1]?.id : null,
      products: products.map((product) => ({
        ...product,
        totalStock: product.stockEntries.reduce((sum, entry) => sum + entry.quantity, 0)
      }))
    });
  })
);

router.post(
  "/products",
  requireRoles("Admin", "Manager"),
  asyncHandler(async (req, res) => {
    const payload = productSchema.parse(req.body);

    const product = await prisma.product.create({
      data: {
        sku: payload.sku,
        name: payload.name,
        description: payload.description,
        category: payload.category,
        brand: payload.brand,
        unit: payload.unit,
        sellingPrice: payload.sellingPrice,
        costPrice: payload.costPrice,
        reorderLevel: payload.reorderLevel,
        barcode: payload.barcode,
        imageUrl: payload.imageUrl,
        vehicles: payload.vehicles
          ? {
              create: payload.vehicles
            }
          : undefined
      },
      include: {
        vehicles: true
      }
    });

    await logActivity({
      employeeId: req.user?.id,
      action: "PRODUCT_CREATE",
      entityType: "product",
      entityId: product.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: { sku: product.sku }
    });

    res.status(201).json({
      success: true,
      product
    });
  })
);

router.get(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const productId = routeId(req.params.id);

    if (!productId) {
      throw new ApiError(400, "Product id is required");
    }

    const product = (await prisma.product.findUnique({
      where: { id: productId },
      include: {
        vehicles: true,
        stockEntries: {
          include: {
            location: true,
            supplier: true
          },
          orderBy: [{ receivedDate: "asc" }, { createdAt: "asc" }]
        }
      }
    })) as Prisma.ProductGetPayload<{
      include: {
        vehicles: true;
        stockEntries: { include: { location: true; supplier: true } };
      };
    }> | null;

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    res.json({
      success: true,
      product: {
        ...product,
        totalStock: product.stockEntries.reduce((sum, entry) => sum + entry.quantity, 0)
      }
    });
  })
);

router.put(
  "/products/:id",
  requireRoles("Admin", "Manager"),
  asyncHandler(async (req, res) => {
    const productId = routeId(req.params.id);

    if (!productId) {
      throw new ApiError(400, "Product id is required");
    }

    const payload = productSchema.partial().parse(req.body);

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    const updated = await prisma.$transaction(async (transaction) => {
      await transaction.product.update({
        where: { id: productId },
        data: {
          sku: payload.sku,
          name: payload.name,
          description: payload.description,
          category: payload.category,
          brand: payload.brand,
          unit: payload.unit,
          sellingPrice: payload.sellingPrice,
          costPrice: payload.costPrice,
          reorderLevel: payload.reorderLevel,
          barcode: payload.barcode,
          imageUrl: payload.imageUrl
        }
      });

      if (payload.vehicles) {
        await transaction.productVehicle.deleteMany({
          where: { productId }
        });

        await transaction.productVehicle.createMany({
          data: payload.vehicles.map((vehicle) => ({
            productId,
            make: vehicle.make,
            model: vehicle.model,
            yearFrom: vehicle.yearFrom,
            yearTo: vehicle.yearTo,
            notes: vehicle.notes
          }))
        });
      }

      return transaction.product.findUniqueOrThrow({
        where: { id: productId },
        include: { vehicles: true }
      });
    });

    await logActivity({
      employeeId: req.user?.id,
      action: "PRODUCT_UPDATE",
      entityType: "product",
      entityId: productId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: payload
    });

    res.json({
      success: true,
      product: updated
    });
  })
);

router.get(
  "/stock",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const stockEntries = await prisma.stockEntry.findMany({
      take: limit,
      orderBy: [{ receivedDate: "desc" }, { createdAt: "desc" }],
      include: {
        product: true,
        location: true,
        supplier: true
      }
    });

    res.json({
      success: true,
      stockEntries
    });
  })
);

router.post(
  "/stock/bulk",
  requireRoles("Admin", "Manager", "Warehouse"),
  asyncHandler(async (req, res) => {
    const payload = bulkStockSchema.parse(req.body);

    const result = await prisma.$transaction(async (transaction) => {
      const createdEntries = [];

      for (const entry of payload.entries) {
        const createdEntry = await transaction.stockEntry.create({
          data: {
            productId: entry.productId,
            locationId: entry.locationId,
            supplierId: payload.supplierId,
            billReference: payload.billReference,
            batchNumber: entry.batchNumber,
            quantity: entry.quantity,
            costPrice: entry.costPrice,
            receivedDate: new Date(payload.receivedDate),
            expiryDate: entry.expiryDate ? new Date(entry.expiryDate) : undefined,
            addedById: req.user?.id,
            billDocUrl: payload.billDocUrl,
            notes: entry.notes ?? payload.notes
          }
        });

        await transaction.stockLog.create({
          data: {
            stockEntryId: createdEntry.id,
            productId: entry.productId,
            action: StockAction.IN,
            quantityChange: entry.quantity,
            balanceAfter: createdEntry.quantity,
            referenceType: ReferenceType.MANUAL,
            performedById: req.user?.id,
            notes: `Bulk stock intake${payload.billReference ? ` (${payload.billReference})` : ""}`
          }
        });

        createdEntries.push(createdEntry);
      }

      const activity = await transaction.activityLog.create({
        data: {
          employeeId: req.user?.id,
          action: "STOCK_IN",
          entityType: "stock_entry",
          entityId: createdEntries[0]?.id ?? null,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          metadata: {
            count: createdEntries.length,
            supplierId: payload.supplierId,
            billReference: payload.billReference
          }
        }
      });

      return {
        createdEntries,
        activity
      };
    });

    res.status(201).json({
      success: true,
      stockEntries: result.createdEntries,
      activityLogId: result.activity.id
    });
  })
);

router.get(
  "/stock/:id",
  asyncHandler(async (req, res) => {
    const stockEntryId = routeId(req.params.id);

    if (!stockEntryId) {
      throw new ApiError(400, "Stock entry id is required");
    }

    const stockEntry = await prisma.stockEntry.findUnique({
      where: { id: stockEntryId },
      include: {
        product: true,
        location: true,
        supplier: true
      }
    });

    if (!stockEntry) {
      throw new ApiError(404, "Stock entry not found");
    }

    res.json({
      success: true,
      stockEntry
    });
  })
);

router.put(
  "/stock/:id",
  requireRoles("Admin", "Manager"),
  asyncHandler(async (req, res) => {
    const stockEntryId = routeId(req.params.id);

    if (!stockEntryId) {
      throw new ApiError(400, "Stock entry id is required");
    }

    const payload = stockUpdateSchema.parse(req.body);

    const existing = await prisma.stockEntry.findUnique({
      where: { id: stockEntryId }
    });

    if (!existing) {
      throw new ApiError(404, "Stock entry not found");
    }

    const updated = await prisma.stockEntry.update({
      where: { id: stockEntryId },
      data: {
        locationId: payload.locationId,
        quantity: payload.quantity,
        notes: payload.notes
      },
      include: {
        product: true,
        location: true
      }
    });

    if (typeof payload.quantity === "number" && payload.quantity !== existing.quantity) {
      await prisma.stockLog.create({
        data: {
          stockEntryId: existing.id,
          productId: existing.productId,
          action: StockAction.ADJUST,
          quantityChange: payload.quantity - existing.quantity,
          balanceAfter: payload.quantity,
          referenceType: ReferenceType.ADJUSTMENT,
          performedById: req.user?.id,
          notes: payload.notes ?? "Manual quantity correction"
        }
      });
    }

    if (payload.locationId && payload.locationId !== existing.locationId) {
      await prisma.stockLog.create({
        data: {
          stockEntryId: existing.id,
          productId: existing.productId,
          action: StockAction.TRANSFER,
          quantityChange: 0,
          balanceAfter: updated.quantity,
          referenceType: ReferenceType.ADJUSTMENT,
          performedById: req.user?.id,
          notes: payload.notes ?? "Location reassigned"
        }
      });
    }

    await logActivity({
      employeeId: req.user?.id,
      action: "STOCK_UPDATE",
      entityType: "stock_entry",
      entityId: existing.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: payload
    });

    res.json({
      success: true,
      stockEntry: updated
    });
  })
);

router.get(
  "/locations",
  asyncHandler(async (_req, res) => {
    const locations = await prisma.location.findMany({
      orderBy: [{ room: "asc" }, { cabinet: "asc" }, { section: "asc" }]
    });

    res.json({
      success: true,
      locations
    });
  })
);

router.post(
  "/locations",
  requireRoles("Admin", "Manager"),
  asyncHandler(async (req, res) => {
    const payload = locationSchema.parse(req.body);

    const location = await prisma.location.create({
      data: payload
    });

    await logActivity({
      employeeId: req.user?.id,
      action: "LOCATION_CREATE",
      entityType: "location",
      entityId: location.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: payload
    });

    res.status(201).json({
      success: true,
      location
    });
  })
);

export { router as inventoryRouter };
