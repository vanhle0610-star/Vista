package com.vista.common.web;

import java.time.Instant;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {
  @GetMapping
  Map<String, Object> health() {
    return Map.of("status", "UP", "service", "vista-backend", "timestamp", Instant.now());
  }
}
