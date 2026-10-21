package com.vista.trip.api;

import com.vista.common.security.CurrentUserProvider;
import com.vista.trip.api.dto.CreateTripRequest;
import com.vista.trip.api.dto.TripResponse;
import com.vista.trip.api.dto.UpdateTripRequest;
import com.vista.trip.application.TripService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/trips")
@Tag(name = "Trips", description = "Quản lý chuyến đi — tạo, đọc, sửa, xóa và quản lý thành viên")
@SecurityRequirement(name = "bearerAuth")
public class TripController {

  private final TripService tripService;
  private final CurrentUserProvider currentUserProvider;

  public TripController(TripService tripService, CurrentUserProvider currentUserProvider) {
    this.tripService = tripService;
    this.currentUserProvider = currentUserProvider;
  }

  @PostMapping
  @Operation(summary = "Tạo chuyến đi mới — người tạo tự động trở thành Owner")
  public ResponseEntity<TripResponse> createTrip(@Valid @RequestBody CreateTripRequest request) {
    UUID userId = currentUserProvider.getCurrentUserId();
    TripResponse response = tripService.createTrip(userId, request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @GetMapping
  @Operation(summary = "Lấy danh sách chuyến đi mà người dùng hiện tại tham gia")
  public ResponseEntity<List<TripResponse>> getMyTrips() {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(tripService.getMyTrips(userId));
  }

  @GetMapping("/{tripId}")
  @Operation(summary = "Xem chi tiết một chuyến đi — chỉ member mới được xem (403 nếu không phải)")
  public ResponseEntity<TripResponse> getTrip(@PathVariable UUID tripId) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(tripService.getTrip(tripId, userId));
  }

  @PatchMapping("/{tripId}")
  @Operation(summary = "Cập nhật thông tin chuyến đi — chỉ Owner mới được phép (403 nếu không phải)")
  public ResponseEntity<TripResponse> updateTrip(
      @PathVariable UUID tripId, @Valid @RequestBody UpdateTripRequest request) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(tripService.updateTrip(tripId, userId, request));
  }

  @DeleteMapping("/{tripId}")
  @Operation(summary = "Xóa chuyến đi — chỉ Owner mới được phép (403 nếu không phải)")
  public ResponseEntity<Void> deleteTrip(@PathVariable UUID tripId) {
    UUID userId = currentUserProvider.getCurrentUserId();
    tripService.deleteTrip(tripId, userId);
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/{tripId}/members/{userId}")
  @Operation(summary = "Xóa thành viên — Owner xóa bất kỳ ai, thành viên có thể tự rời")
  public ResponseEntity<Void> removeMember(
      @PathVariable UUID tripId, @PathVariable UUID userId) {
    UUID requesterId = currentUserProvider.getCurrentUserId();
    tripService.removeMember(tripId, userId, requesterId);
    return ResponseEntity.noContent().build();
  }
}
