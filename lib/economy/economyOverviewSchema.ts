import { z } from "zod";

/**
 * Zod contract for `GET /api/economy/dashboard` (hypatia-backend).
 * Sections may be success payloads or per-series error objects from FRED.
 */

/**
 * FRED often encodes missing points as `"."` / `".."`, or numeric strings.
 * Invalid values become NaN and are stripped at the section level so one bad row
 * doesn’t fail the whole section.
 */
const economyObservationValueSchema = z
  .union([z.number(), z.string()])
  .transform((raw) => {
    if (typeof raw === "number") {
      return Number.isFinite(raw) ? raw : Number.NaN;
    }
    const t = raw.trim();
    if (t === "" || t === "." || t === "..") {
      return Number.NaN;
    }
    const n = Number(t);
    return Number.isFinite(n) ? n : Number.NaN;
  });

const economyObservationSchema = z.object({
  date: z.string(),
  value: economyObservationValueSchema,
  yoyInflation: z.union([z.number(), z.null()]).optional(),
});

const economySectionSuccessSchema = z.object({
  label: z.string().optional().default(""),
  series_id: z.string().optional().default(""),
  unit: z.string().optional().default(""),
  yoyInflation: z.number().optional(),
  observations: z
    .array(economyObservationSchema)
    .transform((rows) => rows.filter((r) => Number.isFinite(r.value))),
});

const economySectionErrorSchema = z.object({
  error: z.string(),
  hint: z.string().optional(),
});

/**
 * One bad section must not invalidate the entire overview (otherwise every tile loses charts).
 */
export const economySectionSchema = z
  .union([economySectionSuccessSchema, economySectionErrorSchema])
  .catch({
    error: "Unrecognized economy section",
    hint: undefined as string | undefined,
  });

export const economyOverviewResponseSchema = z.object({
  as_of: z.string(),
  sections: z.record(z.string(), economySectionSchema),
});

export type EconomyOverviewValidated = z.infer<
  typeof economyOverviewResponseSchema
>;
