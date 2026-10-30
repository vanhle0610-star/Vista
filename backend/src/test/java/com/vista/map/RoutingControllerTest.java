package com.vista.map;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import com.vista.map.api.RoutingController.*;
import com.vista.map.application.RoutingService;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.web.ErrorResponseException;

class RoutingControllerTest {
  private final ObjectMapper json = new ObjectMapper();

  private Input input(String mode) {
    return new Input(new Point(16.0, 108.0, "A"), new Point(16.1, 108.1, "B"), mode, false);
  }

  private int status(Runnable action) {
    return assertThrows(ErrorResponseException.class, action::run).getStatusCode().value();
  }

  private HttpServer server(
      int status, String response, AtomicReference<String> request, AtomicInteger count)
      throws Exception {
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/",
        exchange -> {
          count.incrementAndGet();
          request.set(
              exchange.getRequestURI().getPath()
                  + "\n"
                  + new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
          assertEquals(
              "test-server-only-key", exchange.getRequestHeaders().getFirst("Authorization"));
          byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
          exchange.sendResponseHeaders(status, bytes.length);
          exchange.getResponseBody().write(bytes);
          exchange.close();
        });
    server.start();
    return server;
  }

  private RoutingService service(HttpServer server, long interval) {
    return new RoutingService(
        json,
        "test-server-only-key",
        "http://127.0.0.1:" + server.getAddress().getPort(),
        interval,
        Duration.ofSeconds(2));
  }

  @Test
  void preservesAllWaypointsAndSumsRealSegmentsIncludingRoundTrip() throws Exception {
    var request = new AtomicReference<String>();
    var server =
        server(
            200,
            """
        {"features":[{"geometry":{"type":"LineString","coordinates":[[108,16],[108.2,16.2],[108.3,16.3],[108,16]]},
        "properties":{"summary":{"distance":6000,"duration":360},"segments":[
        {"distance":1000,"duration":60},{"distance":2000,"duration":120},{"distance":3000,"duration":180}]}}]}
        """,
            request,
            new AtomicInteger());
    try {
      var origin = new Point(16.0, 108.0, "Xuất phát");
      var input =
          new Input(
              origin,
              origin,
              "DRIVING",
              false,
              List.of(
                  new Point(16.2, 108.2, "Điểm dừng 1"), new Point(16.3, 108.3, "Điểm dừng 2")));
      var result = service(server, 0).compute(input);
      var coordinates = json.readTree(request.get().split("\n", 2)[1]).path("coordinates");
      assertTrue(json.readTree(request.get().split("\n", 2)[1]).path("instructions").asBoolean());
      assertEquals(4, coordinates.size());
      assertEquals(108.2, coordinates.path(1).path(0).asDouble());
      assertEquals(108.3, coordinates.path(2).path(0).asDouble());
      assertEquals(108.0, coordinates.path(3).path(0).asDouble());
      assertEquals(3, result.legs().size());
      assertEquals("Điểm dừng 1", result.legs().get(0).toLabel());
      assertEquals(6000, result.distanceMeters());
      assertEquals(360000, result.durationMillis());
      assertEquals(
          result.durationMillis(), result.legs().stream().mapToLong(Leg::durationMillis).sum());
    } finally {
      server.stop(0);
    }
  }

  @Test
  void rejectsInvalidOrTooManyWaypointsAndIncompleteUpstreamLegs() throws Exception {
    var base = input("DRIVING");
    var service = new RoutingService(json, "", 0);
    assertEquals(
        400,
        status(
            () ->
                service.compute(
                    new Input(
                        base.origin(),
                        base.destination(),
                        "DRIVING",
                        false,
                        List.of(new Point(99.0, 108.0, "Không hợp lệ"))))));
    assertEquals(
        400,
        status(
            () ->
                service.compute(
                    new Input(
                        base.origin(),
                        base.destination(),
                        "DRIVING",
                        false,
                        java.util.Collections.nCopies(5, new Point(16.2, 108.2, "Điểm dừng"))))));
    var server =
        server(
            200,
            "{\"features\":[{\"geometry\":{\"type\":\"LineString\",\"coordinates\":[[108,16],[108.1,16.1]]},\"properties\":{\"summary\":{\"distance\":2000,\"duration\":120}}}]}",
            new AtomicReference<>(),
            new AtomicInteger());
    try {
      assertEquals(
          503,
          status(
              () ->
                  service(server, 0)
                      .compute(
                          new Input(
                              base.origin(),
                              base.destination(),
                              "DRIVING",
                              false,
                              List.of(new Point(16.2, 108.2, "Điểm dừng"))))));
    } finally {
      server.stop(0);
    }
  }

  @Test
  void validatesMissingCoordinatesModeAndConfiguration() {
    var service = new RoutingService(json, "", 2000);
    assertEquals(
        400,
        status(
            () ->
                service.compute(
                    new Input(
                        new Point(null, 108.0, "A"),
                        input("DRIVING").destination(),
                        "DRIVING",
                        false))));
    assertEquals(
        400,
        status(
            () ->
                service.compute(
                    new Input(
                        new Point(91.0, 108.0, "A"),
                        input("DRIVING").destination(),
                        "DRIVING",
                        false))));
    assertEquals(400, status(() -> service.compute(input("MOTORCYCLE"))));
    assertEquals(503, status(() -> service.compute(input("DRIVING"))));
    assertFalse(input("DRIVING").toString().contains("108"));
  }

  @Test
  void sendsServerKeyInHeaderAndConvertsGeoJsonUsingCorrectProfile() throws Exception {
    var request = new AtomicReference<String>();
    var count = new AtomicInteger();
    var server =
        server(
            200,
            "{\"features\":[{\"geometry\":{\"type\":\"LineString\",\"coordinates\":[[108,16],[108.1,16.1]]},\"properties\":{\"summary\":{\"distance\":2000,\"duration\":120}}}]}",
            request,
            count);
    try {
      var service = service(server, 0);
      var result = service.compute(input("DRIVING"));
      assertTrue(request.get().startsWith("/v2/directions/driving-car/geojson"));
      var body = json.readTree(request.get().split("\n", 2)[1]);
      assertEquals(108, body.path("coordinates").path(0).path(0).asDouble());
      assertEquals(120000, result.durationMillis());
      assertEquals(2000, result.distanceMeters());
      assertEquals(108, result.path().getFirst().lng());
      service.compute(input("WALKING"));
      assertTrue(request.get().startsWith("/v2/directions/foot-walking/geojson"));
      assertFalse(result.toString().contains("108"));
    } finally {
      server.stop(0);
    }
  }

  @Test
  void noRouteIsDistinctFromNetworkFailure() throws Exception {
    var server =
        server(404, "{\"error\":{\"code\":2009}}", new AtomicReference<>(), new AtomicInteger());
    try {
      assertNull(service(server, 0).compute(input("DRIVING")));
    } finally {
      server.stop(0);
    }
  }

  @Test
  void quotaCooldownPreventsFurtherUpstreamCalls() throws Exception {
    var count = new AtomicInteger();
    var server = server(429, "{}", new AtomicReference<>(), count);
    try {
      var service = service(server, 0);
      assertEquals(429, status(() -> service.compute(input("DRIVING"))));
      assertEquals(429, status(() -> service.compute(input("DRIVING"))));
      assertEquals(1, count.get());
    } finally {
      server.stop(0);
    }
  }

  @Test
  void rejectedKeyAndMalformedResponseDoNotLeakUpstreamDetails() throws Exception {
    for (int httpStatus : new int[] {403, 200}) {
      var server =
          server(
              httpStatus,
              "{\"secret\":\"test-server-only-key\"}",
              new AtomicReference<>(),
              new AtomicInteger());
      try {
        var error =
            assertThrows(
                ErrorResponseException.class, () -> service(server, 0).compute(input("DRIVING")));
        assertEquals(503, error.getStatusCode().value());
        assertFalse(error.getBody().toString().contains("test-server-only-key"));
      } finally {
        server.stop(0);
      }
    }
  }

  @Test
  void timeoutAndLocalRateLimitAreExplicit() throws Exception {
    var slow = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    slow.createContext(
        "/",
        exchange -> {
          try {
            Thread.sleep(200);
          } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
          } finally {
            exchange.close();
          }
        });
    slow.start();
    try {
      var service =
          new RoutingService(
              json,
              "test-server-only-key",
              "http://127.0.0.1:" + slow.getAddress().getPort(),
              2000,
              Duration.ofMillis(30));
      assertEquals(504, status(() -> service.compute(input("DRIVING"))));
      assertEquals(429, status(() -> service.compute(input("DRIVING"))));
    } finally {
      slow.stop(0);
    }
  }
}
