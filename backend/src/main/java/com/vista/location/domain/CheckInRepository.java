package com.vista.location.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CheckInRepository extends JpaRepository<CheckIn, UUID> {

  List<CheckIn> findByTripIdOrderByCheckedInAtDesc(UUID tripId);

  Page<CheckIn> findByTripId(UUID tripId, Pageable pageable);

  boolean existsByTripIdAndItineraryItemIdAndUserId(UUID tripId, UUID itineraryItemId, UUID userId);
}
