package com.vista.destination.repository;

import com.vista.destination.domain.DestinationRequest;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface DestinationRequestRepository
    extends JpaRepository<DestinationRequest, UUID>, JpaSpecificationExecutor<DestinationRequest> {

  boolean existsBySubmittedByAndTargetDestinationIdAndStatus(
      UUID submittedBy, UUID targetDestinationId, String status);

  long countByStatus(String status);
}
