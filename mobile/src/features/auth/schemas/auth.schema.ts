import { z } from 'zod';
export const loginSchema = z.object({ email: z.email('Email không hợp lệ'), password: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự') });
export const registerSchema = loginSchema.extend({ displayName: z.string().trim().min(2, 'Tên cần ít nhất 2 ký tự') });
export type LoginInput = z.infer<typeof loginSchema>;
