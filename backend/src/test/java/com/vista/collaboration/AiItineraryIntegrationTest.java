package com.vista.collaboration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vista.collaboration.itinerary.CreateAiItineraryItemRequest;
import com.vista.collaboration.itinerary.ItineraryDay;
import com.vista.collaboration.itinerary.ItineraryDayRepository;
import com.vista.collaboration.itinerary.ItineraryItem;
import com.vista.collaboration.itinerary.ItineraryItemRepository;
import com.vista.collaboration.itinerary.ItineraryItemResponse;
import com.vista.collaboration.itinerary.ItineraryService;
import com.vista.notification.application.NotificationService;
import com.vista.trip.application.TripAccessService;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
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
 * W5-TV3-04 & W6-TV3-05: Điểm tích hợp cho TV4 lưu gợi ý AI vào lịch trình.
 * - Chỉ thực thi khi có cờ confirmed=true.
 * - Chưa xác nhận → không lưu gì cả.
 * - Đã xác nhận → lưu điểm dừng với source AI_SUGGESTED và thông báo ITINERARY_CHANGED cho các thành viên.
 */
@ExtendWith(MockitoExtension.class)
class AiItineraryIntegrationTest {

  @Mock private ItineraryDayRepository dayRepository;
  @Mock private ItineraryItemRepository itemRepository;
  @Mock private TripAccessService tripAccessService;
  @Mock private NotificationService notificationService;

  @InjectMocks private ItineraryService itineraryService;

  private static final UUID TRIP_ID = UUID.randomUUID();
  private static final UUID USER_ID = UUID.randomUUID();
  private static final UUID DAY_ID = UUID.randomUUID();

  private ItineraryDay day;

  @BeforeEach
  void setUp() {
    day = new ItineraryDay(TRIP_ID, 1, LocalDate.of(2026, 11, 10));
    ReflectionTestUtils.setField(day, "id", DAY_ID);
  }

  @Test
  @DisplayName("W5-04 Gọi khi chưa xác nhận (confirmed=false) → không lưu gì cả, ném ngoại lệ")
  void createAiItem_notConfirmed_doesNotSaveAndThrows() {
    CreateAiItineraryItemRequest request =
        new CreateAiItineraryItemRequest(
            DAY_ID,
            null,
            "Gợi ý AI: Cầu Rồng",
            LocalTime.of(19, 0),
            LocalTime.of(21, 0),
            1,
            "Xem phun lửa",
            false);

    assertThatThrownBy(() -> itineraryService.createAiItem(TRIP_ID, USER_ID, request, false))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Chưa xác nhận gợi ý AI");

    verify(itemRepository, never()).save(any());
  }

  @Test
  @DisplayName("W5-04 Gọi khi đã xác nhận (confirmed=true) → lưu điểm dừng AI_SUGGESTED và phát thông báo")
  void createAiItem_confirmed_savesItemAndNotifiesMembers() {
    CreateAiItineraryItemRequest request =
        new CreateAiItineraryItemRequest(
            DAY_ID,
            null,
            "Gợi ý AI: Bảo tàng Điêu khắc Chăm",
            LocalTime.of(9, 0),
            LocalTime.of(11, 0),
            0,
            "Tham quan di sản Champa",
            true);

    when(dayRepository.findById(DAY_ID)).thenReturn(Optional.of(day));
    when(itemRepository.save(any(ItineraryItem.class)))
        .thenAnswer(
            invocation -> {
              ItineraryItem item = invocation.getArgument(0);
              ReflectionTestUtils.setField(item, "id", UUID.randomUUID());
              ReflectionTestUtils.setField(item, "updatedAt", Instant.now());
              return item;
            });

    ItineraryItemResponse response =
        itineraryService.createAiItem(TRIP_ID, USER_ID, request, true);

    assertThat(response).isNotNull();
    assertThat(response.customStopName()).isEqualTo("Gợi ý AI: Bảo tàng Điêu khắc Chăm");
    assertThat(response.note()).isEqualTo("Tham quan di sản Champa");

    // Kiểm tra lưu DB
    verify(itemRepository).save(any(ItineraryItem.class));

    // W6-TV3-05: Kiểm tra phát thông báo ITINERARY_CHANGED tới các thành viên
    verify(notificationService)
        .notifyTripMembers(
            eq(TRIP_ID),
            eq("Lịch trình đã thay đổi"),
            any(),
            eq("ITINERARY_CHANGED"),
            eq(USER_ID));
  }

  @Test
  @DisplayName("W5-04 Giờ kết thúc trước giờ bắt đầu → ném IllegalArgumentException")
  void createAiItem_invalidTimeRange_throwsException() {
    CreateAiItineraryItemRequest request =
        new CreateAiItineraryItemRequest(
            DAY_ID,
            null,
            "Gợi ý AI: Điểm sai giờ",
            LocalTime.of(15, 0),
            LocalTime.of(13, 0), // sai giờ
            0,
            null,
            true);

    when(dayRepository.findById(DAY_ID)).thenReturn(Optional.of(day));

    assertThatThrownBy(() -> itineraryService.createAiItem(TRIP_ID, USER_ID, request, true))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Giờ kết thúc phải sau giờ bắt đầu");

    verify(itemRepository, never()).save(any());
  }
}

