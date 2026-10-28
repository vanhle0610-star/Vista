package com.vista.location.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MeetupPointRepository extends JpaRepository<MeetupPoint, UUID> {

  List<MeetupPoint> findByTripIdOrderByTargetTimeAscCreatedAtAsc(UUID tripId);

  Page<MeetupPoint> findByTripId(UUID tripId, Pageable pageable);
}
