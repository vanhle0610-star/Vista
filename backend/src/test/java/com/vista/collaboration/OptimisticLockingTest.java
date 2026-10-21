package com.vista.collaboration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.vista.collaboration.exception.ConflictException;
import com.vista.collaboration.itinerary.ItineraryDay;
import com.vista.collaboration.itinerary.ItineraryDayRepository;
import com.vista.collaboration.itinerary.ItineraryItem;
import com.vista.collaboration.itinerary.ItineraryItemRepository;
import com.vista.collaboration.itinerary.ItineraryItemResponse;
import com.vista.collaboration.itinerary.ItineraryService;
import com.vista.collaboration.itinerary.UpdateItineraryItemRequest;
import com.vista.trip.application.TripAccessService;
import java.time.Instant;
import java.time.LocalDate;
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
 * W4-TV3-01: Mô phỏng 2 người sửa cùng 1 điểm dừng.
 * Người lưu sau (dùng expected_updated_at cũ) → nhận ConflictException 409.
 * Dữ liệu của người lưu trước không bị mất.
 */
@ExtendWith(MockitoExtension.class)
class OptimisticLockingTest {

  @Mock private ItineraryDayRepository dayRepository;
  @Mock private ItineraryItemRepository itemRepository;
  @Mock private TripAccessService tripAccessService;

  @InjectMocks private ItineraryService itineraryService;

  private static final UUID TRIP_ID = UUID.randomUUID();
  private static final UUID USER_A = UUID.randomUUID();
  private static final UUID USER_B = UUID.randomUUID();
  private static final UUID ITEM_ID = UUID.randomUUID();
  private static final UUID DAY_ID = UUID.randomUUID();

  private ItineraryDay day;
  private ItineraryItem item;
  private Instant originalUpdatedAt;

  @BeforeEach
  void setUp() {
    day = new ItineraryDay(TRIP_ID, 1, LocalDate.now());
    ReflectionTestUtils.setField(day, "id", DAY_ID);

    originalUpdatedAt = Instant.now().minusSeconds(60);
    item = new ItineraryItem(day, null, "Stop gốc", null, null, 0, "ghi chú gốc", USER_A);
    ReflectionTestUtils.setField(item, "id", ITEM_ID);
    ReflectionTestUtils.setField(item, "updatedAt", originalUpdatedAt);
    ReflectionTestUtils.setField(item, "version", 1L);
  }

  @Test
  @DisplayName("W4-01 Người lưu trước thành công, người lưu sau với updatedAt cũ → 409")
  void secondWriterWithStaleTimestamp_throwsConflict() {
    // User A đã lưu, updatedAt của item đã tăng lên
    Instant afterUserASaved = originalUpdatedAt.plusSeconds(5);
    ReflectionTestUtils.setField(item, "updatedAt", afterUserASaved);
    ReflectionTestUtils.setField(item, "note", "Note của User A"); // User A đã lưu thành công

    when(itemRepository.findById(ITEM_ID)).thenReturn(Optional.of(item));

    // User B dùng expected_updated_at = giá trị cũ (trước khi User A lưu) → conflict
    UpdateItineraryItemRequest requestB = new UpdateItineraryItemRequest();
    requestB.setNote("Note của User B — bị từ chối");
    requestB.setExpectedUpdatedAt(originalUpdatedAt); // stale!

    assertThatThrownBy(() -> itineraryService.updateItem(ITEM_ID, USER_B, requestB))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("xung đột");
  }

  @Test
  @DisplayName("W4-01 Dữ liệu User A không bị mất sau khi User B bị từ chối")
  void firstWriterDataNotLost_afterSecondWriterConflict() {
    // Sau khi User A lưu thành công
    Instant afterUserASaved = originalUpdatedAt.plusSeconds(5);
    ReflectionTestUtils.setField(item, "updatedAt", afterUserASaved);
    ReflectionTestUtils.setField(item, "note", "Note của User A");

    when(itemRepository.findById(ITEM_ID)).thenReturn(Optional.of(item));

    // User B cố ghi đè với stale timestamp → bị reject
    UpdateItineraryItemRequest requestB = new UpdateItineraryItemRequest();
    requestB.setNote("Ghi đè của User B");
    requestB.setExpectedUpdatedAt(originalUpdatedAt);

    try {
      itineraryService.updateItem(ITEM_ID, USER_B, requestB);
    } catch (ConflictException ignored) {
      // expected
    }

    // Dữ liệu User A vẫn còn nguyên
    assertThat(item.getNote()).isEqualTo("Note của User A");
    assertThat(item.getUpdatedAt()).isEqualTo(afterUserASaved);
  }

  @Test
  @DisplayName("W4-01 User A dùng expectedUpdatedAt đúng → lưu thành công")
  void firstWriterWithCorrectTimestamp_succeeds() {
    when(itemRepository.findById(ITEM_ID)).thenReturn(Optional.of(item));
    when(itemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    UpdateItineraryItemRequest requestA = new UpdateItineraryItemRequest();
    requestA.setNote("Note User A");
    requestA.setExpectedUpdatedAt(originalUpdatedAt); // đúng

    ItineraryItemResponse result = itineraryService.updateItem(ITEM_ID, USER_A, requestA);

    assertThat(result.note()).isEqualTo("Note User A");
  }

  @Test
  @DisplayName("W4-01 Không gửi expectedUpdatedAt (null) → luôn lưu được — không chặn")
  void noExpectedTimestamp_alwaysSucceeds() {
    when(itemRepository.findById(ITEM_ID)).thenReturn(Optional.of(item));
    when(itemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    UpdateItineraryItemRequest request = new UpdateItineraryItemRequest();
    request.setNote("Cập nhật không có kiểm tra");
    request.setExpectedUpdatedAt(null); // không kiểm tra

    ItineraryItemResponse result = itineraryService.updateItem(ITEM_ID, USER_A, request);

    assertThat(result.note()).isEqualTo("Cập nhật không có kiểm tra");
  }

  @Test
  @DisplayName("W4-01 updated_by được lưu là người sửa cuối")
  void updatedBy_isSetToCurrentUser() {
    when(itemRepository.findById(ITEM_ID)).thenReturn(Optional.of(item));
    when(itemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    UpdateItineraryItemRequest request = new UpdateItineraryItemRequest();
    request.setNote("Sửa bởi User B");

    itineraryService.updateItem(ITEM_ID, USER_B, request);

    assertThat(item.getUpdatedBy()).isEqualTo(USER_B);
  }
}
