package com.vista.destination.repository;

import com.vista.destination.domain.DestinationHistory;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DestinationHistoryRepository extends JpaRepository<DestinationHistory, UUID> {

  Optional<DestinationHistory> findByUserIdAndDestinationId(UUID userId, UUID destinationId);

  List<DestinationHistory> findByUserIdOrderByViewedAtDesc(UUID userId, Pageable pageable);
}
