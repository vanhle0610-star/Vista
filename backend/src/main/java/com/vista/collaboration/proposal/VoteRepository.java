package com.vista.collaboration.proposal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VoteRepository extends JpaRepository<Vote, UUID> {

  Optional<Vote> findByProposalIdAndUserId(UUID proposalId, UUID userId);

  List<Vote> findByProposalId(UUID proposalId);
}
