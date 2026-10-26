package com.vista.collaboration.proposal;

import com.vista.collaboration.exception.ConflictException;
import com.vista.collaboration.exception.ResourceNotFoundException;
import com.vista.notification.application.NotificationService;
import com.vista.trip.application.TripAccessService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ProposalService {

  private final ProposalRepository proposalRepository;
  private final VoteRepository voteRepository;
  private final TripAccessService tripAccessService;
  private final NotificationService notificationService;

  public ProposalService(
      ProposalRepository proposalRepository,
      VoteRepository voteRepository,
      TripAccessService tripAccessService,
      NotificationService notificationService) {
    this.proposalRepository = proposalRepository;
    this.voteRepository = voteRepository;
    this.tripAccessService = tripAccessService;
    this.notificationService = notificationService;
  }

  public ProposalResponse createProposal(UUID tripId, UUID userId, CreateProposalRequest request) {
    tripAccessService.requireMember(tripId, userId);

    Proposal proposal =
        new Proposal(tripId, userId, request.getDestinationId(), request.getTitle());
    proposal.setClosesAt(request.getClosesAt());
    Proposal saved = proposalRepository.save(proposal);

    return ProposalResponse.from(saved);
  }

  @Transactional(readOnly = true)
  public List<ProposalResponse> listProposals(UUID tripId, UUID userId) {
    tripAccessService.requireMember(tripId, userId);
    return proposalRepository.findByTripIdOrderByCreatedAtDesc(tripId).stream()
        .map(ProposalResponse::from)
        .toList();
  }

  @Transactional(readOnly = true)
  public ProposalResponse getProposal(UUID proposalId, UUID userId) {
    Proposal proposal = findOrThrow(proposalId);
    tripAccessService.requireMember(proposal.getTripId(), userId);
    return ProposalResponse.from(proposal);
  }

  public ProposalResponse approveProposal(UUID proposalId, UUID userId) {
    Proposal proposal = findOrThrow(proposalId);
    tripAccessService.requireOwner(proposal.getTripId(), userId);

    if (proposal.getStatus() != ProposalStatus.OPEN) {
      throw new ConflictException(
          "Ch\u1ec9 c\u00f3 th\u1ec3 duy\u1ec7t \u0111\u1ec1 xu\u1ea5t \u0111ang OPEN (hi\u1ec7n t\u1ea1i: "
              + proposal.getStatus()
              + ")");
    }
    proposal.setStatus(ProposalStatus.APPROVED);
    Proposal saved = proposalRepository.save(proposal);

    notificationService.notifyTripMembers(
        proposal.getTripId(),
        "\u0110\u1ec1 xu\u1ea5t \u0111\u01b0\u1ee3c duy\u1ec7t",
        "\u0110\u1ec1 xu\u1ea5t \""
            + proposal.getTitle()
            + "\" \u0111\u00e3 \u0111\u01b0\u1ee3c ch\u1ea5p thu\u1eadn.",
        "PROPOSAL_APPROVED",
        userId);

    return ProposalResponse.from(saved);
  }

  public ProposalResponse rejectProposal(UUID proposalId, UUID userId) {
    Proposal proposal = findOrThrow(proposalId);
    tripAccessService.requireOwner(proposal.getTripId(), userId);

    if (proposal.getStatus() != ProposalStatus.OPEN) {
      throw new ConflictException(
          "Ch\u1ec9 c\u00f3 th\u1ec3 t\u1eeb ch\u1ed1i \u0111\u1ec1 xu\u1ea5t \u0111ang OPEN (hi\u1ec7n t\u1ea1i: "
              + proposal.getStatus()
              + ")");
    }
    proposal.setStatus(ProposalStatus.REJECTED);
    Proposal saved = proposalRepository.save(proposal);

    notificationService.notifyTripMembers(
        proposal.getTripId(),
        "\u0110\u1ec1 xu\u1ea5t b\u1ecb t\u1eeb ch\u1ed1i",
        "\u0110\u1ec1 xu\u1ea5t \""
            + proposal.getTitle()
            + "\" \u0111\u00e3 b\u1ecb t\u1eeb ch\u1ed1i.",
        "PROPOSAL_REJECTED",
        userId);

    return ProposalResponse.from(saved);
  }

  public ProposalResponse closeVoting(UUID proposalId, UUID userId) {
    Proposal proposal = findOrThrow(proposalId);
    tripAccessService.requireOwner(proposal.getTripId(), userId);

    if (proposal.getStatus() != ProposalStatus.OPEN) {
      throw new ConflictException(
          "Ch\u1ec9 c\u00f3 th\u1ec3 \u0111\u00f3ng bi\u1ec3u quy\u1ebft \u0111ang OPEN (hi\u1ec7n t\u1ea1i: "
              + proposal.getStatus()
              + ")");
    }
    proposal.setStatus(ProposalStatus.CLOSED);
    Proposal saved = proposalRepository.save(proposal);

    notificationService.notifyTripMembers(
        proposal.getTripId(),
        "Bi\u1ec3u quy\u1ebft \u0111\u00e3 \u0111\u00f3ng",
        "Bi\u1ec3u quy\u1ebft cho \u0111\u1ec1 xu\u1ea5t \""
            + proposal.getTitle()
            + "\" \u0111\u00e3 k\u1ebft th\u00fac.",
        "VOTE_CLOSED",
        userId);

    return ProposalResponse.from(saved);
  }

  public VoteResponse castVote(UUID proposalId, UUID userId, CastVoteRequest request) {
    Proposal proposal = findOrThrow(proposalId);
    tripAccessService.requireMember(proposal.getTripId(), userId);

    if (proposal.getStatus() == ProposalStatus.OPEN
        && proposal.getClosesAt() != null
        && proposal.getClosesAt().isBefore(Instant.now())) {
      proposal.setStatus(ProposalStatus.CLOSED);
      proposalRepository.save(proposal);
      notificationService.notifyTripMembers(
          proposal.getTripId(),
          "Bi\u1ec3u quy\u1ebft \u0111\u00e3 \u0111\u00f3ng",
          "Bi\u1ec3u quy\u1ebft cho \u0111\u1ec1 xu\u1ea5t \""
              + proposal.getTitle()
              + "\" \u0111\u00e3 k\u1ebft th\u00fac (h\u1ebft h\u1ea1n).",
          "VOTE_CLOSED",
          userId);
      throw new ConflictException(
          "Bi\u1ec3u quy\u1ebft \u0111\u00e3 \u0111\u00f3ng (h\u1ebft h\u1ea1n): "
              + proposal.getClosesAt());
    }

    if (proposal.getStatus() != ProposalStatus.OPEN) {
      throw new ConflictException(
          "Bi\u1ec3u quy\u1ebft \u0111\u00e3 \u0111\u00f3ng, kh\u00f4ng th\u1ec3 b\u1ecf/\u0111\u1ed5i phi\u1ebfu (tr\u1ea1ng th\u00e1i: "
              + proposal.getStatus()
              + ")");
    }

    Vote vote =
        voteRepository
            .findByProposalIdAndUserId(proposalId, userId)
            .orElseGet(() -> new Vote(proposal, userId, request.getVote()));

    vote.setVote(request.getVote());
    vote.setUpdatedAt(Instant.now());
    Vote saved = voteRepository.save(vote);

    return VoteResponse.from(saved);
  }

  public void removeVote(UUID proposalId, UUID userId) {
    Proposal proposal = findOrThrow(proposalId);
    tripAccessService.requireMember(proposal.getTripId(), userId);

    if (proposal.getStatus() != ProposalStatus.OPEN) {
      throw new ConflictException(
          "Bi\u1ec3u quy\u1ebft \u0111\u00e3 \u0111\u00f3ng, kh\u00f4ng th\u1ec3 r\u00fat phi\u1ebfu (tr\u1ea1ng th\u00e1i: "
              + proposal.getStatus()
              + ")");
    }

    Vote vote =
        voteRepository
            .findByProposalIdAndUserId(proposalId, userId)
            .orElseThrow(
                () ->
                    new ResourceNotFoundException(
                        "B\u1ea1n ch\u01b0a b\u1ecf phi\u1ebfu cho \u0111\u1ec1 xu\u1ea5t n\u00e0y"));

    voteRepository.delete(vote);
  }

  private Proposal findOrThrow(UUID id) {
    return proposalRepository
        .findById(id)
        .orElseThrow(
            () ->
                new ResourceNotFoundException(
                    "Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u1ec1 xu\u1ea5t v\u1edbi ID: " + id));
  }
}
