package com.vista.community;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.vista.community.application.CommunityService;
import com.vista.destination.application.DestinationQueryService;
import com.vista.user.application.UserService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.ErrorResponseException;

class CommunityLikeVisibilityTest {
  @Test
  void hiddenPostCannotBeLikedOrUnlikedAndNoLikeIsWritten() {
    var db = mock(JdbcTemplate.class);
    var post = UUID.randomUUID();
    var user = UUID.randomUUID();
    var service =
        new CommunityService(db, mock(UserService.class), mock(DestinationQueryService.class));
    when(db.queryForList("SELECT * FROM posts WHERE id=? AND deleted_at IS NULL FOR UPDATE", post))
        .thenReturn(List.of(Map.of("id", post, "status", "HIDDEN")));
    for (boolean liked : List.of(true, false)) {
      var error =
          assertThrows(ErrorResponseException.class, () -> service.setLiked(user, post, liked));
      assertEquals(404, error.getStatusCode().value());
    }
    verify(db, never()).update(anyString(), any(Object[].class));
  }

  @Test
  void deletedPostCannotBeLiked() {
    var db = mock(JdbcTemplate.class);
    var service =
        new CommunityService(db, mock(UserService.class), mock(DestinationQueryService.class));
    var error =
        assertThrows(
            ErrorResponseException.class,
            () -> service.setLiked(UUID.randomUUID(), UUID.randomUUID(), true));
    assertEquals(404, error.getStatusCode().value());
    verify(db, never()).update(anyString(), any(Object[].class));
  }
}
