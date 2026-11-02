package com.vista.notification.api;

import com.vista.common.security.CurrentUserProvider;
import com.vista.notification.domain.DeviceTokenEntity;
import com.vista.notification.domain.DeviceTokenRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * W6-TV3-04: API đăng ký và hủy token thiết bị phục vụ thông báo đẩy (FCM / APNs).
 */
@RestController
@RequestMapping("/api/v1/devices/tokens")
@Tag(name = "Device Tokens", description = "Đăng ký và hủy token thiết bị cho push notifications")
@SecurityRequirement(name = "bearerAuth")
public class DeviceTokenController {

  private final DeviceTokenRepository deviceTokenRepository;
  private final CurrentUserProvider currentUserProvider;

  public DeviceTokenController(
      DeviceTokenRepository deviceTokenRepository, CurrentUserProvider currentUserProvider) {
    this.deviceTokenRepository = deviceTokenRepository;
    this.currentUserProvider = currentUserProvider;
  }

  @PostMapping
  @Operation(summary = "Đăng ký token thiết bị (FCM / APNs) cho người dùng hiện tại")
  @Transactional
  public ResponseEntity<DeviceTokenResponse> registerToken(
      @Valid @RequestBody RegisterDeviceTokenRequest request) {
    UUID userId = currentUserProvider.getCurrentUserId();

    DeviceTokenEntity entity =
        deviceTokenRepository
            .findByToken(request.token())
            .map(
                existing -> {
                  existing.setPlatform(request.platform());
                  if (request.deviceName() != null) {
                    existing.setDeviceName(request.deviceName());
                  }
                  existing.setActive(true);
                  // Chuyển quyền sở hữu token sang user hiện tại nếu thiết bị đổi tài khoản
                  existing.setUserId(userId);
                  return existing;
                })
            .orElseGet(
                () -> {
                  DeviceTokenEntity created =
                      new DeviceTokenEntity(userId, request.token(), request.platform());
                  if (request.deviceName() != null) {
                    created.setDeviceName(request.deviceName());
                  }
                  return created;
                });

    DeviceTokenEntity saved = deviceTokenRepository.save(entity);
    return ResponseEntity.status(HttpStatus.CREATED).body(DeviceTokenResponse.from(saved));
  }

  @DeleteMapping("/{token}")
  @Operation(summary = "Hủy / vô hiệu hóa token thiết bị (khi đăng xuất)")
  @Transactional
  public ResponseEntity<Void> unregisterToken(@PathVariable String token) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    int updated = deviceTokenRepository.deactivateByUserAndToken(currentUserId, token);
    if (updated == 0) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND, "Không tìm thấy token thuộc người dùng hiện tại");
    }
    return ResponseEntity.noContent().build();
  }

  // ── DTOs ───────────────────────────────────────────────────────────────────

  public record RegisterDeviceTokenRequest(
      @NotBlank(message = "Token thiết bị không được để trống") String token,
      @NotBlank(message = "Platform không được để trống (FCM / APNS)") String platform,
      String deviceName) {}

  public record DeviceTokenResponse(
      UUID id,
      UUID userId,
      String token,
      String platform,
      String deviceName,
      boolean active,
      Instant createdAt) {
    public static DeviceTokenResponse from(DeviceTokenEntity e) {
      return new DeviceTokenResponse(
          e.getId(),
          e.getUserId(),
          e.getToken(),
          e.getPlatform(),
          e.getDeviceName(),
          e.isActive(),
          e.getCreatedAt());
    }
  }
}
