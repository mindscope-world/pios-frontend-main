import { z } from "zod";
import { REAL_BROKER_TYPES } from "../api/types";

// Mirrors app/schemas/all_schemas.py BrokerCreate + the is_paper constraint
// enforced in app/services/broker_service.py:create_broker (422
// UnsupportedBrokerError if is_paper=false for a non-ALPACA/BINANCE/CCXT
// type). The UI should disable the live-trading toggle client-side per
// REAL_BROKER_TYPES (api/types.ts) so a user can never construct a payload
// that would 422 — this schema-level refinement is defense in depth for
// that same rule, not the primary guard.
export const brokerTypeValues = ["MT5", "IBKR", "ALPACA", "OANDA", "CCXT", "LMAX", "CUSTOM", "BINANCE"] as const;

export const brokerFormSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    broker_type: z.enum(brokerTypeValues),
    exchange_id: z.string().optional(),
    is_paper: z.boolean().default(true),
    credentials: z.object({
      api_key: z.string().optional(),
      api_secret: z.string().optional(),
      account_id: z.string().optional(),
      passphrase: z.string().optional(),
      host: z.string().optional(),
      port: z.coerce.number().optional(),
      client_id: z.coerce.number().optional(),
    }),
  })
  .superRefine((data, ctx) => {
    if (!data.is_paper && !REAL_BROKER_TYPES.has(data.broker_type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["is_paper"],
        message: `${data.broker_type} has no real adapter yet — enable "simulated fills" to continue`,
      });
    }
  });

export type BrokerFormValues = z.infer<typeof brokerFormSchema>;
