package com.vista.itinerary.api;

import com.vista.common.security.CurrentUserProvider;
import com.vista.itinerary.api.dto.ItineraryResponse;
import com.vista.itinerary.api.dto.MergeItineraryRequest;
import com.vista.itinerary.application.ItineraryService;
import com.vista.trip.application.TripAccessService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("itineraryApiController")
@RequestMapping("/api/v1/trips/{tripId}/itinerary")
public class ItineraryController {
  private final ItineraryService itineraryService;
  private final TripAccessService tripAccessService;
  private final CurrentUserProvider currentUserProvider;

  public ItineraryController(
      ItineraryService itineraryService,
      TripAccessService tripAccessService,
      CurrentUserProvider currentUserProvider) {
    this.itineraryService = itineraryService;
    this.tripAccessService = tripAccessService;
    this.currentUserProvider = currentUserProvider;
  }

  @GetMapping
  public ItineraryResponse get(@PathVariable UUID tripId) {
    tripAccessService.requireMember(tripId, currentUserProvider.getCurrentUserId());
    return itineraryService.get(tripId);
  }

  @PostMapping("/merge")
  public ItineraryResponse merge(
      @PathVariable UUID tripId, @Valid @RequestBody MergeItineraryRequest request) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    tripAccessService.requireMember(tripId, currentUserId);
    return itineraryService.merge(tripId, currentUserId, request);
  }
}
