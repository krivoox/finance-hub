export type { EmailGateway, EmailSendResult } from "./gateway";
export {
  sendMarketingBroadcast,
  sendPasswordResetEmail,
  subscribeMarketingContact,
} from "./send";
export type { EmailRuntimeConfig, SendPasswordResetInput } from "./send";
