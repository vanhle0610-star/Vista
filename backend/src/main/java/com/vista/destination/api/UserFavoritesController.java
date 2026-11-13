package com.vista.destination.api;

import com.vista.common.security.CurrentUserProvider;
import com.vista.destination.api.dto.DestinationSummaryDto;
import com.vista.destination.service.DestinationNotFoundException;
import com.vista.destination.service.DestinationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/me/favorites")
@Tag(
    name = "User Favorites",
    description = "API Danh sách yêu thích của người dùng hiện tại (W3-TV1-03)")
@SecurityRequirement(name = "bearerAuth")
public class UserFavoritesController {

  private final DestinationService destinationService;
  private final CurrentUserProvider currentUserProvider;

  public UserFavoritesController(
      DestinationService destinationService, CurrentUserProvider currentUserProvider) {
    this.destinationService = destinationService;
    this.currentUserProvider = currentUserProvider;
  }

  @GetMapping
  @Operation(summary = "Lấy danh sách các điểm đến yêu thích của người dùng hiện tại")
  public ResponseEntity<List<DestinationSummaryDto>> getMyFavorites() {
    UUID userId = currentUserProvider.getCurrentUserId();
    return ResponseEntity.ok(destinationService.getFavorites(userId));
  }

  @PostMapping("/{destinationId}")
  @Operation(summary = "Thêm điểm đến vào danh sách yêu thích (POST)")
  public ResponseEntity<Void> addMyFavoritePost(@PathVariable UUID destinationId) {
    UUID userId = currentUserProvider.getCurrentUserId();
    destinationService.addFavorite(destinationId, userId);
    return ResponseEntity.noContent().build();
  }

  @PutMapping("/{destinationId}")
  @Operation(summary = "Thêm điểm đến vào danh sách yêu thích (PUT)")
  public ResponseEntity<Void> addMyFavoritePut(@PathVariable UUID destinationId) {
    UUID userId = currentUserProvider.getCurrentUserId();
    destinationService.addFavorite(destinationId, userId);
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/{destinationId}")
  @Operation(summary = "Bỏ điểm đến khỏi danh sách yêu thích (DELETE)")
  public ResponseEntity<Void> removeMyFavorite(@PathVariable UUID destinationId) {
    UUID userId = currentUserProvider.getCurrentUserId();
    destinationService.removeFavorite(destinationId, userId);
    return ResponseEntity.noContent().build();
  }

  @ExceptionHandler(DestinationNotFoundException.class)
  public ProblemDetail handleDestinationNotFound(
      DestinationNotFoundException ex, HttpServletRequest request) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    problem.setType(URI.create("https://vista.example/errors/not-found"));
    problem.setTitle("Destination Not Found");
    problem.setInstance(URI.create(request.getRequestURI()));
    problem.setProperty("code", "DESTINATION_NOT_FOUND");
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }
}
