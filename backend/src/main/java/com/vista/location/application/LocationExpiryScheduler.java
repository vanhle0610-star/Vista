package com.vista.location.application;

import com.vista.location.domain.LocationShare;
import com.vista.location.domain.LocationShareRepository;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class LocationExpiryScheduler {

  private static final Logger log = LoggerFactory.getLogger(LocationExpiryScheduler.class);

  private final LocationShareRepository locationShareRepository;

  public LocationExpiryScheduler(LocationShareRepository locationShareRepository) {
    this.locationShareRepository = locationShareRepository;
  }

  @Scheduled(fixedDelay = 60000)
  @Transactional
  public void cleanupExpiredLocationShares() {
    Instant now = Instant.now();
    List<LocationShare> expired = locationShareRepository.findExpiredActiveShares(now);
    if (!expired.isEmpty()) {
      for (LocationShare share : expired) {
        share.setEnabled(false);
        share.setStoppedAt(now);
        share.setLastLatitude(null);
        share.setLastLongitude(null);
        share.setLastUpdatedAt(null);
        share.setSessionId(null);
      }
      locationShareRepository.saveAll(expired);
      log.info("Auto-expired and cleared GPS coordinates for {} location shares", expired.size());
    }
  }
}
