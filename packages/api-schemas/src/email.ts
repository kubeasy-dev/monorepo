import { z } from "zod";

export const EmailTopicSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  defaultSubscription: z.string(),
  subscribed: z.boolean(),
});
export type EmailTopic = z.infer<typeof EmailTopicSchema>;
