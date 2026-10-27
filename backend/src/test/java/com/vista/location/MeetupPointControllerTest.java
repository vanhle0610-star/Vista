package com.vista.location;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import com.vista.location.api.MeetupPointController;
import com.vista.location.api.dto.CreateMeetupPointRequest;
import com.vista.location.api.dto.MeetupPointResponse;
import com.vista.location.application.MeetupPointService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(MeetupPointController.class)
@Import({GlobalExceptionHandler.class, SecurityConfiguration.class})
@WithMockUser
class MeetupPointControllerTest {

  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @MockitoBean private MeetupPointService meetupPointService;
  @MockitoBean private CurrentUserProvider currentUserProvider;

  private final UUID tripId = UUID.randomUUID();
  private final UUID userId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    when(currentUserProvider.getCurrentUserId()).thenReturn(userId);
  }

  @Test
  @DisplayName("POST /meetup-points creates a new meetup point")
  void createMeetupPoint_valid_returns201() throws Exception {
    var request =
        new CreateMeetupPointRequest(
            "Cổng Chợ Bến Thành",
            new BigDecimal("10.7725"),
            new BigDecimal("106.6980"),
            Instant.now(),
            "Hẹn gặp ở cổng Nam lúc 18h");

    var response =
        new MeetupPointResponse(
            UUID.randomUUID(),
            tripId,
            userId,
            "Quang Tuấn",
            "Cổng Chợ Bến Thành",
            new BigDecimal("10.7725"),
            new BigDecimal("106.6980"),
            Instant.now(),
            "Hẹn gặp ở cổng Nam lúc 18h",
            Instant.now(),
            Instant.now());

    when(meetupPointService.createMeetupPoint(
            eq(tripId), eq(userId), any(CreateMeetupPointRequest.class)))
        .thenReturn(response);

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/meetup-points", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.label").value("Cổng Chợ Bến Thành"));
  }

  @Test
  @DisplayName("GET /meetup-points returns list of meetup points")
  void getMeetupPoints_returnsList() throws Exception {
    var point =
        new MeetupPointResponse(
            UUID.randomUUID(),
            tripId,
            userId,
            "Quang Tuấn",
            "Cổng Chợ Bến Thành",
            new BigDecimal("10.7725"),
            new BigDecimal("106.6980"),
            Instant.now(),
            null,
            Instant.now(),
            Instant.now());

    when(meetupPointService.getMeetupPoints(tripId, userId)).thenReturn(List.of(point));

    mockMvc
        .perform(get("/api/v1/trips/{tripId}/meetup-points", tripId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].label").value("Cổng Chợ Bến Thành"));
  }

  @Test
  @DisplayName("DELETE /meetup-points/{id} deletes point and returns 204")
  void deleteMeetupPoint_returns204() throws Exception {
    UUID meetupId = UUID.randomUUID();
    doNothing().when(meetupPointService).deleteMeetupPoint(tripId, meetupId, userId);

    mockMvc
        .perform(delete("/api/v1/trips/{tripId}/meetup-points/{meetupId}", tripId, meetupId))
        .andExpect(status().isNoContent());
  }
}
