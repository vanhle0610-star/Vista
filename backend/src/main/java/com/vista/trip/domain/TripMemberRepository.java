package com.vista.trip.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TripMemberRepository
    extends JpaRepository<TripMemberEntity, TripMemberEntity.TripMemberId> {

  List<TripMemberEntity> findByTripIdAndStatus(UUID tripId, TripMemberStatus status);

  Optional<TripMemberEntity> findByTripIdAndUserId(UUID tripId, UUID userId);

  boolean existsByTripIdAndUserIdAndStatus(UUID tripId, UUID userId, TripMemberStatus status);
}
