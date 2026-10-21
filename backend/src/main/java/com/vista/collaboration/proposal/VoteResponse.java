package com.vista.collaboration.proposal;

import java.time.Instant;
import java.util.UUID;

public record VoteResponse(UUID id, UUID proposalId, UUID userId, String vote, Instant updatedAt) {
  public static VoteResponse from(Vote v) {
    return new VoteResponse(
        v.getId(),
        v.getProposal().getId(),
        v.getUserId(),
        v.getVote(),
        v.getUpdatedAt());
  }
}
