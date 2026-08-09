import { z } from "zod";

export const guestStartSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  subject: z.string().trim().min(3, "Add a short subject").max(140),
  body: z.string().trim().min(1, "Describe the issue").max(2000),
});

export const guestHandleSchema = z.object({
  id: z.string().uuid(),
  token: z.string().uuid(),
});

export const guestReplySchema = guestHandleSchema.extend({
  body: z.string().trim().min(1).max(2000),
});