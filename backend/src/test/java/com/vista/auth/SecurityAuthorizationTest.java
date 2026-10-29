package com.vista.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.vista.admin.api.AdminTestController;
import com.vista.auth.api.AuthController;
import com.vista.auth.api.dto.UserResponse;
import com.vista.auth.application.AuthService;
import com.vista.auth.application.JwtTokenService;
import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.JwtAuthenticationFilter;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.security.SecurityCurrentUserProvider;
import com.vista.common.security.UserPrincipal;
import com.vista.common.web.GlobalExceptionHandler;
import com.vista.common.web.HealthController;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = {HealthController.class, AuthController.class, AdminTestController.class})
@Import({
  SecurityConfiguration.class,
  JwtAuthenticationFilter.class,
  SecurityCurrentUserProvider.class,
  GlobalExceptionHandler.class
})
class SecurityAuthorizationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private CurrentUserProvider currentUserProvider;

  @MockitoBean private AuthService authService;
  @MockitoBean private JwtTokenService jwtTokenService;

  @Test
  void healthEndpointIsPublic() throws Exception {
    mockMvc.perform(get("/api/v1/health")).andExpect(status().isOk());
  }

  @Test
  void protectedEndpointReturns401WhenNoToken() throws Exception {
    mockMvc
        .perform(get("/api/v1/auth/me"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
        .andExpect(jsonPath("$.status").value(401));
  }

  @Test
  void refreshTokenCannotBeUsedToAuthenticateProtectedEndpoints() throws Exception {
    String refreshToken = "sample.refresh.token";
    when(jwtTokenService.validateAccessToken(refreshToken)).thenReturn(false);

    mockMvc
        .perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + refreshToken))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
        .andExpect(jsonPath("$.status").value(401));
  }

  @Test
  void expiredAccessTokenReturnsTokenExpiredCodeForSilentRefresh() throws Exception {
    String expiredToken = "expired.jwt.token";
    when(jwtTokenService.validateAccessTokenDetailed(expiredToken))
        .thenReturn(JwtTokenService.JwtValidationResult.EXPIRED);

    mockMvc
        .perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + expiredToken))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("TOKEN_EXPIRED"))
        .andExpect(jsonPath("$.status").value(401));
  }

  @Test
  void spoofedXUserIdHeaderIsIgnoredAndIdentityComesStrictlyFromJwtToken() throws Exception {
    UUID authenticUserId = UUID.fromString("11111111-1111-1111-1111-111111111111");
    String validToken = "valid.jwt.token";

    when(jwtTokenService.validateAccessToken(validToken)).thenReturn(true);
    Claims claims =
        Jwts.claims()
            .subject(authenticUserId.toString())
            .add("email", "authentic@vista.vn")
            .build();
    when(jwtTokenService.extractClaims(validToken)).thenReturn(claims);
    when(jwtTokenService.extractRoles(validToken)).thenReturn(List.of("ROLE_USER"));

    when(authService.getCurrentUser(authenticUserId))
        .thenReturn(
            new UserResponse(
                authenticUserId,
                "authentic@vista.vn",
                "Authentic User",
                null,
                "ACTIVE",
                List.of("ROLE_USER")));

    // An attacker sends X-User-Id header with a victim's UUID
    mockMvc
        .perform(
            get("/api/v1/auth/me")
                .header("Authorization", "Bearer " + validToken)
                .header("X-User-Id", "99999999-9999-9999-9999-999999999999"))
        .andExpect(status().isOk())
        // Must return authenticUserId, completely ignoring the spoofed X-User-Id
        .andExpect(jsonPath("$.id").value(authenticUserId.toString()))
        .andExpect(jsonPath("$.email").value("authentic@vista.vn"));
  }

  @Test
  @WithMockUser(roles = {"USER"})
  void regularUserCannotAccessAdminEndpointEvenWithSpoofedHeaders() throws Exception {
    mockMvc
        .perform(
            get("/api/v1/admin/overview").header("X-Is-Admin", "true").header("X-Role", "ADMIN"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"))
        .andExpect(jsonPath("$.status").value(403));
  }

  @Test
  @WithMockUser(roles = {"ADMIN"})
  void adminUserCanAccessAdminEndpoint() throws Exception {
    mockMvc
        .perform(get("/api/v1/admin/overview"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("HEALTHY"))
        .andExpect(jsonPath("$.access").value("AUTHORIZED"));
  }

  @Test
  void securityHeadersAreEnforcedInResponses() throws Exception {
    mockMvc
        .perform(get("/api/v1/health").secure(true))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string("X-Frame-Options", "DENY"))
        .andExpect(header().exists("Strict-Transport-Security"))
        .andExpect(
            header()
                .string(
                    "Content-Security-Policy",
                    "default-src 'self'; frame-ancestors 'none'; object-src 'none';"));
  }

  @Test
  void requireOwnerAllowsResourceOwnerAndRejectsImpersonator() {
    UUID ownerId = UUID.fromString("22222222-2222-2222-2222-222222222222");
    UUID otherUserId = UUID.fromString("33333333-3333-3333-3333-333333333333");

    // Authenticate as ownerId
    UserPrincipal ownerPrincipal =
        new UserPrincipal(
            ownerId,
            "owner@vista.vn",
            Set.of("USER"),
            List.of(new SimpleGrantedAuthority("ROLE_USER")));
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(
                ownerPrincipal, null, ownerPrincipal.getAuthorities()));

    // Resource owner accessing their own resource: should succeed without exception
    currentUserProvider.requireOwner(ownerId);
    assertThat(currentUserProvider.getCurrentUserId()).isEqualTo(ownerId);

    // Resource owner attempting to modify someone else's resource: should throw 403
    // AccessDeniedException
    assertThatThrownBy(() -> currentUserProvider.requireOwner(otherUserId))
        .isInstanceOf(AccessDeniedException.class)
        .hasMessageContaining("Bạn không có quyền thao tác trên tài nguyên của người dùng khác");

    // Admin accessing someone else's resource: should be permitted
    UserPrincipal adminPrincipal =
        new UserPrincipal(
            UUID.randomUUID(),
            "admin@vista.vn",
            Set.of("ADMIN"),
            List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(
                adminPrincipal, null, adminPrincipal.getAuthorities()));

    currentUserProvider.requireOwner(otherUserId);
  }
}
