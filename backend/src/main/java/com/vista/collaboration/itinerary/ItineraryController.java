package com.vista.collaboration.itinerary;

import com.vista.common.security.CurrentUserProvider;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Itinerary", description = "Quản lý lịch trình theo ngày và các mục trong chuyến đi")
@SecurityRequirement(name = "bearerAuth")
public class ItineraryController {

  private final ItineraryService itineraryService;
  private final CurrentUserProvider currentUserProvider;

  public ItineraryController(
      ItineraryService itineraryService,
      CurrentUserProvider currentUserProvider) {
    this.itineraryService = itineraryService;
    this.currentUserProvider = currentUserProvider;
  }

  // ── Itinerary Days ─────────────────────────────────────────────────────────

  @PostMapping("/trips/{tripId}/itinerary/days")
  @Operation(summary = "Thêm ngày vào lịch trình — chỉ member của trip (403 nếu không phải)")
  public ResponseEntity<ItineraryDayResponse> createDay(
      @PathVariable UUID tripId,
      @Valid @RequestBody CreateItineraryDayRequest request) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(itineraryService.createDay(tripId, userId, request));
  }

  @GetMapping("/trips/{tripId}/itinerary/days")
  @Operation(summary = "Xem toàn bộ lịch trình — chỉ member của trip (403 nếu không phải)")
  public ResponseEntity<List<ItineraryDayResponse>> getDays(@PathVariable UUID tripId) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(itineraryService.getDays(tripId, userId));
  }

  // ── Itinerary Items ────────────────────────────────────────────────────────

  @PostMapping("/itinerary/days/{dayId}/items")
  @Operation(summary = "Thêm mục vào ngày lịch trình")
  public ResponseEntity<ItineraryItemResponse> createItem(
      @PathVariable UUID dayId,
      @Valid @RequestBody CreateItineraryItemRequest request) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(itineraryService.createItem(dayId, userId, request));
  }

  @PatchMapping("/itinerary/items/{itemId}")
  @Operation(summary = "Cập nhật mục lịch trình — hỗ trợ optimistic concurrency qua expected_updated_at")
  public ResponseEntity<ItineraryItemResponse> updateItem(
      @PathVariable UUID itemId,
      @RequestBody UpdateItineraryItemRequest request) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(itineraryService.updateItem(itemId, userId, request));
  }

  @DeleteMapping("/itinerary/items/{itemId}")
  @Operation(summary = "Xóa mục lịch trình")
  public ResponseEntity<Void> deleteItem(@PathVariable UUID itemId) {
    UUID userId = currentUserProvider.getCurrentUserId();
    itineraryService.deleteItem(itemId, userId);
    return ResponseEntity.noContent().build();
  }

  @PutMapping("/itinerary/days/{dayId}/items/reorder")
  @Operation(
      summary = "Sắp xếp lại thứ tự điểm dừng trong 1 ngày — gửi toàn bộ danh sách ID theo thứ tự mới")
  public ResponseEntity<List<ItineraryItemResponse>> reorderItems(
      @PathVariable UUID dayId, @Valid @RequestBody ReorderItemsRequest request) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(itineraryService.reorderItems(dayId, userId, request));
  }

  // ── W4-TV3-04: Validate lịch trình ────────────────────────────────────────

  @GetMapping("/trips/{tripId}/itinerary/validate")
  @Operation(
      summary = "Kiểm tra lịch trình sơ bộ — phát hiện ngày không hợp lệ và trùng giờ",
      description =
          "Trả về danh sách cảnh báo (rỗng = hợp lệ). "
              + "Mỗi cảnh báo có code (OUT_OF_TRIP_DATE / TIME_OVERLAP / INVALID_TIME_RANGE), "
              + "dayId, itemId (nếu có), và message tiếng Việt rõ ràng.")
  public ResponseEntity<List<ItineraryValidationWarning>> validateItinerary(
      @PathVariable UUID tripId) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(itineraryService.validateItinerary(tripId, userId));
  }
}
