package com.vista.collaboration.proposal;

import com.vista.common.security.CurrentUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(
    name = "Proposals & Votes",
    description = "Đề xuất địa điểm và biểu quyết trong chuyến đi nhóm")
@SecurityRequirement(name = "bearerAuth")
public class ProposalController {

  private final ProposalService proposalService;
  private final CurrentUserProvider currentUserProvider;

  public ProposalController(
      ProposalService proposalService, CurrentUserProvider currentUserProvider) {
    this.proposalService = proposalService;
    this.currentUserProvider = currentUserProvider;
  }

  // ── Proposals ─────────────────────────────────────────────────────────────

  @PostMapping("/trips/{tripId}/proposals")
  @Operation(summary = "Tạo đề xuất địa điểm — thành viên trong trip")
  public ResponseEntity<ProposalResponse> createProposal(
      @PathVariable UUID tripId, @Valid @RequestBody CreateProposalRequest request) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(proposalService.createProposal(tripId, userId, request));
  }

  @GetMapping("/trips/{tripId}/proposals")
  @Operation(summary = "Danh sách đề xuất của chuyến đi")
  public ResponseEntity<List<ProposalResponse>> listProposals(@PathVariable UUID tripId) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(proposalService.listProposals(tripId, userId));
  }

  @GetMapping("/proposals/{proposalId}")
  @Operation(summary = "Chi tiết đề xuất kèm danh sách phiếu bầu")
  public ResponseEntity<ProposalResponse> getProposal(@PathVariable UUID proposalId) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(proposalService.getProposal(proposalId, userId));
  }

  @PutMapping("/proposals/{proposalId}/approve")
  @Operation(summary = "Duyệt đề xuất — chỉ Owner của trip")
  public ResponseEntity<ProposalResponse> approveProposal(@PathVariable UUID proposalId) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(proposalService.approveProposal(proposalId, userId));
  }

  @PutMapping("/proposals/{proposalId}/reject")
  @Operation(summary = "Từ chối đề xuất — chỉ Owner của trip")
  public ResponseEntity<ProposalResponse> rejectProposal(@PathVariable UUID proposalId) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(proposalService.rejectProposal(proposalId, userId));
  }

  @PutMapping("/proposals/{proposalId}/close-voting")
  @Operation(summary = "Đóng biểu quyết — chỉ Owner của trip")
  public ResponseEntity<ProposalResponse> closeVoting(@PathVariable UUID proposalId) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(proposalService.closeVoting(proposalId, userId));
  }

  // ── Votes ──────────────────────────────────────────────────────────────────

  @PostMapping("/proposals/{proposalId}/votes")
  @Operation(
      summary = "Bỏ phiếu hoặc đổi phiếu (UP/DOWN) — biểu quyết phải đang OPEN",
      description = "Nếu đã bỏ phiếu, vote mới ghi đè vote cũ. Tổng phiếu không tăng.")
  public ResponseEntity<VoteResponse> castVote(
      @PathVariable UUID proposalId, @Valid @RequestBody CastVoteRequest request) {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(proposalService.castVote(proposalId, userId, request));
  }

  @DeleteMapping("/proposals/{proposalId}/votes")
  @Operation(summary = "Rút phiếu — biểu quyết phải đang OPEN")
  public ResponseEntity<Void> removeVote(@PathVariable UUID proposalId) {
    UUID userId = currentUserProvider.getCurrentUserId();
    proposalService.removeVote(proposalId, userId);
    return ResponseEntity.noContent().build();
  }
}
