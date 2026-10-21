package com.vista.collaboration.itinerary;

import com.vista.collaboration.exception.ConflictException;
import com.vista.collaboration.exception.ResourceNotFoundException;
import com.vista.trip.application.TripAccessService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ItineraryService {

  private final ItineraryDayRepository dayRepository;
  private final ItineraryItemRepository itemRepository;
  private final TripAccessService tripAccessService;

  public ItineraryService(
      ItineraryDayRepository dayRepository,
      ItineraryItemRepository itemRepository,
      TripAccessService tripAccessService) {
    this.dayRepository = dayRepository;
    this.itemRepository = itemRepository;
    this.tripAccessService = tripAccessService;
  }

  // ── Itinerary Days ─────────────────────────────────────────────────────────

  public ItineraryDayResponse createDay(
      UUID tripId, UUID userId, CreateItineraryDayRequest request) {
    tripAccessService.requireMember(tripId, userId);

    if (dayRepository.existsByTripIdAndDayNumber(tripId, request.getDayNumber())) {
      throw new ConflictException(
          "Ngày số " + request.getDayNumber() + " đã tồn tại trong lịch trình chuyến đi");
    }

    ItineraryDay day = new ItineraryDay(tripId, request.getDayNumber(), request.getTripDate());
    return ItineraryDayResponse.from(dayRepository.save(day));
  }

  @Transactional(readOnly = true)
  public List<ItineraryDayResponse> getDays(UUID tripId, UUID userId) {
    tripAccessService.requireMember(tripId, userId);
    return dayRepository.findByTripIdOrderByDayNumberAsc(tripId).stream()
        .map(ItineraryDayResponse::from)
        .toList();
  }

  // ── Itinerary Items ────────────────────────────────────────────────────────

  public ItineraryItemResponse createItem(
      UUID dayId, UUID userId, CreateItineraryItemRequest request) {
    ItineraryDay day = findDayOrThrow(dayId);
    tripAccessService.requireMember(day.getTripId(), userId);

    ItineraryItem item =
        new ItineraryItem(
            day,
            request.getDestinationId(),
            request.getCustomStopName(),
            request.getStartTime(),
            request.getEndTime(),
            request.getSortOrder(),
            request.getNote(),
            userId);

    return ItineraryItemResponse.from(itemRepository.save(item));
  }

  public ItineraryItemResponse updateItem(
      UUID itemId, UUID userId, UpdateItineraryItemRequest request) {
    ItineraryItem item = findItemOrThrow(itemId);
    tripAccessService.requireMember(item.getDay().getTripId(), userId);

    // Optimistic concurrency check
    if (request.getExpectedUpdatedAt() != null) {
      long actual = item.getUpdatedAt().toEpochMilli();
      long expected = request.getExpectedUpdatedAt().toEpochMilli();
      if (actual != expected) {
        throw new ConflictException(
            "Dữ liệu lịch trình đã bị cập nhật bởi người khác (xung đột phiên bản)");
      }
    }

    if (request.getDestinationId() != null) item.setDestinationId(request.getDestinationId());
    if (request.getCustomStopName() != null) item.setCustomStopName(request.getCustomStopName());
    if (request.getStartTime() != null) item.setStartTime(request.getStartTime());
    if (request.getEndTime() != null) item.setEndTime(request.getEndTime());
    if (request.getSortOrder() != null) item.setSortOrder(request.getSortOrder());
    if (request.getNote() != null) item.setNote(request.getNote());
    item.setUpdatedBy(userId);
    item.setUpdatedAt(Instant.now());

    return ItineraryItemResponse.from(itemRepository.save(item));
  }

  public void deleteItem(UUID itemId, UUID userId) {
    ItineraryItem item = findItemOrThrow(itemId);
    tripAccessService.requireMember(item.getDay().getTripId(), userId);
    itemRepository.delete(item);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private ItineraryDay findDayOrThrow(UUID dayId) {
    return dayRepository
        .findById(dayId)
        .orElseThrow(
            () -> new ResourceNotFoundException("Không tìm thấy ngày lịch trình với ID: " + dayId));
  }

  private ItineraryItem findItemOrThrow(UUID itemId) {
    return itemRepository
        .findById(itemId)
        .orElseThrow(
            () ->
                new ResourceNotFoundException(
                    "Không tìm thấy mục lịch trình với ID: " + itemId));
  }
}
