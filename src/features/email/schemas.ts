import { z } from "zod";

export const subscribeMarketingSchema = z.object({
  email: z.string().email("Email inválido"),
});

export type SubscribeMarketingInput = z.infer<typeof subscribeMarketingSchema>;

export const sendMarketingBroadcastSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(120),
  subject: z.string().min(1, "Asunto requerido").max(200),
  htmlBody: z.string().min(1, "Cuerpo HTML requerido"),
  previewText: z.string().max(200).optional(),
  segmentId: z.string().min(1).optional(),
});

export type SendMarketingBroadcastInput = z.infer<
  typeof sendMarketingBroadcastSchema
>;
