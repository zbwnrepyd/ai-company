import { z } from "zod";

export const trustMrrRevenueSchema = z.object({
  total: z.number(),
  last30Days: z.number().nullable().optional(),
});

export const trustMrrStartupListItemSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().url().nullable().optional(),
  rank: z.number().int().nullable().optional(),
  growth30d: z.number().nullable().optional(),
  revenue: trustMrrRevenueSchema,
});

export const trustMrrStartupListResponseSchema = z.object({
  items: z.array(trustMrrStartupListItemSchema),
  nextPage: z.number().int().nullable().optional(),
});

export const trustMrrStartupDetailSchema = z.object({
  slug: z.string().min(1),
  description: z.string().nullable().optional(),
  targetAudience: z.string().nullable().optional(),
  onSale: z.boolean().nullable().optional(),
  askingPrice: z.union([z.number(), z.string()]).nullable().optional(),
  techStack: z.array(z.string()).nullable().optional(),
});

export type TrustMrrStartupListItem = z.infer<typeof trustMrrStartupListItemSchema>;
export type TrustMrrStartupListResponse = z.infer<typeof trustMrrStartupListResponseSchema>;
export type TrustMrrStartupDetail = z.infer<typeof trustMrrStartupDetailSchema>;
