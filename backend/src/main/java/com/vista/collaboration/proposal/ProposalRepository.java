package com.vista.collaboration.proposal;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProposalRepository extends JpaRepository<Proposal, UUID> {

  List<Proposal> findByTripIdOrderByCreatedAtDesc(UUID tripId);

  List<Proposal> findByTripIdAndStatus(UUID tripId, ProposalStatus status);
}
