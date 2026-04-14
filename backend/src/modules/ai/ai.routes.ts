import { DemandSource } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireRoles } from "../../middleware/auth.js";

const router = Router();

function tokenize(query: string) {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
    )
  );
}

router.post(
  "/ai/voice/webhook",
  asyncHandler(async (req, res) => {
    const payload = z
      .object({
        queryText: z.string().optional(),
        query_text: z.string().optional(),
        SpeechResult: z.string().optional(),
        callerPhone: z.string().optional(),
        caller_phone: z.string().optional()
      })
      .parse(req.body);

    const queryText = payload.queryText ?? payload.query_text ?? payload.SpeechResult;
    const callerPhone = payload.callerPhone ?? payload.caller_phone;

    if (!queryText) {
      res.status(400).json({
        success: false,
        message: "No query text supplied"
      });
      return;
    }

    const terms = tokenize(queryText);
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: terms.flatMap((term) => [
          { name: { contains: term, mode: "insensitive" } },
          { sku: { contains: term, mode: "insensitive" } },
          { brand: { contains: term, mode: "insensitive" } },
          {
            vehicles: {
              some: {
                OR: [
                  { make: { contains: term, mode: "insensitive" } },
                  { model: { contains: term, mode: "insensitive" } }
                ]
              }
            }
          }
        ])
      },
      include: {
        vehicles: true,
        stockEntries: {
          where: {
            quantity: { gt: 0 }
          },
          include: {
            location: true
          },
          orderBy: [{ receivedDate: "asc" }, { createdAt: "asc" }]
        }
      },
      take: 10
    });

    const ranked = products
      .map((product) => {
        const haystack = [
          product.name,
          product.sku,
          product.brand ?? "",
          ...product.vehicles.flatMap((vehicle) => [vehicle.make, vehicle.model])
        ]
          .join(" ")
          .toLowerCase();

        const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);

        return {
          product,
          score
        };
      })
      .sort((left, right) => right.score - left.score)
      .filter((entry) => entry.score > 0);

    const bestMatch = ranked[0]?.product;

    if (!bestMatch || bestMatch.stockEntries.length === 0) {
      const demand = await prisma.demandLog.create({
        data: {
          source: DemandSource.VOICE_AI,
          queryText,
          callerPhone
        }
      });

      res.json({
        success: true,
        fulfilled: false,
        message: "No matching stocked item found. Demand has been logged for follow-up.",
        demandLogId: demand.id
      });
      return;
    }

    res.json({
      success: true,
      fulfilled: true,
      product: {
        id: bestMatch.id,
        sku: bestMatch.sku,
        name: bestMatch.name,
        totalStock: bestMatch.stockEntries.reduce((sum, entry) => sum + entry.quantity, 0),
        locations: bestMatch.stockEntries.map((entry) => ({
          stockEntryId: entry.id,
          quantity: entry.quantity,
          room: entry.location.room,
          cabinet: entry.location.cabinet,
          section: entry.location.section
        }))
      },
      message: `Match found for "${queryText}".`
    });
  })
);

router.use(requireAuth);

router.get(
  "/ai/reorder-suggestions",
  requireRoles("Admin", "Manager"),
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        stockEntries: {
          include: {
            supplier: true
          }
        }
      }
    });

    const suggestions = products
      .map((product) => {
        const currentQty = product.stockEntries.reduce((sum, entry) => sum + entry.quantity, 0);
        if (currentQty >= product.reorderLevel) {
          return null;
        }

        const preferredSupplier = product.stockEntries.find((entry) => entry.supplier)?.supplier?.name;

        return {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          currentQty,
          reorderLevel: product.reorderLevel,
          suggestedOrderQty: Math.max(product.reorderLevel * 2 - currentQty, product.reorderLevel),
          preferredSupplier: preferredSupplier ?? null
        };
      })
      .filter(Boolean);

    res.json({
      success: true,
      suggestions
    });
  })
);

export { router as aiRouter };
