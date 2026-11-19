import { api } from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  displayName: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

export interface AuthResponseDto {
  id: string;
  email: string;
  displayName: string;
  accessToken: string;
  refreshToken: string;
  roles: string[];
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface PasswordResetResponseDto {
  message: string;
  resetToken?: string;
  email: string;
  expiresInMinutes: number;
}

export interface GoogleLoginPayload {
  idToken: string;
}

export const authApi = {
  /**
   * Đăng nhập người dùng bằng email và mật khẩu
   */
  async login(payload: LoginPayload): Promise<AuthResponseDto> {
    const res = await api.post<AuthResponseDto>('/auth/login', payload);
    return res.data;
  },

  /**
   * Đăng ký tài khoản người dùng mới
   */
  async register(payload: RegisterPayload): Promise<AuthResponseDto> {
    const res = await api.post<AuthResponseDto>('/auth/register', payload);
    return res.data;
  },

  /**
   * Làm mới Access Token thông qua Refresh Token Rotation
   */
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    const res = await api.post<AuthResponseDto>('/auth/refresh', { refreshToken });
    return res.data;
  },

  /**
   * Yêu cầu gửi mã OTP hoặc hướng dẫn khôi phục mật khẩu qua email
   */
  async forgotPassword(payload: ForgotPasswordPayload): Promise<PasswordResetResponseDto> {
    const res = await api.post<PasswordResetResponseDto>('/auth/forgot-password', payload);
    return res.data;
  },

  /**
   * Đăng nhập thông qua Google OAuth ID Token
   */
  async loginWithGoogle(payload: GoogleLoginPayload): Promise<AuthResponseDto> {
    const res = await api.post<AuthResponseDto>('/auth/google', payload);
    return res.data;
  },

  /**
   * Đăng xuất tài khoản và thu hồi Refresh Token trên máy chủ
   */
  async logout(refreshToken?: string): Promise<void> {
    try {
      await api.post('/auth/logout', refreshToken ? { refreshToken } : undefined);
    } catch {
      // Bỏ qua lỗi mạng khi logout để người dùng vẫn được clear local session
    }
  },
};
