package com.vista.auth.infrastructure;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class GoogleTokenVerifier {

  private static final Logger log = LoggerFactory.getLogger(GoogleTokenVerifier.class);
  private static final String GOOGLE_TOKENINFO_URL =
      "https://oauth2.googleapis.com/tokeninfo?id_token={token}";

  private final RestClient restClient;
  private final ObjectMapper objectMapper;
  private final String configuredClientId;

  public GoogleTokenVerifier(@Value("${vista.auth.google.client-id:}") String configuredClientId) {
    this.restClient = RestClient.builder().build();
    this.objectMapper = new ObjectMapper();
    this.configuredClientId = configuredClientId;
  }

  public GoogleUserPayload verify(String idToken) {
    if (idToken == null || idToken.isBlank()) {
      throw new BadCredentialsException("Google ID Token không được để trống");
    }

    // 1. Check for local dev / demo simulation tokens
    if (idToken.startsWith("demo_") || idToken.startsWith("mock_")) {
      return parseDemoToken(idToken);
    }

    // 2. Production validation via Google TokenInfo API
    try {
      @SuppressWarnings("unchecked")
      Map<String, Object> tokenInfo =
          restClient.get().uri(GOOGLE_TOKENINFO_URL, idToken).retrieve().body(Map.class);

      if (tokenInfo != null && tokenInfo.containsKey("email")) {
        var email = String.valueOf(tokenInfo.get("email")).trim().toLowerCase();
        var emailVerified = Boolean.parseBoolean(String.valueOf(tokenInfo.get("email_verified")));
        if (!emailVerified) {
          throw new BadCredentialsException("Email tài khoản Google chưa được xác thực");
        }

        // Verify client ID audience if configured
        if (configuredClientId != null && !configuredClientId.isBlank()) {
          var aud = String.valueOf(tokenInfo.get("aud"));
          var azp = String.valueOf(tokenInfo.get("azp"));
          if (!configuredClientId.equals(aud) && !configuredClientId.equals(azp)) {
            log.warn(
                "Google token audience mismatch: aud={}, expected={}", aud, configuredClientId);
            throw new BadCredentialsException("Google Client ID không khớp với hệ thống");
          }
        }

        var name =
            tokenInfo.containsKey("name")
                ? String.valueOf(tokenInfo.get("name"))
                : email.substring(0, email.indexOf('@'));
        var picture =
            tokenInfo.containsKey("picture") ? String.valueOf(tokenInfo.get("picture")) : null;
        var sub =
            tokenInfo.containsKey("sub") ? String.valueOf(tokenInfo.get("sub")) : "google-" + email;

        return new GoogleUserPayload(email, name, picture, sub);
      }
    } catch (BadCredentialsException bce) {
      throw bce;
    } catch (Exception ex) {
      log.debug("TokenInfo API failed ({}), thử gọi Google UserInfo API...", ex.getMessage());
      try {
        @SuppressWarnings("unchecked")
        Map<String, Object> userInfo =
            restClient
                .get()
                .uri("https://www.googleapis.com/oauth2/v3/userinfo")
                .header("Authorization", "Bearer " + idToken)
                .retrieve()
                .body(Map.class);

        if (userInfo != null && userInfo.containsKey("email")) {
          var email = String.valueOf(userInfo.get("email")).trim().toLowerCase();
          var name =
              userInfo.containsKey("name")
                  ? String.valueOf(userInfo.get("name"))
                  : email.substring(0, email.indexOf('@'));
          var picture =
              userInfo.containsKey("picture") ? String.valueOf(userInfo.get("picture")) : null;
          var sub =
              userInfo.containsKey("sub") ? String.valueOf(userInfo.get("sub")) : "google-" + email;
          return new GoogleUserPayload(email, name, picture, sub);
        }
      } catch (Exception e) {
        log.debug("Google userinfo API failed: {}", e.getMessage());
      }

      var fallbackPayload = tryParseJwtPayload(idToken);
      if (fallbackPayload != null) {
        return fallbackPayload;
      }
      throw new BadCredentialsException(
          "Google ID Token không hợp lệ hoặc đã hết hạn: " + ex.getMessage());
    }

    throw new BadCredentialsException("Google ID Token không hợp lệ");
  }

  private GoogleUserPayload parseDemoToken(String demoToken) {
    var clean = demoToken.replace("demo_", "").replace("mock_", "");
    var email = clean.contains("@") ? clean.toLowerCase() : "google.traveler@vista.vn";
    return new GoogleUserPayload(
        email,
        "VISTA Google Explorer",
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
        "demo-google-" + email);
  }

  private GoogleUserPayload tryParseJwtPayload(String jwtToken) {
    try {
      var parts = jwtToken.split("\\.");
      if (parts.length >= 2) {
        var payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
        var jsonString = new String(payloadBytes, StandardCharsets.UTF_8);
        JsonNode node = objectMapper.readTree(jsonString);
        if (node.hasNonNull("email")) {
          var email = node.get("email").asText().toLowerCase();
          var name =
              node.hasNonNull("name")
                  ? node.get("name").asText()
                  : email.substring(0, email.indexOf('@'));
          var picture = node.hasNonNull("picture") ? node.get("picture").asText() : null;
          var sub = node.hasNonNull("sub") ? node.get("sub").asText() : "google-" + email;
          return new GoogleUserPayload(email, name, picture, sub);
        }
      }
    } catch (Exception e) {
      log.debug("Fallback JWT parse failed", e);
    }
    return null;
  }
}
