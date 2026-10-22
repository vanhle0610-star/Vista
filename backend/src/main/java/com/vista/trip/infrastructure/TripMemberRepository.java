package com.vista.trip.infrastructure;

import com.vista.trip.domain.TripMemberEntity;
import com.vista.trip.domain.TripMemberId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TripMemberRepository extends JpaRepository<TripMemberEntity, TripMemberId> {

  Optional<TripMemberEntity> findById(TripMemberId id);

  List<TripMemberEntity> findByIdTripId(UUID tripId);
}
