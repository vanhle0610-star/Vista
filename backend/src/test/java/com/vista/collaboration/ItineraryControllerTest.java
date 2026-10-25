package com.vista.collaboration;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.vista.collaboration.exception.ConflictException;
import com.vista.collaboration.itinerary.CreateItineraryDayRequest;
import com.vista.collaboration.itinerary.CreateItineraryItemRequest;
import com.vista.collaboration.itinerary.ItineraryController;
import com.vista.collaboration.itinerary.ItineraryService;
import com.vista.collaboration.itinerary.UpdateItineraryItemRequest;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.web.GlobalExceptionHandler;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ItineraryController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class ItineraryControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private ItineraryService itineraryService;
  @MockitoBean private CurrentUserProvider currentUserProvider;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private static final UUID TRIP_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");
  private static final UUID DAY_ID = UUID.fromString("00000000-0000-0000-0000-000000000050");
  private static final UUID ITEM_ID = UUID.fromString("00000000-0000-0000-0000-000000000088");
  private static final UUID MEMBER_ID = UUID.fromString("00000000-0000-0000-0000-000000000010");
  private static final UUID NON_MEMBER_ID = UUID.fromString("00000000-0000-0000-0000-000000000999");

  @BeforeEach
  void setUp() {
    objectMapper.registerModule(new JavaTimeModule());
    when(currentUserProvider.getCurrentUserId()).thenReturn(MEMBER_ID);
  }

  @Test
  @DisplayName("POST /api/v1/trips/{tripId}/itinerary/days - Người ngoài chuyến đi bị 403")
  void createDay_whenNonMember_returns403Forbidden() throws Exception {
    when(currentUserProvider.getCurrentUserId()).thenReturn(NON_MEMBER_ID);
    CreateItineraryDayRequest request = new CreateItineraryDayRequest(1, LocalDate.of(2026, 11, 1));

    when(itineraryService.createDay(eq(TRIP_ID), eq(NON_MEMBER_ID), any()))
        .thenThrow(new AccessDeniedException("Bạn không phải thành viên của chuyến đi này"));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/itinerary/days", TRIP_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("POST /api/v1/itinerary/days/{dayId}/items - Người ngoài chuyến đi bị 403")
  void createItem_whenNonMember_returns403Forbidden() throws Exception {
    when(currentUserProvider.getCurrentUserId()).thenReturn(NON_MEMBER_ID);

    CreateItineraryItemRequest request = new CreateItineraryItemRequest();
    request.setCustomStopName("Tham quan Chợ Bến Thành");
    request.setSortOrder(1);
    request.setNote("Tự do chụp ảnh");

    when(itineraryService.createItem(eq(DAY_ID), eq(NON_MEMBER_ID), any()))
        .thenThrow(new AccessDeniedException("Bạn không phải thành viên của chuyến đi này"));

    mockMvc
        .perform(
            post("/api/v1/itinerary/days/{dayId}/items", DAY_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("PATCH /api/v1/itinerary/items/{itemId} - Xung đột optimistic concurrency → 409")
  void updateItem_whenOptimisticConflict_returns409Conflict() throws Exception {
    Instant outdatedTime = Instant.parse("2026-10-19T10:00:00Z");
    UpdateItineraryItemRequest request = new UpdateItineraryItemRequest();
    request.setNote("Lịch trình cập nhật");
    request.setExpectedUpdatedAt(outdatedTime);

    when(itineraryService.updateItem(eq(ITEM_ID), eq(MEMBER_ID), any()))
        .thenThrow(
            new ConflictException(
                "Dữ liệu lịch trình đã bị cập nhật bởi người khác (xung đột phiên bản)"));

    mockMvc
        .perform(
            patch("/api/v1/itinerary/items/{itemId}", ITEM_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.status").value(409));
  }

  @Test
  @DisplayName("DELETE /api/v1/itinerary/items/{itemId} - Thành viên xóa thành công → 204")
  void deleteItem_whenValidMember_returns204NoContent() throws Exception {
    doNothing().when(itineraryService).deleteItem(ITEM_ID, MEMBER_ID);

    mockMvc
        .perform(delete("/api/v1/itinerary/items/{itemId}", ITEM_ID))
        .andExpect(status().isNoContent());
  }
}
