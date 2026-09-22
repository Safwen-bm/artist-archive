import { z } from "zod";

export const EXPERIENCE_TYPES = [
  "residency",
  "solo_exhibition",
  "group_exhibition",
  "collaboration",
  "award",
  "publication",
  "teaching",
  "other",
] as const;

export type ExperienceType = (typeof EXPERIENCE_TYPES)[number];

export const TYPE_LABELS: Record<ExperienceType, string> = {
  residency: "Residency",
  solo_exhibition: "Solo exhibition",
  group_exhibition: "Group exhibition",
  collaboration: "Collaboration",
  award: "Award",
  publication: "Publication",
  teaching: "Teaching",
  other: "Other",
};

export const ImageSchema = z.object({
  url: z.string().url(),
  alt: z.string(),
  credit: z.string(),
  creditUrl: z.string().url(),
  source: z.literal("pexels"),
});

/** What the AI returns for one CV line. Validated before anything is saved. */
export const ExtractedSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  type: z.enum(EXPERIENCE_TYPES),
  title: z.string().min(1),
  institution: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  description: z.string().min(1),
  tags: z.array(z.string()),
  imageQuery: z.string().min(1),
  /** The original CV line, copied verbatim, so every record can be traced back. */
  sourceText: z.string().min(1),
  /** Fields the AI filled in without them being written in the CV. */
  inferredFields: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
});

/** What the website consumes: extraction plus fields added by plain code. */
export const ExperienceSchema = ExtractedSchema.extend({
  id: z.string(),
  images: z.array(ImageSchema),
  needsReview: z.boolean(),
});

export const DatasetSchema = z.object({
  meta: z.object({
    generatedAt: z.string(),
    model: z.string(),
    sourceFile: z.string(),
    imageSource: z.string(),
  }),
  experiences: z.array(ExperienceSchema),
});

export type Extracted = z.infer<typeof ExtractedSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;
