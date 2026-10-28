package com.vista.itinerary.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import com.vista.itinerary.api.dto.ItineraryResponse;
import com.vista.itinerary.api.dto.MergeItineraryRequest;
import com.vista.itinerary.application.ItineraryService;
import com.vista.trip.application.TripAccessService;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ItineraryController.class)
@Import({GlobalExceptionHandler.class, SecurityConfiguration.class})
class ItineraryControllerTest {
  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @MockitoBean private ItineraryService itineraryService;
  @MockitoBean private TripAccessService tripAccessService;
  @MockitoBean private CurrentUserProvider currentUserProvider;

  private UUID tripId;
  private UUID userId;

  @BeforeEach
  void setUp() {
    tripId = UUID.randomUUID();
    userId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(userId);
  }

  @Test
  void guestCannotReadItinerary() throws Exception {
    mockMvc.perform(get("/api/v1/trips/{tripId}/itinerary", tripId)).andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser
  void outsiderCannotMergeItinerary() throws Exception {
    doThrow(new AccessDeniedException("not a trip member"))
        .when(tripAccessService)
        .requireMember(tripId, userId);

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/itinerary/merge", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRequest())))
        .andExpect(status().isForbidden());

    verify(itineraryService, never()).merge(any(), any(), any());
  }

  @Test
  @WithMockUser
  void memberCanMergeWithoutDeletingUnspecifiedItems() throws Exception {
    when(itineraryService.merge(eq(tripId), eq(userId), any()))
        .thenReturn(new ItineraryResponse(tripId, List.of()));

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/itinerary/merge", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRequest())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.tripId").value(tripId.toString()));

    verify(itineraryService).merge(eq(tripId), eq(userId), any());
  }

  private MergeItineraryRequest validRequest() {
    return new MergeItineraryRequest(
        List.of(
            new MergeItineraryRequest.ItineraryDayRequest(
                1,
                List.of(
                    new MergeItineraryRequest.ItineraryItemRequest(
                        null,
                        "Dạo phố cổ",
                        LocalTime.of(8, 0),
                        LocalTime.of(9, 30),
                        0,
                        "Hoạt động offline đã được người dùng chấp nhận",
                        "AI_OFFLINE")))));
  }
}
