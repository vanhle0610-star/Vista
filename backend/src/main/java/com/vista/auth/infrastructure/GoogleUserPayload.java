package com.vista.auth.infrastructure;

public record GoogleUserPayload(String email, String name, String picture, String sub) {}
