package com.vista.admin.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin", description = "Các API quản trị hệ thống dành riêng cho vai trò ADMIN")
@SecurityRequirement(name = "bearerAuth")
public class AdminTestController {

  @GetMapping("/overview")
  @PreAuthorize("hasRole('ADMIN')")
  @Operation(summary = "Xem tổng quan hệ thống quản trị")
  public ResponseEntity<Map<String, Object>> getOverview() {
    return ResponseEntity.ok(
        Map.of(
            "status", "HEALTHY",
            "access", "AUTHORIZED",
            "message", "Chào mừng quản trị viên hệ thống VISTA"));
  }
}
