package com.vista.destination.repository;

import com.vista.destination.domain.DestinationImage;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DestinationImageRepository extends JpaRepository<DestinationImage, UUID> {
  List<DestinationImage> findByDestinationIdOrderBySortOrderAsc(UUID destinationId);
}
