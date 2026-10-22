package com.vista.community.application;

import java.util.UUID;

/**
 * TV5 integration boundary for TV1 moderation. The caller must authorize the moderator, derive
 * actorId from authentication, and own moderation events/audit. No admin HTTP API is provided here.
 */
public interface PostVisibilityService {
  /**
   * Hide a post without changing its user-deletion marker. A real implementation must compare
   * expectedVersion atomically, increment version and preserve the previous moderation status.
   */
  void hide(UUID postId, UUID actorId, long expectedVersion);

  /**
   * Restore the status preceding HIDDEN; never publish PENDING content or restore a user-deleted
   * post. Missing post, deleted post and version conflicts must remain distinct integration errors.
   */
  void restore(UUID postId, UUID actorId, long expectedVersion);
}
