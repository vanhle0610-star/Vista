package com.vista.budget.util;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Tiện ích tối ưu hóa lộ trình di chuyển (Route Optimization) cho chuyến đi. Áp dụng: 1. Công thức
 * Haversine tính toán khoảng cách mặt cầu Trái Đất giữa các tọa độ GPS (km). 2. Giải thuật Nearest
 * Neighbor (TSP Heuristic) sắp xếp chuỗi điểm dừng ngắn nhất từ điểm xuất phát. Giúp người dùng
 * loại bỏ các cung đường zig-zag, tiết kiệm tối đa thời gian và chi phí di chuyển (taxi/xăng).
 */
public final class RouteOptimizer {

  private static final double EARTH_RADIUS_KM = 6371.0;

  private RouteOptimizer() {}

  public record DestinationPoint(UUID id, String name, double latitude, double longitude) {
    public DestinationPoint {
      Objects.requireNonNull(name, "name must not be null");
    }
  }

  public record OptimizationResult(
      List<DestinationPoint> orderedRoute, double totalDistanceKm, double estimatedTaxiCostVnd) {}

  /**
   * Tính khoảng cách hình học giữa 2 tọa độ địa lý bằng công thức Haversine.
   *
   * @param lat1 vĩ độ điểm 1
   * @param lon1 kinh độ điểm 1
   * @param lat2 vĩ độ điểm 2
   * @param lon2 kinh độ điểm 2
   * @return khoảng cách tính theo Kilomet (km)
   */
  public static double calculateHaversineDistanceKm(
      double lat1, double lon1, double lat2, double lon2) {
    double dLat = Math.toRadians(lat2 - lat1);
    double dLon = Math.toRadians(lon2 - lon1);

    double a =
        Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0)
            + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2.0)
                * Math.sin(dLon / 2.0);

    double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
    return EARTH_RADIUS_KM * c;
  }

  /**
   * Sắp xếp danh sách điểm đến theo thứ tự tối ưu quãng đường di chuyển ngắn nhất (Nearest
   * Neighbor).
   *
   * @param startPoint điểm xuất phát (ví dụ: Khách sạn hoặc Sân bay)
   * @param destinations danh sách các điểm tham quan người dùng đã chọn
   * @return kết quả lộ trình tối ưu kèm tổng khoảng cách và chi phí taxi ước tính (15.000đ/km)
   */
  public static OptimizationResult optimizeRoute(
      DestinationPoint startPoint, List<DestinationPoint> destinations) {
    if (destinations == null || destinations.isEmpty()) {
      return new OptimizationResult(Collections.emptyList(), 0.0, 0.0);
    }

    List<DestinationPoint> unvisited = new ArrayList<>(destinations);
    List<DestinationPoint> orderedRoute = new ArrayList<>();
    double totalDistanceKm = 0.0;

    DestinationPoint current = startPoint;

    while (!unvisited.isEmpty()) {
      DestinationPoint nearest = null;
      double minDistance = Double.MAX_VALUE;

      for (DestinationPoint candidate : unvisited) {
        double dist =
            calculateHaversineDistanceKm(
                current.latitude(),
                current.longitude(),
                candidate.latitude(),
                candidate.longitude());

        if (dist < minDistance) {
          minDistance = dist;
          nearest = candidate;
        }
      }

      if (nearest != null) {
        orderedRoute.add(nearest);
        unvisited.remove(nearest);
        current = nearest;
      }
    }

    // 2. Tinh chỉnh bằng thuật toán 2-Opt Local Search (gỡ bỏ các cung đường giao nhau chéo)
    orderedRoute = twoOptRefine(startPoint, orderedRoute);

    // Tính lại tổng quãng đường sau khi tinh chỉnh 2-Opt
    totalDistanceKm = computeTotalRouteDistance(startPoint, orderedRoute);

    // Giá cước taxi/Grab 4 chỗ trung bình tại Việt Nam: khoảng 14.000 - 16.000đ/km
    double estimatedTaxiCostVnd = Math.round(totalDistanceKm * 15000.0);

    return new OptimizationResult(
        orderedRoute, Math.round(totalDistanceKm * 100.0) / 100.0, estimatedTaxiCostVnd);
  }

  private static List<DestinationPoint> twoOptRefine(
      DestinationPoint startPoint, List<DestinationPoint> route) {
    if (route == null || route.size() <= 2) {
      return route;
    }
    List<DestinationPoint> best = new ArrayList<>(route);
    boolean improved = true;
    int maxIterations = 50;

    while (improved && maxIterations-- > 0) {
      improved = false;
      for (int i = 0; i < best.size() - 1; i++) {
        for (int k = i + 1; k < best.size(); k++) {
          double delta = calculateTwoOptDelta(startPoint, best, i, k);
          if (delta < -1e-5) {
            Collections.reverse(best.subList(i, k + 1));
            improved = true;
          }
        }
      }
    }
    return best;
  }

  private static double calculateTwoOptDelta(
      DestinationPoint startPoint, List<DestinationPoint> route, int i, int k) {
    DestinationPoint prev = (i == 0) ? startPoint : route.get(i - 1);
    DestinationPoint pi = route.get(i);
    DestinationPoint pk = route.get(k);
    DestinationPoint next = (k == route.size() - 1) ? null : route.get(k + 1);

    double oldDist = calculateHaversineDistanceKm(prev.latitude(), prev.longitude(), pi.latitude(), pi.longitude());
    double newDist = calculateHaversineDistanceKm(prev.latitude(), prev.longitude(), pk.latitude(), pk.longitude());

    if (next != null) {
      oldDist += calculateHaversineDistanceKm(pk.latitude(), pk.longitude(), next.latitude(), next.longitude());
      newDist += calculateHaversineDistanceKm(pi.latitude(), pi.longitude(), next.latitude(), next.longitude());
    }

    return newDist - oldDist;
  }

  private static double computeTotalRouteDistance(
      DestinationPoint startPoint, List<DestinationPoint> route) {
    if (route.isEmpty()) return 0.0;
    double total = 0.0;
    DestinationPoint current = startPoint;
    for (DestinationPoint point : route) {
      total += calculateHaversineDistanceKm(
          current.latitude(), current.longitude(), point.latitude(), point.longitude());
      current = point;
    }
    return total;
  }
}
