package com.vista.collaboration.itinerary;

import com.vista.collaboration.exception.ConflictException;
import com.vista.collaboration.exception.ResourceNotFoundException;
import com.vista.trip.application.TripAccessService;
import com.vista.trip.domain.TripEntity;
import com.vista.trip.domain.TripRepository;
import java.time.Instant;
import java.util.ArrayList;
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
  private final TripRepository tripRepository;

  public ItineraryService(
      ItineraryDayRepository dayRepository,
      ItineraryItemRepository itemRepository,
      TripAccessService tripAccessService,
      TripRepository tripRepository) {
    this.dayRepository = dayRepository;
    this.itemRepository = itemRepository;
    this.tripAccessService = tripAccessService;
    this.tripRepository = tripRepository;
  }

  // -- Itinerary Days ----------------------------------------------------

  public ItineraryDayResponse createDay(
      UUID tripId, UUID userId, CreateItineraryDayRequest request) {
    tripAccessService.requireMember(tripId, userId);

    if (dayRepository.existsByTripIdAndDayNumber(tripId, request.getDayNumber())) {
      throw new ConflictException(
          "Ng\u00e0y s\u1ed1 " + request.getDayNumber() + " \u0111\u00e3 t\u1ed3n t\u1ea1i trong l\u1ecbch tr\u00ecnh chuy\u1ebfn \u0111i");
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

  // -- Itinerary Items ---------------------------------------------------

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
            "D\u1eef li\u1ec7u l\u1ecbch tr\u00ecnh \u0111\u00e3 b\u1ecb c\u1eadp nh\u1eadt b\u1edfi ng\u01b0\u1eddi kh\u00e1c (xung \u0111\u1ed9t phi\u00ean b\u1ea3n)");
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

  // -- W3-TV3-03: Sap xep lai thu tu diem dung trong 1 ngay ----------------

  public List<ItineraryItemResponse> reorderItems(
      UUID dayId, UUID userId, ReorderItemsRequest request) {
    ItineraryDay day = findDayOrThrow(dayId);
    tripAccessService.requireMember(day.getTripId(), userId);

    List<UUID> orderedIds = request.orderedItemIds();
    if (orderedIds == null || orderedIds.isEmpty()) {
      throw new ConflictException("Danh s\u00e1ch th\u1ee9 t\u1ef1 kh\u00f4ng \u0111\u01b0\u1ee3c r\u1ed7ng");
    }

    for (int i = 0; i < orderedIds.size(); i++) {
      UUID itemId = orderedIds.get(i);
      ItineraryItem item =
          itemRepository
              .findById(itemId)
              .orElseThrow(
                  () ->
                      new ResourceNotFoundException(
                          "Kh\u00f4ng t\u00ecm th\u1ea5y \u0111i\u1ec3m d\u1eebng: " + itemId));
      if (!item.getDay().getId().equals(dayId)) {
        throw new ConflictException(
            "\u0110i\u1ec3m d\u1eebng " + itemId + " kh\u00f4ng thu\u1ed9c ng\u00e0y " + dayId);
      }
      item.setSortOrder(i);
      item.setUpdatedBy(userId);
      item.setUpdatedAt(Instant.now());
      itemRepository.save(item);
    }

    return itemRepository.findByDayIdOrderBySortOrderAsc(dayId).stream()
        .map(ItineraryItemResponse::from)
        .toList();
  }

  // -- W4-TV3-04: Validate lich trinh so bo --------------------------------

  @Transactional(readOnly = true)
  public List<ItineraryValidationWarning> validateItinerary(UUID tripId, UUID userId) {
    tripAccessService.requireMember(tripId, userId);

    TripEntity trip =
        tripRepository
            .findById(tripId)
            .orElseThrow(
                () -> new ResourceNotFoundException("Kh\u00f4ng t\u00ecm th\u1ea5y chuy\u1ebfn \u0111i: " + tripId));

    List<ItineraryDay> days = dayRepository.findByTripIdOrderByDayNumberAsc(tripId);
    List<ItineraryValidationWarning> warnings = new ArrayList<>();

    for (ItineraryDay day : days) {
      if (day.getTripDate() != null) {
        if (day.getTripDate().isBefore(trip.getStartDate())
            || day.getTripDate().isAfter(trip.getEndDate())) {
          warnings.add(
              new ItineraryValidationWarning(
                  "OUT_OF_TRIP_DATE",
                  day.getId(),
                  null,
                  "Ng\u00e0y " + day.getTripDate() + " (ng\u00e0y " + day.getDayNumber()
                      + ") n\u1eb1m ngo\u00e0i kho\u1ea3ng chuy\u1ebfn \u0111i "
                      + trip.getStartDate() + " - " + trip.getEndDate()));
        }
      }

      List<ItineraryItem> items = itemRepository.findByDayIdOrderBySortOrderAsc(day.getId());

      List<ItineraryItem> timedItems =
          items.stream()
              .filter(it -> it.getStartTime() != null && it.getEndTime() != null)
              .toList();

      for (ItineraryItem item : items) {
        if (item.getStartTime() != null
            && item.getEndTime() != null
            && !item.getEndTime().isAfter(item.getStartTime())) {
          warnings.add(
              new ItineraryValidationWarning(
                  "INVALID_TIME_RANGE",
                  day.getId(),
                  item.getId(),
                  "\u0110i\u1ec3m d\u1eebng \""
                      + stopLabel(item)
                      + "\" c\u00f3 gi\u1edd k\u1ebft th\u00fac ("
                      + item.getEndTime()
                      + ") kh\u00f4ng sau gi\u1edd b\u1eaft \u0111\u1ea7u ("
                      + item.getStartTime()
                      + ")"));
        }
      }

      for (int i = 0; i < timedItems.size(); i++) {
        ItineraryItem a = timedItems.get(i);
        if (!a.getEndTime().isAfter(a.getStartTime())) continue;

        for (int j = i + 1; j < timedItems.size(); j++) {
          ItineraryItem b = timedItems.get(j);
          if (!b.getEndTime().isAfter(b.getStartTime())) continue;

          if (a.getStartTime().isBefore(b.getEndTime())
              && b.getStartTime().isBefore(a.getEndTime())) {
            warnings.add(
                new ItineraryValidationWarning(
                    "TIME_OVERLAP",
                    day.getId(),
                    a.getId(),
                    "\u0110i\u1ec3m d\u1eebng \""
                        + stopLabel(a)
                        + "\" ("
                        + a.getStartTime()
                        + "-"
                        + a.getEndTime()
                        + ") ch\u1ed3ng gi\u1edd v\u1edbi \""
                        + stopLabel(b)
                        + "\" ("
                        + b.getStartTime()
                        + "-"
                        + b.getEndTime()
                        + ")"));
          }
        }
      }
    }
    return warnings;
  }

  private static String stopLabel(ItineraryItem item) {
    if (item.getCustomStopName() != null) return item.getCustomStopName();
    if (item.getDestinationId() != null) return item.getDestinationId().toString();
    return item.getId().toString();
  }

  // -- Private helpers ---------------------------------------------------

  private ItineraryDay findDayOrThrow(UUID dayId) {
    return dayRepository
        .findById(dayId)
        .orElseThrow(
            () ->
                new ResourceNotFoundException(
                    "Kh\u00f4ng t\u00ecm th\u1ea5y ng\u00e0y l\u1ecbch tr\u00ecnh v\u1edbi ID: " + dayId));
  }

  private ItineraryItem findItemOrThrow(UUID itemId) {
    return itemRepository
        .findById(itemId)
        .orElseThrow(
            () ->
                new ResourceNotFoundException(
                    "Kh\u00f4ng t\u00ecm th\u1ea5y m\u1ee5c l\u1ecbch tr\u00ecnh v\u1edbi ID: " + itemId));
  }
}