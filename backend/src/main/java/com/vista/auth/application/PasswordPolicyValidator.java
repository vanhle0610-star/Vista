package com.vista.auth.application;

import com.vista.auth.exception.InvalidPasswordException;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class PasswordPolicyValidator {

  public static final int MIN_LENGTH = 10;
  public static final int MAX_LENGTH = 128;

  private static final Set<String> COMMON_PASSWORDS =
      Set.of(
          "123456",
          "12345678",
          "123456789",
          "1234567890",
          "password",
          "password123",
          "password1234",
          "qwerty",
          "qwertyuiop",
          "admin123",
          "admin1234",
          "letmein",
          "welcome",
          "welcome123",
          "iloveyou",
          "11111111",
          "123123123",
          "vista12345",
          "passphrase");

  public void validate(String password) {
    if (password == null || password.isBlank()) {
      throw new InvalidPasswordException("Mật khẩu không được để trống");
    }

    if (password.length() < MIN_LENGTH) {
      throw new InvalidPasswordException(
          "Mật khẩu quá ngắn. Vui lòng sử dụng mật khẩu có tối thiểu " + MIN_LENGTH + " ký tự.");
    }

    if (password.length() > MAX_LENGTH) {
      throw new InvalidPasswordException(
          "Mật khẩu quá dài. Độ dài tối đa cho phép là " + MAX_LENGTH + " ký tự.");
    }

    String normalized = password.trim().toLowerCase();
    if (COMMON_PASSWORDS.contains(normalized)) {
      throw new InvalidPasswordException(
          "Mật khẩu này quá phổ biến và dễ bị đoán. Vui lòng chọn mật khẩu hoặc cụm mật khẩu khác an toàn hơn.");
    }
  }
}
