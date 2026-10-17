package com.vista.common.config;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "vista.cors")
public record VistaProperties(@NotEmpty List<String> allowedOrigins) {}
