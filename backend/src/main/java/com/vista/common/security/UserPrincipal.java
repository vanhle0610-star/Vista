package com.vista.common.security;

import java.security.Principal;
import java.util.Collection;
import java.util.Collections;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class UserPrincipal implements UserDetails, Principal {

  private final UUID id;
  private final String email;
  private final Set<String> roles;
  private final Collection<? extends GrantedAuthority> authorities;

  public UserPrincipal(
      UUID id,
      String email,
      Set<String> roles,
      Collection<? extends GrantedAuthority> authorities) {
    this.id = id;
    this.email = email;
    this.roles = roles != null ? Set.copyOf(roles) : Collections.emptySet();
    this.authorities = authorities != null ? authorities : Collections.emptyList();
  }

  public UUID getId() {
    return id;
  }

  public String getEmail() {
    return email;
  }

  public Set<String> getRoles() {
    return roles;
  }

  public boolean hasRole(String role) {
    if (role == null) return false;
    String normalized = role.startsWith("ROLE_") ? role.substring(5) : role;
    return roles.stream()
        .anyMatch(
            r -> {
              String current = r.startsWith("ROLE_") ? r.substring(5) : r;
              return current.equalsIgnoreCase(normalized);
            });
  }

  public boolean isAdmin() {
    return hasRole("ADMIN");
  }

  public boolean isModerator() {
    return hasRole("MODERATOR");
  }

  public boolean isModeratorOrAdmin() {
    return isAdmin() || isModerator();
  }

  @Override
  public String getName() {
    return id != null ? id.toString() : null;
  }

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return authorities;
  }

  @Override
  public String getPassword() {
    return null;
  }

  @Override
  public String getUsername() {
    return email;
  }

  @Override
  public boolean isAccountNonExpired() {
    return true;
  }

  @Override
  public boolean isAccountNonLocked() {
    return true;
  }

  @Override
  public boolean isCredentialsNonExpired() {
    return true;
  }

  @Override
  public boolean isEnabled() {
    return true;
  }
}
