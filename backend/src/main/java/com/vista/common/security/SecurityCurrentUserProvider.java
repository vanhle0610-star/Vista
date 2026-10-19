package com.vista.common.security;

import java.util.Optional;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityCurrentUserProvider implements CurrentUserProvider {

  @Override
  public UUID getCurrentUserId() {
    return findCurrentUserId()
        .orElseThrow(
            () ->
                new AuthenticationCredentialsNotFoundException(
                    "Yêu cầu cần có danh tính người dùng hợp lệ trong SecurityContext"));
  }

  @Override
  public Optional<UUID> findCurrentUserId() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated()) {
      return Optional.empty();
    }
    Object principal = auth.getPrincipal();
    if (principal instanceof UserPrincipal up) {
      return Optional.ofNullable(up.getId());
    }
    if (principal instanceof UUID uuid) {
      return Optional.of(uuid);
    }
    if (principal instanceof String str) {
      try {
        return Optional.of(UUID.fromString(str));
      } catch (IllegalArgumentException ignored) {
      }
    }
    if (auth.getName() != null) {
      try {
        return Optional.of(UUID.fromString(auth.getName()));
      } catch (IllegalArgumentException ignored) {
      }
    }
    return Optional.empty();
  }

  @Override
  public Optional<UserPrincipal> getCurrentUser() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated()) {
      return Optional.empty();
    }
    Object principal = auth.getPrincipal();
    if (principal instanceof UserPrincipal up) {
      return Optional.of(up);
    }
    return Optional.empty();
  }

  @Override
  public boolean isAdmin() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated()) {
      return false;
    }
    Object principal = auth.getPrincipal();
    if (principal instanceof UserPrincipal up) {
      return up.isAdmin();
    }
    return auth.getAuthorities().stream()
        .anyMatch(
            a ->
                "ROLE_ADMIN".equalsIgnoreCase(a.getAuthority())
                    || "ADMIN".equalsIgnoreCase(a.getAuthority()));
  }

  @Override
  public void requireAuthenticated() {
    getCurrentUserId();
  }

  @Override
  public void requireOwner(UUID resourceOwnerId) {
    UUID currentUserId = getCurrentUserId();
    if (resourceOwnerId != null && !currentUserId.equals(resourceOwnerId) && !isAdmin()) {
      throw new AccessDeniedException(
          "Bạn không có quyền thao tác trên tài nguyên của người dùng khác");
    }
  }
}
