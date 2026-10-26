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
    String phoneNumber,
    String bio,
    String bankCode,
    String bankBin,
    String bankAccountNumber,
    String bankAccountName,
    List<String> travelPreferences) {

  public UserResponse(
      UUID id,
      String email,
      String displayName,
      String avatarUrl,
      String status,
      List<String> roles,
      String phoneNumber) {
    this(
        id,
        email,
        displayName,
        avatarUrl,
        status,
        roles,
        phoneNumber,
        null,
        null,
        null,
        null,
        null,
        List.of());
  }

  public UserResponse(
      UUID id,
      String email,
      String displayName,
      String avatarUrl,
      String status,
      List<String> roles) {
    this(
        id,
        email,
        displayName,
        avatarUrl,
        status,
        roles,
        null,
        null,
        null,
        null,
        null,
        null,
        List.of());
  }
}
