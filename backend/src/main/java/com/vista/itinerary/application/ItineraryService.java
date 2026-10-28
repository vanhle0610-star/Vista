package com.vista.itinerary.application;

import com.vista.destination.application.DestinationQueryService;
import com.vista.itinerary.api.dto.ItineraryResponse;
import com.vista.itinerary.api.dto.ItineraryResponse.ItineraryDayResponse;
import com.vista.itinerary.api.dto.ItineraryResponse.ItineraryItemResponse;
import com.vista.itinerary.api.dto.MergeItineraryRequest;
import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service("itineraryAiService")
public class ItineraryService {
  private final JdbcClient jdbcClient;
  private final DestinationQueryService destinationQueryService;

  public ItineraryService(
      JdbcClient jdbcClient, DestinationQueryService destinationQueryService) {
    this.jdbcClient = jdbcClient;
    this.destinationQueryService = destinationQueryService;
  }

  public ItineraryResponse get(UUID tripId) {
    Map<UUID, MutableDay> days = new LinkedHashMap<>();
    jdbcClient
        .sql(
            """
            SELECT d.id AS day_id, d.day_number, d.trip_date, d.version AS day_version,
                   i.id AS item_id, i.destination_id, dest.name AS destination_name,
                   i.custom_stop_name, i.start_time, i.end_time, i.sort_order, i.note,
                   i.source, i.version AS item_version
            FROM itinerary_days d
            LEFT JOIN itinerary_items i ON i.itinerary_day_id = d.id
            LEFT JOIN destinations dest ON dest.id = i.destination_id
            WHERE d.trip_id = :tripId
            ORDER BY d.day_number, i.sort_order
            """)
        .param("tripId", tripId)
        .query(
            resultSet -> {
              while (resultSet.next()) {
                UUID dayId = (UUID) resultSet.getObject("day_id");
                int dayNumber = resultSet.getInt("day_number");
                LocalDate tripDate = resultSet.getObject("trip_date", LocalDate.class);
                long dayVersion = resultSet.getLong("day_version");
                MutableDay day =
                    days.computeIfAbsent(
                        dayId,
                        ignored -> new MutableDay(dayId, dayNumber, tripDate, dayVersion));
                UUID itemId = (UUID) resultSet.getObject("item_id");
                if (itemId != null) {
                  Time startTime = resultSet.getTime("start_time");
                  Time endTime = resultSet.getTime("end_time");
                  day.activities.add(
                      new ItineraryItemResponse(
                          itemId,
                          (UUID) resultSet.getObject("destination_id"),
                          resultSet.getString("destination_name"),
                          resultSet.getString("custom_stop_name"),
                          startTime == null ? null : startTime.toLocalTime(),
                          endTime == null ? null : endTime.toLocalTime(),
                          resultSet.getInt("sort_order"),
                          resultSet.getString("note"),
                          resultSet.getString("source"),
                          resultSet.getLong("item_version")));
                }
              }
              return null;
            });
    return new ItineraryResponse(
        tripId,
        days.values().stream()
            .map(
                day ->
                    new ItineraryDayResponse(
                        day.id, day.dayNumber, day.tripDate, day.version, day.activities))
            .toList());
  }

  @Transactional
  public ItineraryResponse merge(
      UUID tripId, UUID currentUserId, MergeItineraryRequest request) {
    LocalDate startDate =
        jdbcClient
            .sql("SELECT start_date FROM trips WHERE id = :tripId")
            .param("tripId", tripId)
            .query((resultSet, rowNumber) -> resultSet.getObject(1, LocalDate.class))
            .optional()
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chuyến đi"));

    validatePublishedDestinations(request);
    for (MergeItineraryRequest.ItineraryDayRequest day : request.days()) {
      UUID dayId = findOrCreateDay(tripId, startDate, day.dayNumber());
      for (MergeItineraryRequest.ItineraryItemRequest item : day.activities()) {
        mergeItem(dayId, currentUserId, item);
      }
    }
    return get(tripId);
  }

  private void validatePublishedDestinations(MergeItineraryRequest request) {
    request.days().stream()
        .flatMap(day -> day.activities().stream())
        .filter(item -> item.destinationId() != null)
        .forEach(
            item -> {
              if (!destinationQueryService.isPublished(item.destinationId())) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Itinerary contains an unpublished destination: " + item.destinationId());
              }
            });
  }

  private UUID findOrCreateDay(UUID tripId, LocalDate startDate, int dayNumber) {
    UUID existing =
        jdbcClient
            .sql(
                "SELECT id FROM itinerary_days WHERE trip_id = :tripId AND day_number = :dayNumber")
            .param("tripId", tripId)
            .param("dayNumber", dayNumber)
            .query(UUID.class)
            .optional()
            .orElse(null);
    if (existing != null) return existing;
    UUID dayId = UUID.randomUUID();
    jdbcClient
        .sql(
            """
            INSERT INTO itinerary_days(id, trip_id, day_number, trip_date)
            VALUES (:id, :tripId, :dayNumber, :tripDate)
            """)
        .param("id", dayId)
        .param("tripId", tripId)
        .param("dayNumber", dayNumber)
        .param("tripDate", Date.valueOf(startDate.plusDays(dayNumber - 1L)))
        .update();
    return dayId;
  }

  private void mergeItem(
      UUID dayId, UUID currentUserId, MergeItineraryRequest.ItineraryItemRequest item) {
    UUID existing =
        jdbcClient
            .sql(
                "SELECT id FROM itinerary_items WHERE itinerary_day_id = :dayId AND sort_order = :sortOrder ORDER BY updated_at DESC LIMIT 1")
            .param("dayId", dayId)
            .param("sortOrder", item.sortOrder())
            .query(UUID.class)
            .optional()
            .orElse(null);
    String customStopName = item.destinationId() == null ? item.customStopName() : null;
    if (existing == null) {
      jdbcClient
          .sql(
              """
              INSERT INTO itinerary_items(
                id, itinerary_day_id, destination_id, custom_stop_name, start_time, end_time,
                sort_order, note, source, updated_by)
              VALUES (
                :id, :dayId, :destinationId, :customStopName, :startTime, :endTime,
                :sortOrder, :note, :source, :updatedBy)
              """)
          .param("id", UUID.randomUUID())
          .param("dayId", dayId)
          .param("destinationId", item.destinationId())
          .param("customStopName", customStopName)
          .param("startTime", toSqlTime(item.startTime()))
          .param("endTime", toSqlTime(item.endTime()))
          .param("sortOrder", item.sortOrder())
          .param("note", item.note())
          .param("source", normalizeSource(item.source()))
          .param("updatedBy", currentUserId)
          .update();
      return;
    }
    jdbcClient
        .sql(
            """
            UPDATE itinerary_items SET destination_id=:destinationId, custom_stop_name=:customStopName,
              start_time=:startTime, end_time=:endTime, note=:note, source=:source,
              updated_by=:updatedBy, updated_at=CURRENT_TIMESTAMP, version=version + 1
            WHERE id=:id
            """)
        .param("destinationId", item.destinationId())
        .param("customStopName", customStopName)
        .param("startTime", toSqlTime(item.startTime()))
        .param("endTime", toSqlTime(item.endTime()))
        .param("note", item.note())
        .param("source", normalizeSource(item.source()))
        .param("updatedBy", currentUserId)
        .param("id", existing)
        .update();
  }

  private Time toSqlTime(java.time.LocalTime value) {
    return value == null ? null : Time.valueOf(value);
  }

  private String normalizeSource(String source) {
    if (source == null) return "MANUAL";
    return switch (source.trim().toUpperCase()) {
      case "AI_LOCAL", "AI_GEMINI", "AI_CLAUDE", "AI_OFFLINE", "MANUAL" -> source.trim().toUpperCase();
      default -> "MANUAL";
    };
  }

  private static final class MutableDay {
    private final UUID id;
    private final int dayNumber;
    private final LocalDate tripDate;
    private final long version;
    private final List<ItineraryItemResponse> activities = new ArrayList<>();

    private MutableDay(UUID id, int dayNumber, LocalDate tripDate, long version) {
      this.id = id;
      this.dayNumber = dayNumber;
      this.tripDate = tripDate;
      this.version = version;
    }
  }
}

