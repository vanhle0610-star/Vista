package com.vista.trip;

import static org.assertj.core.api.Assertions.assertThat;

import com.vista.trip.api.dto.TripResponse;
import com.vista.trip.domain.TripStatus;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class TripResponseStatusTest {

  private final LocalDate today = LocalDate.of(2026, 11, 26);

  @Test
  @DisplayName("Chuyến đi đã qua ngày kết thúc nhưng DB vẫn lưu PLANNING -> trả về COMPLETED")
  void expiredTripWithPlanningStatusResolvesToCompleted() {
    TripStatus resolved =
        TripResponse.resolveEffectiveStatus(
            TripStatus.PLANNING, LocalDate.of(2026, 11, 13), LocalDate.of(2026, 11, 16), today);
    assertThat(resolved).isEqualTo(TripStatus.COMPLETED);
  }

  @Test
  @DisplayName("Chuyến đi đang trong khoảng ngày diễn ra -> trả về ACTIVE")
  void currentTripResolvesToActive() {
    TripStatus resolved =
        TripResponse.resolveEffectiveStatus(
            TripStatus.PLANNING, LocalDate.of(2026, 11, 25), LocalDate.of(2026, 11, 28), today);
    assertThat(resolved).isEqualTo(TripStatus.ACTIVE);
  }

  @Test
  @DisplayName("Chuyến đi chưa tới ngày bắt đầu -> trả về PLANNING")
  void futureTripResolvesToPlanning() {
    TripStatus resolved =
        TripResponse.resolveEffectiveStatus(
            TripStatus.PLANNING, LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 4), today);
    assertThat(resolved).isEqualTo(TripStatus.PLANNING);
  }

  @Test
  @DisplayName("Chuyến đi đã hủy luôn giữ nguyên CANCELLED bất kể ngày")
  void cancelledTripAlwaysRemainsCancelled() {
    TripStatus resolved =
        TripResponse.resolveEffectiveStatus(
            TripStatus.CANCELLED, LocalDate.of(2026, 11, 25), LocalDate.of(2026, 11, 28), today);
    assertThat(resolved).isEqualTo(TripStatus.CANCELLED);
  }
}
