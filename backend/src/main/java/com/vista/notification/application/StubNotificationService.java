package com.vista.notification.application;

import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

/**
 * Stub implementation of NotificationService provided by TV3 during Week 1. Allows TV2, TV4, and
 * TV5 to dispatch notifications without waiting for TV3's full database and push mechanism in Week
 * 5/6.
 */
@Service
@ConditionalOnMissingBean(name = "realNotificationService")
public class StubNotificationService implements NotificationService {

  private static final Logger log = LoggerFactory.getLogger(StubNotificationService.class);

  @Override
  public void sendInAppNotification(
      UUID recipientUserId, String title, String body, String type, Map<String, Object> data) {
    log.info(
        "StubNotificationService [In-App]: recipient={}, title='{}', body='{}', type='{}', data={}",
        recipientUserId,
        title,
        body,
        type,
        data);
  }

  @Override
  public void notifyTripMembers(
      UUID tripId, String title, String body, String type, UUID excludeUserId) {
    log.info(
        "StubNotificationService [Trip Members]: tripId={}, title='{}', body='{}', type='{}', excludeUser={}",
        tripId,
        title,
        body,
        type,
        excludeUserId);
  }
}
