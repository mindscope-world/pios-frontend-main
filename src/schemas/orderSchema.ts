import { z } from "zod";

// Mirrors app/schemas/all_schemas.py OrderCreate. IMPORTANT: unlike the
// comment on OrderCreate.price ("required for LIMIT / STOP_LIMIT"), there is
// NO server-side enforcement of this anywhere (checked the schema, the
// /orders endpoint, and order_service.submit_order directly) — the backend
// will silently accept a LIMIT order with price=null and instant-fill it.
// This client-side refinement is therefore the ONLY safety net preventing a
// nonsensical order, not a UX nicety to dodge a round-trip 422.
export const orderTypeValues = [
  "MARKET",
  "LIMIT",
  "STOP",
  "STOP_LIMIT",
  "OCO",
  "TWAP",
  "VWAP",
  "ICEBERG",
] as const;

const PRICE_REQUIRED_ORDER_TYPES = new Set(["LIMIT", "STOP_LIMIT"]);

export const orderFormSchema = z
  .object({
    broker_id: z.string().min(1, "Select a broker"),
    symbol: z.string().min(1, "Select a symbol"),
    side: z.enum(["BUY", "SELL"]),
    order_type: z.enum(orderTypeValues),
    qty: z.coerce.number().positive("Quantity must be greater than 0"),
    price: z.coerce.number().positive("Price must be greater than 0").optional(),
    stop_price: z.coerce.number().positive().optional(),
    time_in_force: z.string().default("GTC"),
    strategy_id: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (PRICE_REQUIRED_ORDER_TYPES.has(data.order_type) && !data.price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: `Price is required for ${data.order_type} orders`,
      });
    }
  });

export type OrderFormValues = z.infer<typeof orderFormSchema>;
