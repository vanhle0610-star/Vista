package com.vista.notification.application;

import java.util.Map;
import java.util.UUID;

/**
 * Public Service Interface owned by TV3 (Invited User / Trip Member). Consumed by: - TV2 (Trip
 * lifecycle changes, invitations) - TV4 (Expense settlements, budget threshold alerts) - TV5
 * (Safety emergency alerts, meetup updates)
 */
public interface NotificationService {

  /** Sends an in-app notification directly to a targeted user. */
  void sendInAppNotification(
      UUID recipientUserId, String title, String body, String type, Map<String, Object> data);

  /** Sends an in-app notification to all members of a trip, optionally excluding the initiator. */
  void notifyTripMembers(UUID tripId, String title, String body, String type, UUID excludeUserId);
}
