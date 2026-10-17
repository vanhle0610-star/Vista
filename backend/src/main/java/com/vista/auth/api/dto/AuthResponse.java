package com.vista.auth.api.dto;

import java.util.List;
import java.util.UUID;

public record AuthResponse(
    UUID id,
    String email,
    String displayName,
    String accessToken,
    String refreshToken,
    List<String> roles) {}
