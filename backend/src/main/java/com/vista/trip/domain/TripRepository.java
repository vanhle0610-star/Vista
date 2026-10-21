package com.vista.trip.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TripRepository extends JpaRepository<TripEntity, UUID> {

  /** Lấy toàn bộ trip mà user là owner. */
  List<TripEntity> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);

  /**
   * Lấy toàn bộ trip mà user là thành viên hoặc là owner (dùng cho màn hình "Chuyến đi của tôi").
   */
  @Query(
      """
      SELECT DISTINCT t FROM TripEntity t
       LEFT JOIN t.members m
      WHERE t.ownerId = :userId
         OR (m.userId = :userId AND m.status = 'ACTIVE')
      ORDER BY t.createdAt DESC
      """)
  List<TripEntity> findAllAccessibleByUser(@Param("userId") UUID userId);
}
