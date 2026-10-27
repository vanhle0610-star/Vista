package com.vista.trip.application;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

/**
 * Stub implementation of TripAccessService provided by TV2 during Week 1. Allows TV3, TV4, and TV5
 * to write membership-guarded endpoints immediately without waiting for TV2's real database
 * implementation in Week 2.
 */
@Service
@ConditionalOnMissingBean(TripAccessService.class)
public class StubTripAccessService implements TripAccessService {

  private static final Logger log = LoggerFactory.getLogger(StubTripAccessService.class);

  @Override
  public boolean isMember(UUID tripId, UUID userId) {
    log.debug("Stub TripAccessService: checking isMember for tripId={}, userId={}", tripId, userId);
    return tripId != null && userId != null;
  }

  @Override
  public boolean isOwner(UUID tripId, UUID userId) {
    log.debug("Stub TripAccessService: checking isOwner for tripId={}, userId={}", tripId, userId);
    return tripId != null && userId != null;
  }

  @Override
  public boolean hasWriteAccess(UUID tripId, UUID userId) {
    log.debug(
        "Stub TripAccessService: checking hasWriteAccess for tripId={}, userId={}", tripId, userId);
    return tripId != null && userId != null;
  }

  @Override
  public void requireMember(UUID tripId, UUID userId) {
    if (tripId == null || userId == null) {
      throw new IllegalArgumentException("Trip ID and User ID must not be null");
    }
    log.debug(
        "Stub TripAccessService: requireMember asserted for tripId={}, userId={}", tripId, userId);
  }

  @Override
  public void requireOwner(UUID tripId, UUID userId) {
    if (tripId == null || userId == null) {
      throw new IllegalArgumentException("Trip ID and User ID must not be null");
    }
    log.debug(
        "Stub TripAccessService: requireOwner asserted for tripId={}, userId={}", tripId, userId);
  }

  @Override
  public void requireWriteAccess(UUID tripId, UUID userId) {
    if (tripId == null || userId == null) {
      throw new IllegalArgumentException("Trip ID and User ID must not be null");
    }
    log.debug(
        "Stub TripAccessService: requireWriteAccess asserted for tripId={}, userId={}",
        tripId,
        userId);
  }
}
