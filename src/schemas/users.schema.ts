import { z } from "zod";

const newPassword = z
  .string()
  .min(8)
  .max(72)
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Password must be at most 72 UTF-8 bytes",
  );
export const changePasswordSchema = z
  .strictObject({
    currentPassword: z.string().min(1).max(72),
    newPassword,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "Choose a different password",
    path: ["newPassword"],
  });
export const staffSchema = z.strictObject({
  name: z.string().trim().min(2).max(100),
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: newPassword,
});
export const userQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
