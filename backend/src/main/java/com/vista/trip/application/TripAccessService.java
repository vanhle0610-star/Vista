package com.vista.trip.application;

import java.util.UUID;

/**
 * Public Service Interface owned by TV2 (Registered User / Trip Owner). Consumed by: - TV3 (Group
 * Trip Collaboration: Itinerary, Invitations, Voting) - TV4 (Trip Expenses & AI Planner) - TV5
 * (Safety & Group Location Tracking)
 *
 * <p>Enforces modular monolith boundaries without direct cross-module repository access.
 */
public interface TripAccessService {

  /** Checks whether the specified user is an active member or owner of the trip. */
  boolean isMember(UUID tripId, UUID userId);

  /** Checks whether the specified user is the designated owner of the trip. */
  boolean isOwner(UUID tripId, UUID userId);

  /**
   * Asserts that the specified user is an active member of the trip, throwing an authorization
   * exception if false.
   */
  void requireMember(UUID tripId, UUID userId);

  /**
   * Asserts that the specified user is the owner of the trip, throwing an authorization exception
   * if false.
   */
  void requireOwner(UUID tripId, UUID userId);
}
