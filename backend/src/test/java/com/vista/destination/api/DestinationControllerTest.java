package com.vista.destination.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.destination.api.dto.DestinationDetailDto;
import com.vista.destination.api.dto.DestinationPageDto;
import com.vista.destination.api.dto.DestinationSummaryDto;
import com.vista.destination.service.DestinationNotFoundException;
import com.vista.destination.service.DestinationService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(DestinationController.class)
@Import(SecurityConfiguration.class)
class DestinationControllerTest {

  @Autowired MockMvc mvc;

  @MockitoBean DestinationService destinationService;
  @MockitoBean CurrentUserProvider currentUserProvider;

  @Test
  void listDestinationsReturnsPublishedDestinations() throws Exception {
    UUID id = UUID.randomUUID();
    var summary =
        new DestinationSummaryDto(
            id,
            "Cầu Rồng Đà Nẵng",
            "Đà Nẵng",
            "Cảnh quan & Văn hóa",
            "destinations/danang/cau-rong.jpg",
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            16.0611,
            108.2272,
            "PUBLISHED");

    var pageDto = new DestinationPageDto(List.of(summary), 0, 20, 1L);

    when(destinationService.searchPublished(any(), any(), any(), any(), anyInt(), anyInt()))
        .thenReturn(pageDto);

    mvc.perform(get("/api/v1/destinations").param("province", "Đà Nẵng"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page").value(0))
        .andExpect(jsonPath("$.size").value(20))
        .andExpect(jsonPath("$.total").value(1))
        .andExpect(jsonPath("$.items[0].name").value("Cầu Rồng Đà Nẵng"))
        .andExpect(jsonPath("$.items[0].province").value("Đà Nẵng"))
        .andExpect(jsonPath("$.items[0].status").value("PUBLISHED"));
  }

  @Test
  void getDestinationDetailReturnsDetailWhenFound() throws Exception {
    UUID id = UUID.randomUUID();
    var detail =
        new DestinationDetailDto(
            id,
            "Bà Nà Hills",
            "Đà Nẵng",
            "Khu vui chơi & Nghỉ dưỡng",
            "destinations/danang/bana-hills.jpg",
            BigDecimal.valueOf(900000),
            BigDecimal.valueOf(1250000),
            15.9958,
            107.9965,
            "PUBLISHED",
            "Quần thể du lịch đỉnh núi Chúa",
            Map.of("mon", "07:00-22:00"),
            "https://banahills.sunworld.vn",
            Instant.parse("2026-10-15T00:00:00Z"),
            false);

    when(destinationService.getPublishedDetail(eq(id), any())).thenReturn(detail);

    mvc.perform(get("/api/v1/destinations/{id}", id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(id.toString()))
        .andExpect(jsonPath("$.name").value("Bà Nà Hills"))
        .andExpect(jsonPath("$.priceMin").value(900000))
        .andExpect(jsonPath("$.status").value("PUBLISHED"))
        .andExpect(jsonPath("$.openingHours.mon").value("07:00-22:00"));
  }

  @Test
  void getDestinationDetailReturns404WhenNotFoundOrUnpublished() throws Exception {
    UUID id = UUID.randomUUID();
    when(destinationService.getPublishedDetail(eq(id), any()))
        .thenThrow(new DestinationNotFoundException("Không tìm thấy"));

    mvc.perform(get("/api/v1/destinations/{id}", id))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.status").value(404))
        .andExpect(jsonPath("$.code").value("DESTINATION_NOT_FOUND"));
  }

  @Test
  @WithMockUser
  void addFavoriteReturns204NoContent() throws Exception {
    UUID destId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(userId);
    doNothing().when(destinationService).addFavorite(destId, userId);

    mvc.perform(put("/api/v1/destinations/{id}/favorite", destId).with(csrf()))
        .andExpect(status().isNoContent());

    mvc.perform(post("/api/v1/destinations/{id}/favorite", destId).with(csrf()))
        .andExpect(status().isNoContent());
  }

  @Test
  @WithMockUser
  void removeFavoriteReturns204NoContent() throws Exception {
    UUID destId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(userId);
    doNothing().when(destinationService).removeFavorite(destId, userId);

    mvc.perform(delete("/api/v1/destinations/{id}/favorite", destId).with(csrf()))
        .andExpect(status().isNoContent());
  }

  @Test
  @WithMockUser
  void getFavoritesReturnsListOfUserFavorites() throws Exception {
    UUID userId = UUID.randomUUID();
    UUID destId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(userId);

    var fav =
        new DestinationSummaryDto(
            destId,
            "Phố cổ Hội An",
            "Quảng Nam",
            "Di sản & Văn hóa",
            "destinations/quangnam/hoi-an.jpg",
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            15.8801,
            108.3380,
            "PUBLISHED");

    when(destinationService.getFavorites(userId)).thenReturn(List.of(fav));

    mvc.perform(get("/api/v1/destinations/favorites"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].name").value("Phố cổ Hội An"))
        .andExpect(jsonPath("$[0].province").value("Quảng Nam"));
  }

  @Test
  @WithMockUser
  void recordViewAndGetHistoryWorkSuccessfully() throws Exception {
    UUID destId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(userId);
    doNothing().when(destinationService).recordView(destId, userId);

    mvc.perform(post("/api/v1/destinations/{id}/history", destId).with(csrf()))
        .andExpect(status().isNoContent());

    var summary =
        new DestinationSummaryDto(
            destId,
            "Hồ Gươm",
            "Hà Nội",
            "Di tích & Cảnh quan",
            "destinations/hanoi/ho-guom.jpg",
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            21.0285,
            105.8542,
            "PUBLISHED");

    when(destinationService.getRecentHistory(userId, 10)).thenReturn(List.of(summary));

    mvc.perform(get("/api/v1/destinations/history").param("limit", "10"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].name").value("Hồ Gươm"))
        .andExpect(jsonPath("$[0].province").value("Hà Nội"));
  }

  @Test
  @WithMockUser
  void addFavoriteReturns404WhenDestinationNotFound() throws Exception {
    UUID destId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(userId);
    doThrow(new DestinationNotFoundException("Không tìm thấy địa điểm: " + destId))
        .when(destinationService)
        .addFavorite(destId, userId);

    mvc.perform(put("/api/v1/destinations/{id}/favorite", destId).with(csrf()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.status").value(404))
        .andExpect(jsonPath("$.code").value("DESTINATION_NOT_FOUND"));
  }
}
