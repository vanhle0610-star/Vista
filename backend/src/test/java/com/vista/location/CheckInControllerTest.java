package com.vista.location;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import com.vista.location.api.CheckInController;
import com.vista.location.api.dto.CheckInResponse;
import com.vista.location.api.dto.CreateCheckInRequest;
import com.vista.location.application.CheckInService;
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

@WebMvcTest(CheckInController.class)
@Import({GlobalExceptionHandler.class, SecurityConfiguration.class})
@WithMockUser
class CheckInControllerTest {

  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @MockitoBean private CheckInService checkInService;
  @MockitoBean private CurrentUserProvider currentUserProvider;

  private final UUID tripId = UUID.randomUUID();
  private final UUID userId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    when(currentUserProvider.getCurrentUserId()).thenReturn(userId);
  }

  @Test
  @DisplayName("POST /check-ins creates check-in record")
  void createCheckIn_valid_returns201() throws Exception {
    var request =
        new CreateCheckInRequest(null, new BigDecimal("10.7725"), new BigDecimal("106.6980"));

    var response =
        new CheckInResponse(
            UUID.randomUUID(),
            tripId,
            null,
            userId,
            "Quang Tuấn",
            null,
            new BigDecimal("10.7725"),
            new BigDecimal("106.6980"),
            Instant.now());

    when(checkInService.createCheckIn(eq(tripId), eq(userId), any(CreateCheckInRequest.class)))
        .thenReturn(response);

    mockMvc
        .perform(
            post("/api/v1/trips/{tripId}/check-ins", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.userId").value(userId.toString()));
  }

  @Test
  @DisplayName("GET /check-ins returns trip check-in history")
  void getCheckIns_returnsList() throws Exception {
    var checkIn =
        new CheckInResponse(
            UUID.randomUUID(),
            tripId,
            null,
            userId,
            "Quang Tuấn",
            null,
            new BigDecimal("10.7725"),
            new BigDecimal("106.6980"),
            Instant.now());

    when(checkInService.getCheckIns(tripId, userId)).thenReturn(List.of(checkIn));

    mockMvc
        .perform(get("/api/v1/trips/{tripId}/check-ins", tripId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].userId").value(userId.toString()));
  }
}
