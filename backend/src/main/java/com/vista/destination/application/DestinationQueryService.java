package com.vista.destination.application;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DestinationQueryService {

  /**
   * Tìm kiếm thông tin tóm tắt điểm đến theo ID nếu điểm đến đã PUBLISHED. Dùng cho TV3 (hiển thị
   * thông tin điểm dừng trên lịch trình) và TV4 (tính toán lộ trình/ngân sách).
   */
  Optional<DestinationSummary> findPublishedById(UUID id);

  /**
   * Lấy danh sách thông tin tóm tắt của nhiều điểm đến theo danh sách IDs đã PUBLISHED. Dùng cho
   * TV3 khi nạp toàn bộ danh sách điểm dừng của 1 ngày lịch trình (Itinerary Day).
   */
  List<DestinationSummary> findPublishedByIds(List<UUID> ids);

  /**
   * Tìm kiếm và gợi ý các điểm đến PUBLISHED theo từ khóa, tỉnh thành, danh mục với giới hạn số
   * lượng. Dùng cho TV4 AI Planner (prompt context injection) và TV3 Destination Proposal.
   */
  List<DestinationSummary> searchPublished(
      String keyword, String province, String category, int limit);

  /**
   * Kiểm tra nhanh xem điểm đến có tồn tại và đang ở trạng thái PUBLISHED hay không. Dùng cho
   * validation khi thêm điểm dừng hoặc đề xuất biểu quyết.
   */
  boolean isPublished(UUID id);
}
