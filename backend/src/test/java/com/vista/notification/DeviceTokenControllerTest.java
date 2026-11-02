package com.vista.notification;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.vista.common.security.CurrentUserProvider;
import com.vista.common.security.SecurityConfiguration;
import com.vista.common.web.GlobalExceptionHandler;
import com.vista.notification.api.DeviceTokenController;
import com.vista.notification.domain.DeviceTokenRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = {DeviceTokenController.class})
@Import({GlobalExceptionHandler.class, SecurityConfiguration.class})
class DeviceTokenControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private DeviceTokenRepository deviceTokenRepository;
  @MockitoBean private CurrentUserProvider currentUserProvider;

  private UUID currentUserId;

  @BeforeEach
  void setUp() {
    currentUserId = UUID.randomUUID();
    when(currentUserProvider.getCurrentUserId()).thenReturn(currentUserId);
  }

  @Test
  @WithMockUser
  @DisplayName("User can unregister their own device token")
  void unregisterOwnTokenSuccess() throws Exception {
    String token = "device-token-123";
    when(deviceTokenRepository.deactivateByUserAndToken(currentUserId, token)).thenReturn(1);

    mockMvc
        .perform(delete("/api/v1/devices/tokens/{token}", token))
        .andExpect(status().isNoContent());

    verify(deviceTokenRepository).deactivateByUserAndToken(currentUserId, token);
  }

  @Test
  @WithMockUser
  @DisplayName("User cannot unregister another user's device token (404 Not Found - IDOR prevention)")
  void unregisterOtherUserTokenReturnsNotFound() throws Exception {
    String token = "victim-device-token-999";
    when(deviceTokenRepository.deactivateByUserAndToken(currentUserId, token)).thenReturn(0);

    mockMvc
        .perform(delete("/api/v1/devices/tokens/{token}", token))
        .andExpect(status().isNotFound());

    verify(deviceTokenRepository).deactivateByUserAndToken(currentUserId, token);
  }
}

