package com.vista.location.api;

import com.vista.common.security.CurrentUserProvider;
import com.vista.location.api.dto.CheckInResponse;
import com.vista.location.api.dto.CreateCheckInRequest;
import com.vista.location.application.CheckInService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/trips/{tripId}/check-ins")
@Tag(name = "TV5 Check-ins", description = "Check-in điểm dừng & điểm hẹn chung (TV5)")
@SecurityRequirement(name = "bearerAuth")
public class CheckInController {

  private final CheckInService checkInService;
  private final CurrentUserProvider currentUserProvider;

  public CheckInController(CheckInService checkInService, CurrentUserProvider currentUserProvider) {
    this.checkInService = checkInService;
    this.currentUserProvider = currentUserProvider;
  }

  @PostMapping
  @Operation(summary = "Check-in tại điểm dừng hoặc điểm hẹn trong chuyến đi")
  public ResponseEntity<CheckInResponse> createCheckIn(
      @PathVariable UUID tripId, @Valid @RequestBody CreateCheckInRequest request) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    CheckInResponse response = checkInService.createCheckIn(tripId, currentUserId, request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @GetMapping
  @Operation(summary = "Lấy lịch sử check-in của chuyến đi")
  public ResponseEntity<List<CheckInResponse>> getCheckIns(@PathVariable UUID tripId) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    List<CheckInResponse> responses = checkInService.getCheckIns(tripId, currentUserId);
    return ResponseEntity.ok(responses);
  }
}
