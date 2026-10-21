package com.vista.collaboration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.vista.collaboration.exception.ConflictException;
import com.vista.collaboration.exception.ResourceNotFoundException;
import com.vista.collaboration.itinerary.ItineraryDay;
import com.vista.collaboration.itinerary.ItineraryDayRepository;
import com.vista.collaboration.itinerary.ItineraryItem;
import com.vista.collaboration.itinerary.ItineraryItemRepository;
import com.vista.collaboration.itinerary.ItineraryItemResponse;
import com.vista.collaboration.itinerary.ItineraryService;
import com.vista.collaboration.itinerary.ReorderItemsRequest;
import com.vista.trip.application.TripAccessService;
import java.time.LocalDate;
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

@ExtendWith(MockitoExtension.class)
class ItineraryReorderTest {

  @Mock private ItineraryDayRepository dayRepository;
  @Mock private ItineraryItemRepository itemRepository;
  @Mock private TripAccessService tripAccessService;

  @InjectMocks private ItineraryService itineraryService;

  private static final UUID TRIP_ID = UUID.randomUUID();
  private static final UUID USER_ID = UUID.randomUUID();
  private static final UUID DAY_ID = UUID.randomUUID();

  private ItineraryDay day;
  private UUID itemId1, itemId2, itemId3;
  private ItineraryItem item1, item2, item3;

  @BeforeEach
  void setUp() {
    day = new ItineraryDay(TRIP_ID, 1, LocalDate.now());
    ReflectionTestUtils.setField(day, "id", DAY_ID);

    itemId1 = UUID.randomUUID();
    itemId2 = UUID.randomUUID();
    itemId3 = UUID.randomUUID();

    item1 = new ItineraryItem(day, null, "Stop A", null, null, 0, null, USER_ID);
    item2 = new ItineraryItem(day, null, "Stop B", null, null, 1, null, USER_ID);
    item3 = new ItineraryItem(day, null, "Stop C", null, null, 2, null, USER_ID);
    ReflectionTestUtils.setField(item1, "id", itemId1);
    ReflectionTestUtils.setField(item2, "id", itemId2);
    ReflectionTestUtils.setField(item3, "id", itemId3);
  }

  @Test
  @DisplayName("W3-03 reorder - Đảo thứ tự [B, C, A] → sort_order được gán lại 0,1,2")
  void reorder_validList_assignsNewSortOrder() {
    when(dayRepository.findById(DAY_ID)).thenReturn(Optional.of(day));
    // tripAccessService.requireMember là void, mặc định không throw
    when(itemRepository.findById(itemId2)).thenReturn(Optional.of(item2));
    when(itemRepository.findById(itemId3)).thenReturn(Optional.of(item3));
    when(itemRepository.findById(itemId1)).thenReturn(Optional.of(item1));
    when(itemRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    // Trả về theo thứ tự mới sau khi save
    when(itemRepository.findByDayIdOrderBySortOrderAsc(DAY_ID))
        .thenReturn(List.of(item2, item3, item1));

    ReorderItemsRequest request = new ReorderItemsRequest(List.of(itemId2, itemId3, itemId1));
    List<ItineraryItemResponse> result = itineraryService.reorderItems(DAY_ID, USER_ID, request);

    // Kiểm tra sort_order đã được gán
    assertThat(item2.getSortOrder()).isEqualTo(0);
    assertThat(item3.getSortOrder()).isEqualTo(1);
    assertThat(item1.getSortOrder()).isEqualTo(2);

    // Kết quả trả về đúng thứ tự
    assertThat(result).hasSize(3);
    assertThat(result.get(0).customStopName()).isEqualTo("Stop B");
    assertThat(result.get(1).customStopName()).isEqualTo("Stop C");
    assertThat(result.get(2).customStopName()).isEqualTo("Stop A");
  }

  @Test
  @DisplayName("W3-03 reorder - Item thuộc ngày khác → ConflictException")
  void reorder_itemFromDifferentDay_throwsConflict() {
    UUID otherDayId = UUID.randomUUID();
    ItineraryDay otherDay = new ItineraryDay(TRIP_ID, 2, LocalDate.now().plusDays(1));
    ReflectionTestUtils.setField(otherDay, "id", otherDayId);

    ItineraryItem foreignItem = new ItineraryItem(otherDay, null, "Other", null, null, 0, null, USER_ID);
    ReflectionTestUtils.setField(foreignItem, "id", itemId1);

    when(dayRepository.findById(DAY_ID)).thenReturn(Optional.of(day));
    when(itemRepository.findById(itemId1)).thenReturn(Optional.of(foreignItem));

    ReorderItemsRequest request = new ReorderItemsRequest(List.of(itemId1));

    assertThatThrownBy(() -> itineraryService.reorderItems(DAY_ID, USER_ID, request))
        .isInstanceOf(ConflictException.class)
        .hasMessageContaining("không thuộc ngày");
  }

  @Test
  @DisplayName("W3-03 reorder - Item không tồn tại → ResourceNotFoundException")
  void reorder_unknownItemId_throwsNotFound() {
    UUID fakeId = UUID.randomUUID();
    when(dayRepository.findById(DAY_ID)).thenReturn(Optional.of(day));
    when(itemRepository.findById(fakeId)).thenReturn(Optional.empty());

    ReorderItemsRequest request = new ReorderItemsRequest(List.of(fakeId));

    assertThatThrownBy(() -> itineraryService.reorderItems(DAY_ID, USER_ID, request))
        .isInstanceOf(ResourceNotFoundException.class)
        .hasMessageContaining("Không tìm thấy điểm dừng");
  }

  @Test
  @DisplayName("W3-03 reorder - Sau khi sắp xếp, GET lại trả đúng thứ tự")
  void reorder_thenGetDays_returnsCorrectOrder() {
    // Sắp xếp [C, A, B]
    when(dayRepository.findById(DAY_ID)).thenReturn(Optional.of(day));
    when(itemRepository.findById(itemId3)).thenReturn(Optional.of(item3));
    when(itemRepository.findById(itemId1)).thenReturn(Optional.of(item1));
    when(itemRepository.findById(itemId2)).thenReturn(Optional.of(item2));
    when(itemRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    when(itemRepository.findByDayIdOrderBySortOrderAsc(DAY_ID))
        .thenReturn(List.of(item3, item1, item2));

    ReorderItemsRequest request = new ReorderItemsRequest(List.of(itemId3, itemId1, itemId2));
    List<ItineraryItemResponse> result = itineraryService.reorderItems(DAY_ID, USER_ID, request);

    // Thứ tự sort_order sau khi reorder
    assertThat(item3.getSortOrder()).isEqualTo(0);
    assertThat(item1.getSortOrder()).isEqualTo(1);
    assertThat(item2.getSortOrder()).isEqualTo(2);

    // GET lại trả đúng thứ tự: C, A, B
    assertThat(result.get(0).customStopName()).isEqualTo("Stop C");
    assertThat(result.get(1).customStopName()).isEqualTo("Stop A");
    assertThat(result.get(2).customStopName()).isEqualTo("Stop B");
  }
}
