package com.vista.map.api;

import com.vista.map.application.RoutingService;
import java.util.List;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/map")
public class RoutingController {
  public record Point(Double latitude, Double longitude, String label) {
    @Override
    public String toString() {
      return "Point[redacted]";
    }
  }

  public record Input(Point origin, Point destination, String mode, boolean fromGps) {
    @Override
    public String toString() {
      return "RouteInput[redacted]";
    }
  }

  public record PathPoint(double lat, double lng) {}

  public record Result(
      Input input,
      List<PathPoint> path,
      double distanceMeters,
      long durationMillis,
      List<String> warnings,
      String attribution) {
    @Override
    public String toString() {
      return "RouteResult[geometry redacted]";
    }
  }

  private final RoutingService routing;

  public RoutingController(RoutingService routing) {
    this.routing = routing;
  }

  @PostMapping("/routes")
  public Result compute(@RequestBody Input input) {
    return routing.compute(input);
  }

  @ExceptionHandler(ErrorResponseException.class)
  public ProblemDetail problem(ErrorResponseException ex) {
    return ex.getBody();
  }
}
