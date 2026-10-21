package com.vista.collaboration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.vista.collaboration.itinerary.ItineraryDay;
import com.vista.collaboration.itinerary.ItineraryDayRepository;
import com.vista.collaboration.itinerary.ItineraryItem;
import com.vista.collaboration.itinerary.ItineraryItemRepository;
import com.vista.collaboration.itinerary.ItineraryService;
import com.vista.collaboration.itinerary.ItineraryValidationWarning;
import com.vista.trip.application.TripAccessService;
import com.vista.trip.domain.TripEntity;
import com.vista.trip.domain.TripRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * W4-TV3-04: Test validate lịch trình sơ bộ.
 * Kiểm tra: ngày ngoài khoảng trip, trùng giờ trong 1 ngày, giờ không hợp lệ.
 */
@ExtendWith(MockitoExtension.class)
class ItineraryValidationTest {

  @Mock private ItineraryDayRepository dayRepository;
  @Mock private ItineraryItemRepository itemRepository;
  @Mock private TripAccessService tripAccessService;
  @Mock private TripRepository tripRepository;

  @InjectMocks private ItineraryService itineraryService;

  private static final UUID TRIP_ID = UUID.randomUUID();
  private static final UUID USER_ID = UUID.randomUUID();

  /** Trip từ 10/11 đến 12/11/2026 (3 ngày). */
  private TripEntity trip;

  @BeforeEach
  void setUp() {
    trip = new TripEntity(UUID.randomUUID(), "Test Trip",
        LocalDate.of(2026, 11, 10), LocalDate.of(2026, 11, 12));
    ReflectionTestUtils.setField(trip, "id", TRIP_ID);
    ReflectionTestUtils.setField(trip, "createdAt", Instant.now());
    ReflectionTestUtils.setField(trip, "updatedAt", Instant.now());
    ReflectionTestUtils.setField(trip, "version", 0L);
  }

  /** Helper tạo ItineraryDay mock với tripDate. */
  private ItineraryDay makeDay(UUID dayId, int dayNumber, LocalDate date) {
    ItineraryDay day = new ItineraryDay(TRIP_ID, dayNumber, date);
    ReflectionTestUtils.setField(day, "id", dayId);
    return day;
  }

  /** Helper tạo ItineraryItem mock với giờ. */
  private ItineraryItem makeItem(UUID itemId, ItineraryDay day, String name,
      LocalTime start, LocalTime end) {
    ItineraryItem item = new ItineraryItem(day, null, name, start, end, 0, null, USER_ID);
    ReflectionTestUtils.setField(item, "id", itemId);
    ReflectionTestUtils.setField(item, "updatedAt", Instant.now());
    return item;
  }

  // ── Hợp lệ ────────────────────────────────────────────────────────────────

  @Test
  @DisplayName("W4-04 Lịch trình hợp lệ → danh sách cảnh báo rỗng")
  void validate_noIssues_returnsEmptyWarnings() {
    UUID dayId = UUID.randomUUID();
    ItineraryDay day = makeDay(dayId, 1, LocalDate.of(2026, 11, 10));
    ItineraryItem item1 = makeItem(UUID.randomUUID(), day, "Bãi Mỹ Khê",
        LocalTime.of(8, 0), LocalTime.of(10, 0));
    ItineraryItem item2 = makeItem(UUID.randomUUID(), day, "Ngũ Hành Sơn",
        LocalTime.of(14, 0), LocalTime.of(16, 0));

    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));
    when(dayRepository.findByTripIdOrderByDayNumberAsc(TRIP_ID)).thenReturn(List.of(day));
    when(itemRepository.findByDayIdOrderBySortOrderAsc(dayId)).thenReturn(List.of(item1, item2));

    List<ItineraryValidationWarning> warnings = itineraryService.validateItinerary(TRIP_ID, USER_ID);
    assertThat(warnings).isEmpty();
  }

  // ── OUT_OF_TRIP_DATE ───────────────────────────────────────────────────────

  @Test
  @DisplayName("W4-04 Ngày lịch trình trước startDate → OUT_OF_TRIP_DATE")
  void validate_dayBeforeStartDate_returnsOutOfRange() {
    UUID dayId = UUID.randomUUID();
    // 09/11 — trước trip startDate 10/11
    ItineraryDay day = makeDay(dayId, 1, LocalDate.of(2026, 11, 9));

    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));
    when(dayRepository.findByTripIdOrderByDayNumberAsc(TRIP_ID)).thenReturn(List.of(day));
    when(itemRepository.findByDayIdOrderBySortOrderAsc(dayId)).thenReturn(List.of());

    List<ItineraryValidationWarning> warnings = itineraryService.validateItinerary(TRIP_ID, USER_ID);

    assertThat(warnings).hasSize(1);
    assertThat(warnings.get(0).code()).isEqualTo("OUT_OF_TRIP_DATE");
    assertThat(warnings.get(0).dayId()).isEqualTo(dayId);
    assertThat(warnings.get(0).message()).contains("2026-11-09");
  }

  @Test
  @DisplayName("W4-04 Ngày lịch trình sau endDate → OUT_OF_TRIP_DATE")
  void validate_dayAfterEndDate_returnsOutOfRange() {
    UUID dayId = UUID.randomUUID();
    // 15/11 — sau trip endDate 12/11
    ItineraryDay day = makeDay(dayId, 4, LocalDate.of(2026, 11, 15));

    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));
    when(dayRepository.findByTripIdOrderByDayNumberAsc(TRIP_ID)).thenReturn(List.of(day));
    when(itemRepository.findByDayIdOrderBySortOrderAsc(dayId)).thenReturn(List.of());

    List<ItineraryValidationWarning> warnings = itineraryService.validateItinerary(TRIP_ID, USER_ID);

    assertThat(warnings).hasSize(1);
    assertThat(warnings.get(0).code()).isEqualTo("OUT_OF_TRIP_DATE");
  }

  // ── TIME_OVERLAP ───────────────────────────────────────────────────────────

  @Test
  @DisplayName("W4-04 2 điểm dừng chồng giờ trong cùng 1 ngày → TIME_OVERLAP")
  void validate_twoItemsOverlap_returnsTimeOverlap() {
    UUID dayId = UUID.randomUUID();
    ItineraryDay day = makeDay(dayId, 1, LocalDate.of(2026, 11, 10));
    // item1: 08:00–11:00, item2: 10:00–12:00 → chồng 10:00–11:00
    ItineraryItem item1 = makeItem(UUID.randomUUID(), day, "Điểm A",
        LocalTime.of(8, 0), LocalTime.of(11, 0));
    ItineraryItem item2 = makeItem(UUID.randomUUID(), day, "Điểm B",
        LocalTime.of(10, 0), LocalTime.of(12, 0));

    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));
    when(dayRepository.findByTripIdOrderByDayNumberAsc(TRIP_ID)).thenReturn(List.of(day));
    when(itemRepository.findByDayIdOrderBySortOrderAsc(dayId)).thenReturn(List.of(item1, item2));

    List<ItineraryValidationWarning> warnings = itineraryService.validateItinerary(TRIP_ID, USER_ID);

    assertThat(warnings).hasSize(1);
    assertThat(warnings.get(0).code()).isEqualTo("TIME_OVERLAP");
    assertThat(warnings.get(0).dayId()).isEqualTo(dayId);
    assertThat(warnings.get(0).message()).contains("Điểm A");
    assertThat(warnings.get(0).message()).contains("Điểm B");
  }

  @Test
  @DisplayName("W4-04 Giờ kề nhau (item1 endTime = item2 startTime) → KHÔNG bị TIME_OVERLAP")
  void validate_adjacentItems_noOverlap() {
    UUID dayId = UUID.randomUUID();
    ItineraryDay day = makeDay(dayId, 1, LocalDate.of(2026, 11, 10));
    // item1: 08:00–10:00, item2: 10:00–12:00 → kề nhau, không chồng
    ItineraryItem item1 = makeItem(UUID.randomUUID(), day, "Điểm A",
        LocalTime.of(8, 0), LocalTime.of(10, 0));
    ItineraryItem item2 = makeItem(UUID.randomUUID(), day, "Điểm B",
        LocalTime.of(10, 0), LocalTime.of(12, 0));

    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));
    when(dayRepository.findByTripIdOrderByDayNumberAsc(TRIP_ID)).thenReturn(List.of(day));
    when(itemRepository.findByDayIdOrderBySortOrderAsc(dayId)).thenReturn(List.of(item1, item2));

    List<ItineraryValidationWarning> warnings = itineraryService.validateItinerary(TRIP_ID, USER_ID);
    assertThat(warnings).isEmpty();
  }

  // ── INVALID_TIME_RANGE ─────────────────────────────────────────────────────

  @Test
  @DisplayName("W4-04 endTime trước startTime → INVALID_TIME_RANGE")
  void validate_endBeforeStart_returnsInvalidRange() {
    UUID dayId = UUID.randomUUID();
    UUID itemId = UUID.randomUUID();
    ItineraryDay day = makeDay(dayId, 1, LocalDate.of(2026, 11, 10));
    // startTime 14:00, endTime 08:00 — ngược chiều
    ItineraryItem item = makeItem(itemId, day, "Điểm lạ",
        LocalTime.of(14, 0), LocalTime.of(8, 0));

    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));
    when(dayRepository.findByTripIdOrderByDayNumberAsc(TRIP_ID)).thenReturn(List.of(day));
    when(itemRepository.findByDayIdOrderBySortOrderAsc(dayId)).thenReturn(List.of(item));

    List<ItineraryValidationWarning> warnings = itineraryService.validateItinerary(TRIP_ID, USER_ID);

    assertThat(warnings).hasSize(1);
    assertThat(warnings.get(0).code()).isEqualTo("INVALID_TIME_RANGE");
    assertThat(warnings.get(0).itemId()).isEqualTo(itemId);
  }

  @Test
  @DisplayName("W4-04 endTime bằng startTime → INVALID_TIME_RANGE")
  void validate_endEqualsStart_returnsInvalidRange() {
    UUID dayId = UUID.randomUUID();
    ItineraryDay day = makeDay(dayId, 1, LocalDate.of(2026, 11, 10));
    ItineraryItem item = makeItem(UUID.randomUUID(), day, "Điểm X",
        LocalTime.of(9, 0), LocalTime.of(9, 0));

    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));
    when(dayRepository.findByTripIdOrderByDayNumberAsc(TRIP_ID)).thenReturn(List.of(day));
    when(itemRepository.findByDayIdOrderBySortOrderAsc(dayId)).thenReturn(List.of(item));

    List<ItineraryValidationWarning> warnings = itineraryService.validateItinerary(TRIP_ID, USER_ID);

    assertThat(warnings).anyMatch(w -> "INVALID_TIME_RANGE".equals(w.code()));
  }

  // ── Kết hợp nhiều lỗi ─────────────────────────────────────────────────────

  @Test
  @DisplayName("W4-04 Lịch trình cố tình sai: ngày ngoài range + chồng giờ → nhận đủ cảnh báo")
  void validate_multipleIssues_returnsAllWarnings() {
    // Ngày 09/11 — ngoài trip (10/11–12/11)
    UUID dayId = UUID.randomUUID();
    ItineraryDay day = makeDay(dayId, 0, LocalDate.of(2026, 11, 9));
    // 2 điểm dừng chồng giờ
    ItineraryItem item1 = makeItem(UUID.randomUUID(), day, "Điểm sớm",
        LocalTime.of(8, 0), LocalTime.of(12, 0));
    ItineraryItem item2 = makeItem(UUID.randomUUID(), day, "Điểm giữa",
        LocalTime.of(10, 0), LocalTime.of(14, 0));

    when(tripRepository.findById(TRIP_ID)).thenReturn(Optional.of(trip));
    when(dayRepository.findByTripIdOrderByDayNumberAsc(TRIP_ID)).thenReturn(List.of(day));
    when(itemRepository.findByDayIdOrderBySortOrderAsc(dayId)).thenReturn(List.of(item1, item2));

    List<ItineraryValidationWarning> warnings = itineraryService.validateItinerary(TRIP_ID, USER_ID);

    assertThat(warnings.stream().map(ItineraryValidationWarning::code).toList())
        .containsExactlyInAnyOrder("OUT_OF_TRIP_DATE", "TIME_OVERLAP");
    assertThat(warnings).allSatisfy(w -> assertThat(w.message()).isNotBlank());
  }
}
