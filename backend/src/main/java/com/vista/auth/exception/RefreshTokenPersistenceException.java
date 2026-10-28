package com.vista.auth.exception;

public class RefreshTokenPersistenceException extends RuntimeException {

  public RefreshTokenPersistenceException(String message) {
    super(message);
  }

  public RefreshTokenPersistenceException(String message, Throwable cause) {
    super(message, cause);
  }
}
