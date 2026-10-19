import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z
    .string()
    .min(10, 'Mật khẩu cần ít nhất 10 ký tự')
    .max(128, 'Mật khẩu không được quá 128 ký tự'),
});

export const registerSchema = loginSchema.extend({
  displayName: z.string().trim().min(2, 'Tên cần ít nhất 2 ký tự'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
