package com.vista.collaboration.itinerary;

import com.vista.budget.infrastructure.ExpenseRepository;
import com.vista.collaboration.exception.ConflictException;
import com.vista.collaboration.exception.ResourceNotFoundException;
import com.vista.destination.domain.Destination;
import com.vista.destination.repository.DestinationRepository;
import com.vista.notification.application.NotificationService;
import com.vista.notification.domain.NotificationType;
import com.vista.trip.application.TripAccessService;
import com.vista.trip.domain.TripEntity;
import com.vista.trip.domain.TripRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ItineraryService {

  private final ItineraryDayRepository dayRepository;
  private final ItineraryItemRepository itemRepository;
  private final TripAccessService tripAccessService;
  private final TripRepository tripRepository;
  private final NotificationService notificationService;
  private final DestinationRepository destinationRepository;
  private final ExpenseRepository expenseRepository;

  @Autowired
  public ItineraryService(
      ItineraryDayRepository dayRepository,
      ItineraryItemRepository itemRepository,
      TripAccessService tripAccessService,
      TripRepository tripRepository,
      @Autowired(required = false) NotificationService notificationService,
      @Autowired(required = false) DestinationRepository destinationRepository,
      @Autowired(required = false) ExpenseRepository expenseRepository) {
    this.dayRepository = dayRepository;
    this.itemRepository = itemRepository;
    this.tripAccessService = tripAccessService;
    this.tripRepository = tripRepository;
    this.notificationService = notificationService;
    this.destinationRepository = destinationRepository;
    this.expenseRepository = expenseRepository;
  }

  public ItineraryService(
      ItineraryDayRepository dayRepository,
      ItineraryItemRepository itemRepository,
      TripAccessService tripAccessService,
      TripRepository tripRepository) {
    this(dayRepository, itemRepository, tripAccessService, tripRepository, null, null, null);
  }

  // -- Itinerary Days ----------------------------------------------------

  public ItineraryDayResponse createDay(
      UUID tripId, UUID userId, CreateItineraryDayRequest request) {
    tripAccessService.requireMember(tripId, userId);

    if (dayRepository.existsByTripIdAndDayNumber(tripId, request.getDayNumber())) {
      throw new ConflictException(
          "Ngày số "
              + request.getDayNumber()
              + " đã tồn tại trong lịch trình chuyến đi");
    }

    ItineraryDay day = new ItineraryDay(tripId, request.getDayNumber(), request.getTripDate());
    ItineraryDay saved = dayRepository.save(day);

    notifyTripMembers(tripId, "Lịch trình đã thay đổi", "Một ngày mới đã được thêm vào lịch trình", userId);
    return ItineraryDayResponse.from(saved);
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

    ItineraryItem saved = itemRepository.save(item);
    notifyTripMembers(
        day.getTripId(),
        "Lịch trình đã thay đổi",
        "Điểm dừng \"" + stopLabel(saved) + "\" đã được thêm vào lịch trình",
        userId);
    return ItineraryItemResponse.from(saved);
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

    ItineraryItem saved = itemRepository.save(item);
    notifyTripMembers(
        item.getDay().getTripId(),
        "Lịch trình đã thay đổi",
        "Điểm dừng \"" + stopLabel(saved) + "\" đã được cập nhật",
        userId);
    return ItineraryItemResponse.from(saved);
  }

  public void deleteItem(UUID itemId, UUID userId) {
    ItineraryItem item = findItemOrThrow(itemId);
    UUID tripId = item.getDay().getTripId();
    tripAccessService.requireMember(tripId, userId);
    String label = stopLabel(item);
    itemRepository.delete(item);

    notifyTripMembers(
        tripId,
        "Lịch trình đã thay đổi",
        "Điểm dừng \"" + label + "\" đã được xóa khỏi lịch trình",
        userId);
  }

  // -- W3-TV3-03: Sap xep lai thu tu diem dung trong 1 ngay ----------------

  public List<ItineraryItemResponse> reorderItems(
      UUID dayId, UUID userId, ReorderItemsRequest request) {
    ItineraryDay day = findDayOrThrow(dayId);
    tripAccessService.requireMember(day.getTripId(), userId);

    List<UUID> orderedIds = request.orderedItemIds();
    if (orderedIds == null || orderedIds.isEmpty()) {
      throw new ConflictException("Danh sách thứ tự không được rỗng");
    }

    for (int i = 0; i < orderedIds.size(); i++) {
      UUID itemId = orderedIds.get(i);
      ItineraryItem item =
          itemRepository
              .findById(itemId)
              .orElseThrow(
                  () ->
                      new ResourceNotFoundException(
                          "Không tìm thấy điểm dừng: " + itemId));
      if (!item.getDay().getId().equals(dayId)) {
        throw new ConflictException(
            "Điểm dừng " + itemId + " không thuộc ngày " + dayId);
      }
      item.setSortOrder(i);
      item.setUpdatedBy(userId);
      item.setUpdatedAt(Instant.now());
      itemRepository.save(item);
    }

    notifyTripMembers(
        day.getTripId(),
        "Lịch trình đã thay đổi",
        "Thứ tự các điểm dừng trong ngày đã được sắp xếp lại",
        userId);

    return itemRepository.findByDayIdOrderBySortOrderAsc(dayId).stream()
        .map(ItineraryItemResponse::from)
        .toList();
  }

  // -- W5-TV3-04: Luu goi y AI vao lich trinh (Diem tich hop TV4) -----------

  public ItineraryItemResponse createAiItem(
      UUID tripId, UUID userId, CreateAiItineraryItemRequest request, boolean confirmedParam) {
    boolean isConfirmed = confirmedParam || (request.getConfirmed() != null && request.getConfirmed());
    if (!isConfirmed) {
      throw new IllegalArgumentException(
          "Chưa xác nhận gợi ý AI - yêu cầu confirmed = true để lưu vào lịch trình");
    }

    tripAccessService.requireMember(tripId, userId);
    ItineraryDay day = findDayOrThrow(request.getDayId());
    if (!day.getTripId().equals(tripId)) {
      throw new ConflictException("Ngày lịch trình " + request.getDayId() + " không thuộc chuyến đi " + tripId);
    }

    if (request.getStartTime() != null
        && request.getEndTime() != null
        && !request.getEndTime().isAfter(request.getStartTime())) {
      throw new IllegalArgumentException("Giờ kết thúc phải sau giờ bắt đầu");
    }

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
    item.setSource("AI_SUGGESTED");

    ItineraryItem saved = itemRepository.save(item);

    notifyTripMembers(
        tripId,
        "Lịch trình đã thay đổi",
        "Gợi ý AI \"" + stopLabel(saved) + "\" đã được thêm vào lịch trình",
        userId);

    return ItineraryItemResponse.from(saved);
  }

  // -- W4-TV3-04 & W5-TV3-01: Validate lich trinh + canh bao ngan sach ------

  @Transactional(readOnly = true)
  public List<ItineraryValidationWarning> validateItinerary(UUID tripId, UUID userId) {
    tripAccessService.requireMember(tripId, userId);

    TripEntity trip =
        tripRepository
            .findById(tripId)
            .orElseThrow(
                () ->
                    new ResourceNotFoundException(
                        "Không tìm thấy chuyến đi: " + tripId));

    List<ItineraryDay> days = dayRepository.findByTripIdOrderByDayNumberAsc(tripId);
    List<ItineraryValidationWarning> warnings = new ArrayList<>();

    // 1. Kiểm tra ngày ngoài khoảng chuyến đi và trùng giờ
    for (ItineraryDay day : days) {
      if (day.getTripDate() != null) {
        if (day.getTripDate().isBefore(trip.getStartDate())
            || day.getTripDate().isAfter(trip.getEndDate())) {
          warnings.add(
              new ItineraryValidationWarning(
                  "OUT_OF_TRIP_DATE",
                  day.getId(),
                  null,
                  "Ngày "
                      + day.getTripDate()
                      + " (ngày "
                      + day.getDayNumber()
                      + ") nằm ngoài khoảng chuyến đi "
                      + trip.getStartDate()
                      + " - "
                      + trip.getEndDate()));
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
                  "Điểm dừng \""
                      + stopLabel(item)
                      + "\" có giờ kết thúc ("
                      + item.getEndTime()
                      + ") không sau giờ bắt đầu ("
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
                    "Điểm dừng \""
                        + stopLabel(a)
                        + "\" ("
                        + a.getStartTime()
                        + "-"
                        + a.getEndTime()
                        + ") chồng giờ với \""
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

    // 2. W5-TV3-01: Kiểm tra cảnh báo ngân sách
    if (trip.getBudgetTotal() != null && trip.getBudgetTotal().compareTo(BigDecimal.ZERO) > 0) {
      BigDecimal totalExpenses =
          expenseRepository != null ? expenseRepository.sumAmountByTripId(tripId) : BigDecimal.ZERO;
      if (totalExpenses == null) totalExpenses = BigDecimal.ZERO;

      BigDecimal runningTotal = totalExpenses;
      boolean budgetWarningEmitted = false;

      if (runningTotal.compareTo(trip.getBudgetTotal()) > 0) {
        BigDecimal excess = runningTotal.subtract(trip.getBudgetTotal());
        warnings.add(
            new ItineraryValidationWarning(
                "BUDGET_EXCEEDED",
                null,
                null,
                "Tổng chi phí phát sinh thực tế ("
                    + runningTotal
                    + " "
                    + trip.getCurrency()
                    + ") đã vượt ngân sách chuyến ("
                    + trip.getBudgetTotal()
                    + " "
                    + trip.getCurrency()
                    + "), vượt "
                    + excess
                    + " "
                    + trip.getCurrency()));
        budgetWarningEmitted = true;
      }

      for (ItineraryDay day : days) {
        List<ItineraryItem> items = itemRepository.findByDayIdOrderBySortOrderAsc(day.getId());
        for (ItineraryItem item : items) {
          BigDecimal stopCost = BigDecimal.ZERO;
          if (item.getDestinationId() != null && destinationRepository != null) {
            var destOpt = destinationRepository.findById(item.getDestinationId());
            if (destOpt.isPresent()) {
              Destination d = destOpt.get();
              if (d.getPriceMax() != null) {
                stopCost = d.getPriceMax();
              } else if (d.getPriceMin() != null) {
                stopCost = d.getPriceMin();
              }
            }
          }
          runningTotal = runningTotal.add(stopCost);
          if (!budgetWarningEmitted && runningTotal.compareTo(trip.getBudgetTotal()) > 0) {
            BigDecimal excess = runningTotal.subtract(trip.getBudgetTotal());
            warnings.add(
                new ItineraryValidationWarning(
                    "BUDGET_EXCEEDED",
                    day.getId(),
                    item.getId(),
                    "Tổng chi phí dự kiến lịch trình ("
                        + runningTotal
                        + " "
                        + trip.getCurrency()
                        + ") vượt ngân sách chuyến ("
                        + trip.getBudgetTotal()
                        + " "
                        + trip.getCurrency()
                        + ") tại điểm dừng \""
                        + stopLabel(item)
                        + "\", vượt "
                        + excess
                        + " "
                        + trip.getCurrency()));
            budgetWarningEmitted = true;
          }
        }
      }
    }

    return warnings;
  }

  private void notifyTripMembers(UUID tripId, String title, String body, UUID excludeUserId) {
    if (notificationService != null && tripId != null) {
      try {
        notificationService.notifyTripMembers(
            tripId, title, body, NotificationType.ITINERARY_CHANGED.name(), excludeUserId);
      } catch (Exception e) {
        // Log và không chặn luồng chính nếu notification gặp lỗi
      }
    }
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
                    "Không tìm thấy ngày lịch trình với ID: "
                        + dayId));
  }

  private ItineraryItem findItemOrThrow(UUID itemId) {
    return itemRepository
        .findById(itemId)
        .orElseThrow(
            () ->
                new ResourceNotFoundException(
                    "Không tìm thấy mục lịch trình với ID: "
                        + itemId));
  }
}

