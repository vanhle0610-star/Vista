package com.vista.community;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.vista.community.application.CommunityService;
import com.vista.destination.application.DestinationQueryService;
import com.vista.user.application.UserService;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.ErrorResponseException;

class CommunityVisibilityBoundaryTest {
  @Test
  void deletedPostCannotBeRestoredAndIsDistinctFromMissingPost() {
    var db = mock(JdbcTemplate.class);
    var id = UUID.randomUUID();
    var actor = UUID.randomUUID();
    var service =
        new CommunityService(db, mock(UserService.class), mock(DestinationQueryService.class));
    when(db.queryForList("SELECT * FROM posts WHERE id=? FOR UPDATE", id))
        .thenReturn(List.of(Map.of("deleted_at", Timestamp.from(Instant.now()))));
    var deleted = assertThrows(ErrorResponseException.class, () -> service.restore(id, actor, 0));
    assertEquals(409, deleted.getStatusCode().value());
    assertEquals("POST_DELETED", deleted.getBody().getProperties().get("code"));
    when(db.queryForList("SELECT * FROM posts WHERE id=? FOR UPDATE", id)).thenReturn(List.of());
    var missing = assertThrows(ErrorResponseException.class, () -> service.restore(id, actor, 0));
    assertEquals(404, missing.getStatusCode().value());
    assertEquals("POST_NOT_FOUND", missing.getBody().getProperties().get("code"));
  }

  @Test
  void staleModerationVersionIsRejectedBeforeChangingVisibility() {
    var db = mock(JdbcTemplate.class);
    var id = UUID.randomUUID();
    var service =
        new CommunityService(db, mock(UserService.class), mock(DestinationQueryService.class));
    when(db.queryForList("SELECT * FROM posts WHERE id=? FOR UPDATE", id))
        .thenReturn(List.of(Map.of("version", 3L, "status", "VISIBLE")));
    var conflict =
        assertThrows(ErrorResponseException.class, () -> service.hide(id, UUID.randomUUID(), 2));
    assertEquals(409, conflict.getStatusCode().value());
    assertEquals("VERSION_CONFLICT", conflict.getBody().getProperties().get("code"));
  }
}
