package com.vista.auth.config;

import java.nio.charset.StandardCharsets;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "vista.jwt")
public record JwtProperties(
    String secret, long accessTokenExpirationMs, long refreshTokenExpirationMs) {

  public JwtProperties {
    if (secret == null || secret.isBlank()) {
      throw new IllegalStateException(
          "JWT_SECRET không được để trống! Vui lòng cấu hình biến môi trường JWT_SECRET với độ dài tối thiểu 256 bits (32 ký tự).");
    }
    if (secret.getBytes(StandardCharsets.UTF_8).length < 32) {
      throw new IllegalStateException(
          "JWT_SECRET không đủ an toàn! Cần tối thiểu 256 bits (32 ký tự). Độ dài hiện tại: "
              + secret.getBytes(StandardCharsets.UTF_8).length
              + " bytes.");
    }
    if (accessTokenExpirationMs <= 0) {
      accessTokenExpirationMs = 900_000L; // 15 phút (short-lived access token)
    }
    if (refreshTokenExpirationMs <= 0) {
      refreshTokenExpirationMs = 604_800_000L; // 7 ngày
    }
  }
}
