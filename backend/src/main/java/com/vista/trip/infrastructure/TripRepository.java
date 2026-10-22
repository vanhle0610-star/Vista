package com.vista.trip.infrastructure;

import com.vista.trip.domain.TripEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TripRepository extends JpaRepository<TripEntity, UUID> {

  List<TripEntity> findByOwnerId(UUID ownerId);

  @Query(
      "SELECT t FROM TripEntity t JOIN TripMemberEntity tm ON tm.id.tripId = t.id "
          + "WHERE tm.id.userId = :userId AND tm.status = 'ACTIVE' ORDER BY t.startDate ASC")
  List<TripEntity> findActiveTripsByUserId(@Param("userId") UUID userId);
}
