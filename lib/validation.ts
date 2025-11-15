import { z } from "zod";

const dateString = z.string().refine(
  (value) => !Number.isNaN(Date.parse(value)),
  "Invalid ISO date string"
);

const optionalString = (max = 500) =>
  z
    .preprocess(
      (value) => (value === null || value === undefined ? undefined : value),
      z
        .string()
        .trim()
        .max(max)
        .optional()
    );

const booleanLike = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return value;
}, z.boolean().optional());

const numberLike = (options?: { min?: number }) =>
  z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value);
    return value;
  }, z.number().finite().refine((val) => (options?.min !== undefined ? val >= options.min : true)));

const integerLike = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().int().min(0).optional());

const tripStatusSchema = z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "LOCKED"]);

export const tripGuideInputSchema = z.object({
  guideId: z.string().trim().min(1, "guideId is required"),
});

export const paymentInputSchema = z
  .object({
    cashReceived: numberLike({ min: 0 }).default(0),
    creditCards: numberLike({ min: 0 }).default(0),
    onlineEFTs: numberLike({ min: 0 }).default(0),
    vouchers: numberLike({ min: 0 }).default(0),
    members: numberLike({ min: 0 }).default(0),
    agentsToInvoice: numberLike({ min: 0 }).default(0),
    waterPhoneSunblock: numberLike({ min: 0 }).default(0),
    discountsTotal: numberLike({ min: 0 }).default(0),
  });

export const discountInputSchema = z.object({
  amount: numberLike({ min: 0 }),
  reason: z.string().trim().min(1).max(200),
});

export const tripCreateSchema = z.object({
  tripDate: dateString,
  leadName: z.string().trim().min(1).max(120),
  paxGuideNote: optionalString(1000),
  totalPax: integerLike.default(0),
  tripLeaderId: z.string().trim().min(1).optional(),
  paymentsMadeYN: booleanLike.default(false),
  picsUploadedYN: booleanLike.default(false),
  tripEmailSentYN: booleanLike.default(false),
  tripReport: optionalString(2000),
  suggestions: optionalString(2000),
  status: tripStatusSchema.optional(),
  guides: z.array(tripGuideInputSchema).default([]),
  payments: paymentInputSchema.optional(),
  discounts: z.array(discountInputSchema).default([]),
});

export const guideCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  rank: z.enum(["SENIOR", "INTERMEDIATE", "JUNIOR", "TRAINEE"]),
  email: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
      z
        .string()
        .trim()
        .email()
        .toLowerCase()
        .optional()
    ),
});

export const guideInvoiceSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format"),
});
