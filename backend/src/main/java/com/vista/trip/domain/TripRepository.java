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
  List<TripEntity> findByOwnerId(UUID ownerId);

  List<TripEntity> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);

  @Query(
      "SELECT t FROM TripEntity t JOIN t.members m "
          + "WHERE m.userId = :userId AND m.status = 'ACTIVE' ORDER BY t.startDate ASC")
  List<TripEntity> findActiveTripsByUserId(@Param("userId") UUID userId);

  /**
   * Lấy toàn bộ trip mà user là thành viên hoặc là owner (dùng cho màn hình "Chuyến đi của tôi").
   */
  @Query(
      """
      SELECT DISTINCT t FROM TripEntity t
       LEFT JOIN FETCH t.members
      WHERE t.ownerId = :userId
         OR EXISTS (
           SELECT 1 FROM TripMemberEntity tm
           WHERE tm.trip = t AND tm.userId = :userId AND tm.status = 'ACTIVE'
         )
      ORDER BY t.createdAt DESC
      """)
  List<TripEntity> findAllAccessibleByUser(@Param("userId") UUID userId);
}
