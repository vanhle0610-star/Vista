package com.vista.trip;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.vista.trip.application.DatabaseTripAccessService;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.AccessDeniedException;

class DatabaseTripAccessServiceTest {

  private JdbcClient jdbcClient;
  private DatabaseTripAccessService tripAccessService;

  @BeforeEach
  void setUp() {
    jdbcClient = mock(JdbcClient.class);
    tripAccessService = new DatabaseTripAccessService(jdbcClient);
  }

  @Test
  void nullTripOrUserReturnsFalseAndThrowsException() {
    assertThat(tripAccessService.isOwner(null, UUID.randomUUID())).isFalse();
    assertThat(tripAccessService.isOwner(UUID.randomUUID(), null)).isFalse();
    assertThat(tripAccessService.isMember(null, UUID.randomUUID())).isFalse();
    assertThat(tripAccessService.isMember(UUID.randomUUID(), null)).isFalse();

    assertThatThrownBy(() -> tripAccessService.requireOwner(null, UUID.randomUUID()))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> tripAccessService.requireMember(UUID.randomUUID(), null))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void requireOwnerThrowsAccessDeniedWhenNotOwner() {
    UUID tripId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    var statementSpec = mock(JdbcClient.StatementSpec.class);
    var mappedQuerySpec = mock(JdbcClient.MappedQuerySpec.class);

    when(jdbcClient.sql(anyString())).thenReturn(statementSpec);
    when(statementSpec.param(anyString(), anyString())).thenReturn(statementSpec);
    when(statementSpec.param("tripId", tripId)).thenReturn(statementSpec);
    when(statementSpec.param("userId", userId)).thenReturn(statementSpec);
    when(statementSpec.query(Integer.class)).thenReturn(mappedQuerySpec);
    when(mappedQuerySpec.single()).thenReturn(0);

    assertThatThrownBy(() -> tripAccessService.requireOwner(tripId, userId))
        .isInstanceOf(AccessDeniedException.class)
        .hasMessageContaining("Bạn không phải chủ sở hữu của chuyến đi này");
  }

  @Test
  void requireMemberThrowsAccessDeniedWhenNotMember() {
    UUID tripId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    var statementSpec = mock(JdbcClient.StatementSpec.class);
    var mappedQuerySpec = mock(JdbcClient.MappedQuerySpec.class);

    when(jdbcClient.sql(anyString())).thenReturn(statementSpec);
    when(statementSpec.param(anyString(), anyString())).thenReturn(statementSpec);
    when(statementSpec.param("tripId", tripId)).thenReturn(statementSpec);
    when(statementSpec.param("userId", userId)).thenReturn(statementSpec);
    when(statementSpec.query(Integer.class)).thenReturn(mappedQuerySpec);
    when(mappedQuerySpec.single()).thenReturn(0);

    assertThatThrownBy(() -> tripAccessService.requireMember(tripId, userId))
        .isInstanceOf(AccessDeniedException.class)
        .hasMessageContaining(
            "Bạn không có quyền truy cập hoặc không phải thành viên của chuyến đi này");
  }
}
