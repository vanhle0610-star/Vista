package com.vista.location;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import com.vista.location.api.LocationShareController;
import com.vista.location.api.dto.LocationShareResponse;
import com.vista.location.api.dto.StartLocationShareRequest;
import com.vista.location.api.dto.UpdateLocationShareRequest;
import com.vista.location.application.LocationShareService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(LocationShareController.class)
@Import({GlobalExceptionHandler.class, SecurityConfiguration.class})
@WithMockUser
class LocationShareControllerTest {

  @Autowired private MockMvc mockMvc;
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @MockitoBean private LocationShareService locationShareService;
  @MockitoBean private CurrentUserProvider currentUserProvider;

  private final UUID tripId = UUID.randomUUID();
  private final UUID userId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    when(currentUserProvider.getCurrentUserId()).thenReturn(userId);
  }

  @Test
  @DisplayName("PUT /location-shares/me starts location sharing with consent and future expiry")
  void startShare_validRequest_returns200() throws Exception {
    Instant future = Instant.now().plus(4, ChronoUnit.HOURS);
    var request =
        new StartLocationShareRequest(
            true, future, new BigDecimal("16.0544"), new BigDecimal("108.2022"));

    var response =
        new LocationShareResponse(
            UUID.randomUUID(),
            tripId,
            userId,
            "Quang Tuấn",
            "https://avatar.com/1.png",
            new BigDecimal("16.0544"),
            new BigDecimal("108.2022"),
            Instant.now(),
            future,
            Instant.now(),
            true);

    when(locationShareService.startShare(
            eq(tripId), eq(userId), any(StartLocationShareRequest.class)))
        .thenReturn(response);

    mockMvc
        .perform(
            put("/api/v1/trips/{tripId}/location-shares/me", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.tripId").value(tripId.toString()))
        .andExpect(jsonPath("$.userId").value(userId.toString()))
        .andExpect(jsonPath("$.enabled").value(true));
  }

  @Test
  @DisplayName("PATCH /location-shares/me updates latest GPS coordinates")
  void updateLocation_validRequest_returns200() throws Exception {
    Instant sessionStarted = Instant.now().minus(10, ChronoUnit.MINUTES);
    var request =
        new UpdateLocationShareRequest(
            sessionStarted, new BigDecimal("16.0550"), new BigDecimal("108.2030"));

    var response =
        new LocationShareResponse(
            UUID.randomUUID(),
            tripId,
            userId,
            "Quang Tuấn",
            "https://avatar.com/1.png",
            new BigDecimal("16.0550"),
            new BigDecimal("108.2030"),
            sessionStarted,
            Instant.now().plus(2, ChronoUnit.HOURS),
            Instant.now(),
            true);

    when(locationShareService.updateLocation(
            eq(tripId), eq(userId), any(UpdateLocationShareRequest.class)))
        .thenReturn(response);

    mockMvc
        .perform(
            patch("/api/v1/trips/{tripId}/location-shares/me", tripId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.latitude").value(16.0550))
        .andExpect(jsonPath("$.longitude").value(108.2030));
  }

  @Test
  @DisplayName("DELETE /location-shares/me stops location sharing and returns 204")
  void stopShare_returns204() throws Exception {
    doNothing().when(locationShareService).stopShare(tripId, userId);

    mockMvc
        .perform(delete("/api/v1/trips/{tripId}/location-shares/me", tripId))
        .andExpect(status().isNoContent());
  }

  @Test
  @DisplayName("GET /location-shares returns active member shares in trip")
  void getActiveShares_returnsList() throws Exception {
    var share =
        new LocationShareResponse(
            UUID.randomUUID(),
            tripId,
            userId,
            "Quang Tuấn",
            null,
            new BigDecimal("16.0544"),
            new BigDecimal("108.2022"),
            Instant.now(),
            Instant.now().plus(2, ChronoUnit.HOURS),
            Instant.now(),
            true);

    when(locationShareService.getActiveShares(eq(tripId), eq(userId), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(share)));

    mockMvc
        .perform(get("/api/v1/trips/{tripId}/location-shares", tripId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].userId").value(userId.toString()))
        .andExpect(jsonPath("$.content[0].displayName").value("Quang Tuấn"));
  }
}
