package com.vista.location.api;

import com.vista.common.security.CurrentUserProvider;
import com.vista.location.api.dto.CreateMeetupPointRequest;
import com.vista.location.api.dto.MeetupPointResponse;
import com.vista.location.api.dto.UpdateMeetupPointRequest;
import com.vista.location.application.MeetupPointService;
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
@RequestMapping("/api/v1/trips/{tripId}/meetup-points")
@Tag(name = "TV5 Meetup Points", description = "Quản lý điểm hẹn chung trong chuyến đi (TV5)")
@SecurityRequirement(name = "bearerAuth")
public class MeetupPointController {

  private final MeetupPointService meetupPointService;
  private final CurrentUserProvider currentUserProvider;

  public MeetupPointController(
      MeetupPointService meetupPointService, CurrentUserProvider currentUserProvider) {
    this.meetupPointService = meetupPointService;
    this.currentUserProvider = currentUserProvider;
  }

  @PostMapping
  @Operation(summary = "Tạo điểm hẹn mới trong chuyến đi")
  public ResponseEntity<MeetupPointResponse> createMeetupPoint(
      @PathVariable UUID tripId, @Valid @RequestBody CreateMeetupPointRequest request) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    MeetupPointResponse response =
        meetupPointService.createMeetupPoint(tripId, currentUserId, request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @GetMapping
  @Operation(summary = "Lấy danh sách các điểm hẹn trong chuyến đi")
  public ResponseEntity<List<MeetupPointResponse>> getMeetupPoints(@PathVariable UUID tripId) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    List<MeetupPointResponse> responses = meetupPointService.getMeetupPoints(tripId, currentUserId);
    return ResponseEntity.ok(responses);
  }

  @PatchMapping("/{meetupId}")
  @Operation(summary = "Cập nhật điểm hẹn (chính người tạo hoặc chủ nhóm)")
  public ResponseEntity<MeetupPointResponse> updateMeetupPoint(
      @PathVariable UUID tripId,
      @PathVariable UUID meetupId,
      @Valid @RequestBody UpdateMeetupPointRequest request) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    MeetupPointResponse response =
        meetupPointService.updateMeetupPoint(tripId, meetupId, currentUserId, request);
    return ResponseEntity.ok(response);
  }

  @DeleteMapping("/{meetupId}")
  @Operation(summary = "Xóa điểm hẹn (chính người tạo hoặc chủ nhóm)")
  public ResponseEntity<Void> deleteMeetupPoint(
      @PathVariable UUID tripId, @PathVariable UUID meetupId) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    meetupPointService.deleteMeetupPoint(tripId, meetupId, currentUserId);
    return ResponseEntity.noContent().build();
  }
}
