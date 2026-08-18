import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/http.js';
import { parse } from '../lib/validate.js';
import { requirePermission } from '../middleware/auth.js';
import { getSettings, saveSettings } from '../services/settings.js';
import { auditFromRequest } from '../services/audit.js';

export const settingsRouter = Router();

const settingsSchema = z.object({
  business: z
    .object({
      name: z.string().trim().min(1, 'Business name is required.').max(120),
      logoUrl: z.string().trim().max(600).nullable().optional(),
      phone: z.string().trim().max(40).nullable().optional(),
      email: z.string().trim().max(160).nullable().optional(),
      address: z.string().trim().max(300).nullable().optional(),
      currency: z.string().trim().min(1).max(8),
      currencySymbol: z.string().trim().min(1).max(8),
    })
    .partial()
    .optional(),
  inventory: z
    .object({
      defaultMinStock: z.coerce.number().int().min(0).max(100000),
      skuFormat: z
        .string()
        .trim()
        .min(1, 'SKU format is required.')
        .max(80)
        .refine((value) => value.includes('{SEQ}'), {
          message: 'The SKU format must include {SEQ} so generated codes stay unique.',
        }),
      autoGenerateSku: z.coerce.boolean(),
      autoGenerateBarcode: z.coerce.boolean(),
      valuationMethod: z.enum(['AVERAGE_COST', 'LAST_COST']),
    })
    .partial()
    .optional(),
  notifications: z
    .object({
      lowStockAlerts: z.coerce.boolean(),
      outOfStockAlerts: z.coerce.boolean(),
      pendingPurchaseAlerts: z.coerce.boolean(),
    })
    .partial()
    .optional(),
});

settingsRouter.get(
  '/',
  requirePermission('settings:view'),
  asyncHandler(async (_req, res) => {
    res.json({ data: await getSettings() });
  }),
);

settingsRouter.put(
  '/',
  requirePermission('settings:manage'),
  asyncHandler(async (req, res) => {
    const input = parse(settingsSchema, req.body);
    const before = await getSettings();
    const settings = await saveSettings(input as never);
    await auditFromRequest(req, {
      action: 'settings.updated',
      entity: 'Setting',
      entityId: 'app',
      before,
      after: settings,
    });
    res.json({ data: settings });
  }),
);
