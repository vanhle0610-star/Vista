package com.vista.location.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface LocationShareRepository extends JpaRepository<LocationShare, UUID> {

  Optional<LocationShare> findByTripIdAndUserId(UUID tripId, UUID userId);

  @Query(
      "SELECT ls FROM LocationShare ls WHERE ls.tripId = :tripId AND ls.enabled = true AND ls.expiresAt > :now AND ls.lastLatitude IS NOT NULL AND ls.lastLongitude IS NOT NULL ORDER BY ls.lastUpdatedAt DESC")
  Page<LocationShare> findActiveShares(
      @Param("tripId") UUID tripId, @Param("now") Instant now, Pageable pageable);

  @Query("SELECT ls FROM LocationShare ls WHERE ls.enabled = true AND ls.expiresAt <= :now")
  List<LocationShare> findExpiredActiveShares(@Param("now") Instant now);

  @Modifying
  @Query(
      "UPDATE LocationShare ls SET ls.enabled = false, ls.stoppedAt = :now, ls.lastLatitude = null, ls.lastLongitude = null, ls.lastUpdatedAt = null WHERE ls.tripId = :tripId AND ls.enabled = true")
  int stopAllSharesForTrip(@Param("tripId") UUID tripId, @Param("now") Instant now);
}
