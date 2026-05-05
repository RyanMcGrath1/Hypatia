import { z } from 'zod';

/**
 * Optional pagination envelope fields on `/api/news/top-headlines` JSON objects
 * (alongside `items` / `articles` / etc.).
 */
export const topHeadlinesEnvelopeFieldsSchema = z
  .object({
    hasMore: z.boolean().optional(),
    nextPage: z.union([z.number(), z.null()]).optional(),
  })
  .passthrough();
