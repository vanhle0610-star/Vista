package com.vista.trip.api;

import com.vista.common.security.CurrentUserProvider;
import com.vista.trip.api.dto.TripDetailResponse;
import com.vista.trip.api.dto.TripMemberResponse;
import com.vista.trip.application.TripAccessService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.sql.Date;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/trips")
@Tag(name = "Trips", description = "Quản lý thông tin chuyến đi và thành viên (TV2 / TV4)")
@SecurityRequirement(name = "bearerAuth")
public class TripController {

  private final JdbcClient jdbcClient;
  private final TripAccessService tripAccessService;
  private final CurrentUserProvider currentUserProvider;

  public TripController(
      JdbcClient jdbcClient,
      TripAccessService tripAccessService,
      CurrentUserProvider currentUserProvider) {
    this.jdbcClient = jdbcClient;
    this.tripAccessService = tripAccessService;
    this.currentUserProvider = currentUserProvider;
  }

  @GetMapping("/{tripId}")
  @Operation(summary = "Lấy thông tin chi tiết chuyến đi")
  public ResponseEntity<TripDetailResponse> getTripDetail(@PathVariable UUID tripId) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    tripAccessService.requireMember(tripId, currentUserId);

    return jdbcClient
        .sql(
            """
            SELECT id, title, start_date, end_date, destination_summary, budget_total, currency, status, owner_id
            FROM trips
            WHERE id = :tripId
            """)
        .param("tripId", tripId)
        .query(
            (rs, rowNum) -> {
              Date startDate = rs.getDate("start_date");
              Date endDate = rs.getDate("end_date");
              return new TripDetailResponse(
                  (UUID) rs.getObject("id"),
                  rs.getString("title"),
                  startDate != null ? startDate.toLocalDate() : null,
                  endDate != null ? endDate.toLocalDate() : null,
                  rs.getString("destination_summary"),
                  rs.getBigDecimal("budget_total"),
                  rs.getString("currency"),
                  rs.getString("status"),
                  (UUID) rs.getObject("owner_id"));
            })
        .optional()
        .map(ResponseEntity::ok)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chuyến đi"));
  }

  @GetMapping("/{tripId}/members")
  @Operation(summary = "Lấy danh sách thành viên chuyến đi")
  public ResponseEntity<List<TripMemberResponse>> getTripMembers(@PathVariable UUID tripId) {
    UUID currentUserId = currentUserProvider.getCurrentUserId();
    tripAccessService.requireMember(tripId, currentUserId);

    List<TripMemberResponse> members =
        jdbcClient
            .sql(
                """
                SELECT tm.user_id, u.display_name, u.email, tm.role, tm.budget_share
                FROM trip_members tm
                JOIN users u ON u.id = tm.user_id
                WHERE tm.trip_id = :tripId AND tm.status != 'REMOVED'
                ORDER BY CASE WHEN tm.role = 'OWNER' THEN 0 ELSE 1 END, u.display_name ASC
                """)
            .param("tripId", tripId)
            .query(
                (rs, rowNum) ->
                    new TripMemberResponse(
                        (UUID) rs.getObject("user_id"),
                        rs.getString("display_name"),
                        rs.getString("email"),
                        rs.getString("role"),
                        rs.getBigDecimal("budget_share")))
            .list();

    return ResponseEntity.ok(members);
  }
}
