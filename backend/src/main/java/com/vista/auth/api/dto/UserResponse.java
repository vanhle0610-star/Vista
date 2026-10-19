package com.vista.auth.api.dto;

import java.util.List;
import java.util.UUID;

public record UserResponse(
    UUID id,
    String email,
    String displayName,
    String avatarUrl,
    String status,
    List<String> roles,
    String phoneNumber) {

  public UserResponse(
      UUID id,
      String email,
      String displayName,
      String avatarUrl,
      String status,
      List<String> roles) {
    this(id, email, displayName, avatarUrl, status, roles, null);
  }
}
