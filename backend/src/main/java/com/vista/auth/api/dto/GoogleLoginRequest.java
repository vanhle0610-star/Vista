package com.vista.auth.api.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequest(
    @NotBlank(message = "Google ID Token không được để trống") String idToken) {}
