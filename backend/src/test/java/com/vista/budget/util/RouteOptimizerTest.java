package com.vista.budget.util;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RouteOptimizerTest {

  // Tọa độ thực tế các điểm đến tại Đà Nẵng (lấy từ CSDL VISTA)
  private final RouteOptimizer.DestinationPoint hotelMyKhe =
      new RouteOptimizer.DestinationPoint(
          UUID.randomUUID(), "Khách sạn Biển Mỹ Khê", 16.064500, 108.246800);

  private final RouteOptimizer.DestinationPoint cauRong =
      new RouteOptimizer.DestinationPoint(
          UUID.randomUUID(), "Cầu Rồng Đà Nẵng", 16.061100, 108.227200);

  private final RouteOptimizer.DestinationPoint sonTra =
      new RouteOptimizer.DestinationPoint(
          UUID.randomUUID(), "Bán đảo Sơn Trà & Chùa Linh Ứng", 16.107500, 108.277800);

  private final RouteOptimizer.DestinationPoint nguHanhSon =
      new RouteOptimizer.DestinationPoint(
          UUID.randomUUID(), "Danh thắng Ngũ Hành Sơn", 16.004800, 108.261800);

  @Test
  @DisplayName("Tính khoảng cách Haversine giữa Biển Mỹ Khê và Cầu Rồng (~2.1 km)")
  void testHaversineDistance() {
    double distance =
        RouteOptimizer.calculateHaversineDistanceKm(
            hotelMyKhe.latitude(), hotelMyKhe.longitude(),
            cauRong.latitude(), cauRong.longitude());

    assertTrue(
        distance > 2.0 && distance < 2.5,
        "Khoảng cách thực tế giữa Mỹ Khê và Cầu Rồng khoảng 2.1 - 2.2 km");
  }

  @Test
  @DisplayName("Tối ưu hóa thứ tự 3 địa điểm xuất phát từ Biển Mỹ Khê")
  void testOptimizeRouteDaNang() {
    // Thứ tự đầu vào ngẫu nhiên
    List<RouteOptimizer.DestinationPoint> destinations = List.of(nguHanhSon, sonTra, cauRong);

    RouteOptimizer.OptimizationResult result =
        RouteOptimizer.optimizeRoute(hotelMyKhe, destinations);

    assertNotNull(result);
    assertEquals(3, result.orderedRoute().size());
    assertTrue(result.totalDistanceKm() > 0);
    assertTrue(result.estimatedTaxiCostVnd() > 0);

    // Tính toán lộ trình zig-zag xấu nhất (Mỹ Khê -> Ngũ Hành Sơn [Nam] -> Sơn Trà [Bắc] -> Cầu
    // Rồng [Trung tâm])
    double badZigZagDistance =
        RouteOptimizer.calculateHaversineDistanceKm(
                hotelMyKhe.latitude(),
                hotelMyKhe.longitude(),
                nguHanhSon.latitude(),
                nguHanhSon.longitude())
            + RouteOptimizer.calculateHaversineDistanceKm(
                nguHanhSon.latitude(),
                nguHanhSon.longitude(),
                sonTra.latitude(),
                sonTra.longitude())
            + RouteOptimizer.calculateHaversineDistanceKm(
                sonTra.latitude(), sonTra.longitude(), cauRong.latitude(), cauRong.longitude());

    // Đảm bảo lộ trình do thuật toán tìm ra ngắn hơn rõ rệt so với lộ trình zig-zag
    assertTrue(
        result.totalDistanceKm() < badZigZagDistance,
        String.format(
            "Lộ trình tối ưu (%.2f km) phải ngắn hơn lộ trình zig-zag (%.2f km)",
            result.totalDistanceKm(), badZigZagDistance));
  }

  @Test
  @DisplayName("Khi danh sách địa điểm rỗng thì trả về kết quả rỗng và 0 km")
  void testEmptyDestinations() {
    RouteOptimizer.OptimizationResult result = RouteOptimizer.optimizeRoute(hotelMyKhe, List.of());
    assertTrue(result.orderedRoute().isEmpty());
    assertEquals(0.0, result.totalDistanceKm());
    assertEquals(0.0, result.estimatedTaxiCostVnd());
  }
}
