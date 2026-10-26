package com.vista.map.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.map.api.RoutingController.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Service;
import org.springframework.web.ErrorResponseException;

/** No persistence, coordinate logs or client-selected upstream URLs. Key remains server-only. */
@Service
public class RoutingService {
  private final ObjectMapper json;
  private final String key;
  private final String base;
  private final long intervalNanos;
  private final Duration timeout;
  private final HttpClient client =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
  private long nextRequest;
  private long cooldown;

  @Autowired
  public RoutingService(
      ObjectMapper json,
      @Value("${ORS_API_KEY:}") String key,
      @Value("${vista.map.routing.minimum-interval-ms:2000}") long intervalMs) {
    this(json, key, "https://api.openrouteservice.org", intervalMs, Duration.ofSeconds(15));
  }

  // Explicit constructor for isolated HTTP integration tests; not selected from a client request.
  public RoutingService(
      ObjectMapper json, String key, String base, long intervalMs, Duration timeout) {
    this.json = json;
    this.key = key;
    this.base = base;
    this.intervalNanos = Math.max(0, intervalMs) * 1_000_000L;
    this.timeout = timeout;
  }

  public Result compute(Input input) {
    if (input == null
        || !valid(input.origin())
        || !valid(input.destination())
        || !List.of("DRIVING", "WALKING").contains(input.mode() == null ? "" : input.mode())
        || (input.origin().latitude().equals(input.destination().latitude())
            && input.origin().longitude().equals(input.destination().longitude())))
      throw error(
          HttpStatus.BAD_REQUEST,
          "INVALID_ROUTE",
          "Chọn hai địa điểm hợp lệ khác nhau và phương tiện được hỗ trợ.");
    if (key.isBlank())
      throw error(
          HttpStatus.SERVICE_UNAVAILABLE,
          "ROUTING_UNCONFIGURED",
          "Chức năng chỉ đường chưa được cấu hình. Bạn vẫn có thể xem bản đồ và địa điểm.");
    synchronized (this) {
      long now = System.nanoTime();
      if (now < nextRequest || now < cooldown)
        throw error(
            HttpStatus.TOO_MANY_REQUESTS,
            "ROUTING_LIMIT",
            "Dịch vụ chỉ đường đang đạt giới hạn. Vui lòng thử lại sau.");
      nextRequest = now + intervalNanos;
    }
    try {
      String profile = input.mode().equals("DRIVING") ? "driving-car" : "foot-walking";
      var a = input.origin();
      var b = input.destination();
      String payload =
          json.writeValueAsString(
              Map.of(
                  "coordinates",
                  List.of(
                      List.of(a.longitude(), a.latitude()), List.of(b.longitude(), b.latitude())),
                  "instructions",
                  false));
      var request =
          HttpRequest.newBuilder(URI.create(base + "/v2/directions/" + profile + "/geojson"))
              .timeout(timeout)
              .header("Authorization", key)
              .header("Content-Type", "application/json")
              .header("Accept", "application/geo+json, application/json")
              .POST(HttpRequest.BodyPublishers.ofString(payload))
              .build();
      var response = client.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() == 429) {
        synchronized (this) {
          cooldown = System.nanoTime() + Duration.ofSeconds(60).toNanos();
        }
        throw error(
            HttpStatus.TOO_MANY_REQUESTS,
            "ROUTING_QUOTA",
            "Dịch vụ chỉ đường đã đạt hạn mức. Vui lòng thử lại sau; bản đồ vẫn dùng được.");
      }
      if (response.statusCode() == 401 || response.statusCode() == 403)
        throw error(
            HttpStatus.SERVICE_UNAVAILABLE,
            "ROUTING_KEY_REJECTED",
            "Dịch vụ chỉ đường chưa được cấp quyền hoặc tài khoản đã hết hạn mức. Vui lòng liên hệ quản trị.");
      var data = json.readTree(response.body());
      int code = data.path("error").path("code").asInt();
      if (code == 2009 || code == 2010) return null;
      if (response.statusCode() != 200)
        throw error(
            HttpStatus.SERVICE_UNAVAILABLE,
            "ROUTING_UNAVAILABLE",
            "Dịch vụ chỉ đường tạm thời không khả dụng.");
      var feature = data.path("features").path(0);
      if (!feature.path("geometry").path("type").asText().equals("LineString"))
        throw new IllegalArgumentException();
      var path = new ArrayList<PathPoint>();
      for (var p : feature.path("geometry").path("coordinates")) {
        if (!p.isArray() || p.size() < 2 || !p.get(0).isNumber() || !p.get(1).isNumber())
          throw new IllegalArgumentException();
        double lng = p.get(0).asDouble(), lat = p.get(1).asDouble();
        if (!Double.isFinite(lng)
            || !Double.isFinite(lat)
            || Math.abs(lng) > 180
            || Math.abs(lat) > 90) throw new IllegalArgumentException();
        path.add(new PathPoint(lat, lng));
      }
      var summary = feature.path("properties").path("summary");
      double distance = summary.path("distance").asDouble(-1),
          seconds = summary.path("duration").asDouble(-1);
      if (path.size() < 2
          || path.size() > 100000
          || !Double.isFinite(distance)
          || !Double.isFinite(seconds)
          || distance < 0
          || seconds < 0) throw new IllegalArgumentException();
      return new Result(
          input,
          path,
          distance,
          Math.round(seconds * 1000),
          List.of("Thời gian ước tính, chưa tính giao thông trực tiếp."),
          "© openrouteservice.org by HeiGIT · © OpenStreetMap contributors");
    } catch (ErrorResponseException ex) {
      throw ex;
    } catch (HttpTimeoutException ex) {
      throw error(
          HttpStatus.GATEWAY_TIMEOUT,
          "ROUTING_TIMEOUT",
          "Hết thời gian chờ tính tuyến. Hãy thử lại.");
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      throw error(
          HttpStatus.SERVICE_UNAVAILABLE, "ROUTING_INTERRUPTED", "Yêu cầu chỉ đường bị gián đoạn.");
    } catch (Exception ex) {
      throw error(
          HttpStatus.SERVICE_UNAVAILABLE,
          "ROUTING_UNAVAILABLE",
          "Không lấy được tuyến đường. Bạn vẫn có thể xem thông tin địa điểm.");
    }
  }

  private static boolean valid(Point p) {
    return p != null
        && p.latitude() != null
        && p.longitude() != null
        && Double.isFinite(p.latitude())
        && Double.isFinite(p.longitude())
        && Math.abs(p.latitude()) <= 90
        && Math.abs(p.longitude()) <= 180
        && p.label() != null
        && p.label().length() <= 200;
  }

  private static ErrorResponseException error(HttpStatus status, String code, String detail) {
    var body = ProblemDetail.forStatusAndDetail(status, detail);
    body.setProperty("code", code);
    body.setProperty("requestId", org.slf4j.MDC.get("requestId"));
    return new ErrorResponseException(status, body, null);
  }
}
