import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z
    .string({ error: "Email phải là chuỗi." })
    .trim()
    .email({ error: "Email không đúng định dạng." }),
  password: z
    .string({ error: "Mật khẩu phải là chuỗi." })
    .min(1, { error: "Mật khẩu không được để trống." }),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
