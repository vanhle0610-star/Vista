package com.vista.community.application;

import java.util.Objects;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/** Explicit opt-in development stub. Never returns success and has no persistence dependencies. */
@Service
@Profile("(dev | test) & !prod & !demo")
@ConditionalOnProperty(name = "vista.community.visibility-stub.enabled", havingValue = "true")
public final class StubPostVisibilityService implements PostVisibilityService {
  @Override
  public void hide(UUID postId, UUID actorId, long expectedVersion) {
    reject(postId, actorId, expectedVersion);
  }

  @Override
  public void restore(UUID postId, UUID actorId, long expectedVersion) {
    reject(postId, actorId, expectedVersion);
  }

  private void reject(UUID postId, UUID actorId, long expectedVersion) {
    Objects.requireNonNull(postId, "postId");
    Objects.requireNonNull(actorId, "actorId");
    if (expectedVersion < 0) {
      throw new IllegalArgumentException("expectedVersion must be non-negative");
    }
    throw new PostVisibilityNotImplementedException();
  }
}
