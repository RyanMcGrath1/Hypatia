import { z } from 'zod';

/**
 * Zod contract for `GET /api/economy/overview` (hypatia-backend).
 * Sections may be success payloads or per-series error objects from FRED.
 */

const economyObservationSchema = z.object({
  date: z.string(),
  value: z.number(),
});

const economySectionSuccessSchema = z.object({
  label: z.string(),
  series_id: z.string(),
  unit: z.string(),
  observations: z.array(economyObservationSchema),
});

const economySectionErrorSchema = z.object({
  error: z.string(),
  hint: z.string().optional(),
});

const economySectionSchema = z.union([
  economySectionSuccessSchema,
  economySectionErrorSchema,
]);

export const economyOverviewResponseSchema = z.object({
  as_of: z.string(),
  sections: z.record(z.string(), economySectionSchema),
});

export type EconomyOverviewValidated = z.infer<typeof economyOverviewResponseSchema>;
