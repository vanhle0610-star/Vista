package com.vista.trip.application;

import java.util.UUID;

/**
 * Cổng kiểm tra ràng buộc công nợ/chi tiêu của chuyến đi phục vụ cho các quy trình nghiệp vụ vòng
 * đời chuyến đi (như xóa chuyến đi).
 */
public interface TripSettlementChecker {

  /**
   * Kiểm tra xem chuyến đi có khoản chi tiêu hoặc công nợ nào chưa được quyết toán hay không.
   *
   * @param tripId UUID của chuyến đi
   * @return true nếu còn nợ hoặc khoản chi chưa quyết toán; false nếu không có chi phí hoặc đã
   *     quyết toán xong
   */
  boolean hasUnsettledDebts(UUID tripId);
}
