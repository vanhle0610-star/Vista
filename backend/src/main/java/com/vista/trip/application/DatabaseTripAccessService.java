package com.vista.trip.application;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

/**
 * Production-ready TripAccessService that validates ownership and membership against the real
 * 'trips' and 'trip_members' database tables.
 */
@Service("primary")
@Primary
public class DatabaseTripAccessService implements TripAccessService {

  private static final Logger log = LoggerFactory.getLogger(DatabaseTripAccessService.class);

  private final JdbcClient jdbcClient;

  public DatabaseTripAccessService(JdbcClient jdbcClient) {
    this.jdbcClient = jdbcClient;
  }

  @Override
  public boolean isOwner(UUID tripId, UUID userId) {
    if (tripId == null || userId == null) {
      return false;
    }
    try {
      Integer count =
          jdbcClient
              .sql("SELECT count(*) FROM trips WHERE id = :tripId AND owner_id = :userId")
              .param("tripId", tripId)
              .param("userId", userId)
              .query(Integer.class)
              .single();
      return count != null && count > 0;
    } catch (Exception e) {
      log.warn(
          "Error querying trip owner for tripId={} and userId={}: {}",
          tripId,
          userId,
          e.getMessage());
      return false;
    }
  }

  @Override
  public boolean isMember(UUID tripId, UUID userId) {
    if (tripId == null || userId == null) {
      return false;
    }
    // 1. Owner is always considered an active member
    if (isOwner(tripId, userId)) {
      return true;
    }
    // 2. Check trip_members table
    try {
      Integer count =
          jdbcClient
              .sql(
                  "SELECT count(*) FROM trip_members WHERE trip_id = :tripId AND user_id = :userId AND status != 'REMOVED'")
              .param("tripId", tripId)
              .param("userId", userId)
              .query(Integer.class)
              .single();
      return count != null && count > 0;
    } catch (Exception e) {
      log.warn(
          "Error querying trip membership for tripId={} and userId={}: {}",
          tripId,
          userId,
          e.getMessage());
      return false;
    }
  }

  @Override
  public void requireMember(UUID tripId, UUID userId) {
    if (tripId == null || userId == null) {
      throw new IllegalArgumentException("Trip ID và User ID không được để trống");
    }
    if (!isMember(tripId, userId)) {
      log.warn("Access denied: user {} is not an authorized member of trip {}", userId, tripId);
      throw new AccessDeniedException(
          "Bạn không có quyền truy cập hoặc không phải thành viên của chuyến đi này");
    }
  }

  @Override
  public void requireOwner(UUID tripId, UUID userId) {
    if (tripId == null || userId == null) {
      throw new IllegalArgumentException("Trip ID và User ID không được để trống");
    }
    if (!isOwner(tripId, userId)) {
      log.warn("Access denied: user {} is not the designated owner of trip {}", userId, tripId);
      throw new AccessDeniedException("Bạn không phải chủ sở hữu của chuyến đi này");
    }
  }
}
