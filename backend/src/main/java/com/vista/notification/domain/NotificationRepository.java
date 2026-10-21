package com.vista.notification.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<NotificationEntity, UUID> {

  /** Thông báo chưa đọc của user, sắp xếp mới nhất trước. */
  List<NotificationEntity> findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(
      UUID userId, Pageable pageable);

  /** Toàn bộ thông báo của user, sắp xếp mới nhất trước. */
  List<NotificationEntity> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

  /** Đánh dấu tất cả thông báo chưa đọc của user là đã đọc. */
  @Modifying
  @Query(
      "UPDATE NotificationEntity n SET n.readAt = CURRENT_TIMESTAMP"
          + " WHERE n.userId = :userId AND n.readAt IS NULL")
  int markAllReadForUser(@Param("userId") UUID userId);

  long countByUserIdAndReadAtIsNull(UUID userId);
}
