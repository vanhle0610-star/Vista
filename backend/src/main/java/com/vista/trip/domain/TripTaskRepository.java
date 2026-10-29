package com.vista.trip.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TripTaskRepository extends JpaRepository<TripTaskEntity, UUID> {

  List<TripTaskEntity> findByTripIdOrderByCreatedAtAsc(UUID tripId);

  Optional<TripTaskEntity> findByIdAndTripId(UUID id, UUID tripId);
}

