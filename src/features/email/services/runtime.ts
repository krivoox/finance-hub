import "server-only";

import type {
  MarketingBroadcastInput,
  MarketingSubscribeInput,
} from "@/features/email/domain";
import { env, isResendEnabled } from "@/lib/env";
import { getResendClient } from "@/lib/resend";

import { createConsoleGateway } from "./console-gateway";
import type { EmailGateway, EmailSendResult } from "./gateway";
import { createResendGateway } from "./resend-gateway";
import {
  sendMarketingBroadcast as sendMarketingBroadcastWithGateway,
  sendPasswordResetEmail as sendPasswordResetWithGateway,
  subscribeMarketingContact as subscribeMarketingWithGateway,
  type SendPasswordResetInput,
} from "./send";

export function getEmailGateway(): EmailGateway {
  const client = getResendClient();
  if (client) {
    return createResendGateway(client);
  }
  return createConsoleGateway({ isProduction: env.NODE_ENV === "production" });
}

function runtimeConfig() {
  return {
    gateway: getEmailGateway(),
    from: env.EMAIL_FROM,
    replyTo: env.EMAIL_REPLY_TO,
  };
}

export async function sendPasswordResetEmail(
  input: SendPasswordResetInput,
): Promise<EmailSendResult> {
  return sendPasswordResetWithGateway(input, runtimeConfig());
}

export async function subscribeMarketingContact(
  input: MarketingSubscribeInput,
): Promise<EmailSendResult> {
  return subscribeMarketingWithGateway(input, {
    ...runtimeConfig(),
    segmentId: env.RESEND_MARKETING_SEGMENT_ID,
  });
}

export async function sendMarketingBroadcast(
  input: Omit<MarketingBroadcastInput, "segmentId"> & { segmentId?: string },
): Promise<EmailSendResult> {
  return sendMarketingBroadcastWithGateway(
    {
      ...input,
      segmentId: input.segmentId ?? env.RESEND_MARKETING_SEGMENT_ID,
    },
    runtimeConfig(),
  );
}

export { isResendEnabled };
