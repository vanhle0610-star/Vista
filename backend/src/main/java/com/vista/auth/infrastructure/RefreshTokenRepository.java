package com.vista.auth.infrastructure;

import com.vista.auth.domain.RefreshTokenEntity;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshTokenEntity, UUID> {

  Optional<RefreshTokenEntity> findByTokenHash(String tokenHash);

  List<RefreshTokenEntity> findByUserId(UUID userId);

  @Modifying
  @Query("UPDATE RefreshTokenEntity r SET r.revoked = true WHERE r.userId = :userId")
  void revokeAllByUserId(@Param("userId") UUID userId);

  @Modifying
  @Query(
      "UPDATE RefreshTokenEntity r SET r.revoked = true WHERE r.tokenHash = :tokenHash AND"
          + " r.revoked = false")
  int revokeIfActive(@Param("tokenHash") String tokenHash);

  @Modifying
  @Query("DELETE FROM RefreshTokenEntity r WHERE r.expiresAt < :now")
  int deleteExpiredTokens(@Param("now") Instant now);
}
