package com.vista.common.security;

import com.vista.auth.application.JwtTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.HashSet;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtTokenService jwtTokenService;

  public JwtAuthenticationFilter(@Autowired(required = false) JwtTokenService jwtTokenService) {
    this.jwtTokenService = jwtTokenService;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {

    if (jwtTokenService != null) {
      var token = resolveToken(request);

      if (token != null && jwtTokenService.validateAccessToken(token)) {
        try {
          var claims = jwtTokenService.extractClaims(token);
          var userId = UUID.fromString(claims.getSubject());
          var email = claims.get("email", String.class);
          var roles = jwtTokenService.extractRoles(token);

          var authorities =
              roles.stream()
                  .map(role -> role.startsWith("ROLE_") ? role : "ROLE_" + role)
                  .map(SimpleGrantedAuthority::new)
                  .toList();

          var userPrincipal = new UserPrincipal(userId, email, new HashSet<>(roles), authorities);
          var authentication =
              new UsernamePasswordAuthenticationToken(userPrincipal, null, authorities);
          SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (Exception e) {
          SecurityContextHolder.clearContext();
        }
      }
    }

    filterChain.doFilter(request, response);
  }

  private String resolveToken(HttpServletRequest request) {
    var bearerToken = request.getHeader("Authorization");
    if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
      return bearerToken.substring(7);
    }
    return null;
  }
}
