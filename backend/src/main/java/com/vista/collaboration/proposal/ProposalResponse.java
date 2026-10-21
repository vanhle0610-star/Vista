package com.vista.collaboration.proposal;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ProposalResponse(
    UUID id,
    UUID tripId,
    UUID destinationId,
    UUID proposedBy,
    String title,
    ProposalStatus status,
    Instant closesAt,
    Instant createdAt,
    List<VoteResponse> votes,
    long upVotes,
    long downVotes) {

  public static ProposalResponse from(Proposal p) {
    List<VoteResponse> voteResponses = p.getVotes().stream().map(VoteResponse::from).toList();
    long up = voteResponses.stream().filter(v -> "UP".equals(v.vote())).count();
    long down = voteResponses.stream().filter(v -> "DOWN".equals(v.vote())).count();
    return new ProposalResponse(
        p.getId(),
        p.getTripId(),
        p.getDestinationId(),
        p.getProposedBy(),
        p.getTitle(),
        p.getStatus(),
        p.getClosesAt(),
        p.getCreatedAt(),
        voteResponses,
        up,
        down);
  }
}
