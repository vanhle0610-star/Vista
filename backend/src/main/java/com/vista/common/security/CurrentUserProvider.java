package com.vista.common.security;

import java.util.Optional;
import java.util.UUID;

public interface CurrentUserProvider {

  UUID getCurrentUserId();

  Optional<UUID> findCurrentUserId();

  Optional<UserPrincipal> getCurrentUser();

  boolean isAdmin();

  void requireAuthenticated();

  void requireOwner(UUID resourceOwnerId);
}
