package com.vista.collaboration.invitation;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InvitationRepository extends JpaRepository<Invitation, UUID> {

  Optional<Invitation> findByTokenHash(String tokenHash);

  boolean existsByTripIdAndInviteeEmailAndStatus(
      UUID tripId, String inviteeEmail, InvitationStatus status);

  List<Invitation> findByTripIdOrderByCreatedAtDesc(UUID tripId);
}
