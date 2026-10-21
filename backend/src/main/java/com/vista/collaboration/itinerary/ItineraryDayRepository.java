package com.vista.collaboration.itinerary;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ItineraryDayRepository extends JpaRepository<ItineraryDay, UUID> {

  Optional<ItineraryDay> findByTripIdAndDayNumber(UUID tripId, Integer dayNumber);

  boolean existsByTripIdAndDayNumber(UUID tripId, Integer dayNumber);

  List<ItineraryDay> findByTripIdOrderByDayNumberAsc(UUID tripId);
}
