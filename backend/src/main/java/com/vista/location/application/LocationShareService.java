package com.vista.location.application;

import com.vista.location.api.dto.LocationShareResponse;
import com.vista.location.api.dto.StartLocationShareRequest;
import com.vista.location.api.dto.UpdateLocationShareRequest;
import com.vista.location.domain.LocationShare;
import com.vista.location.domain.LocationShareRepository;
import com.vista.trip.application.TripAccessService;
import com.vista.user.domain.UserEntity;
import com.vista.user.infrastructure.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class LocationShareService {

  private final LocationShareRepository locationShareRepository;
  private final TripAccessService tripAccessService;
  private final UserRepository userRepository;

  public LocationShareService(
      LocationShareRepository locationShareRepository,
      TripAccessService tripAccessService,
      UserRepository userRepository) {
    this.locationShareRepository = locationShareRepository;
    this.tripAccessService = tripAccessService;
    this.userRepository = userRepository;
  }

  public LocationShareResponse startShare(
      UUID tripId, UUID userId, StartLocationShareRequest request) {
    tripAccessService.requireMember(tripId, userId);

    Instant now = Instant.now();
    if (!request.expiresAt().isAfter(now)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Expiry timestamp must be strictly in the future");
    }
    Instant maxAllowed = now.plus(Duration.ofHours(4));
    if (request.expiresAt().isAfter(maxAllowed)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Thời lượng chia sẻ vị trí tối đa không được vượt quá 4 giờ.");
    }

    UUID sessionId = UUID.randomUUID();
    var existingOpt = locationShareRepository.findByTripIdAndUserId(tripId, userId);
    LocationShare share;
    if (existingOpt.isPresent()) {
      share = existingOpt.get();
      if (share.isEnabled() && share.getExpiresAt().isAfter(now)) {
        throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "An active location sharing session is already running. Stop it before starting a new one.");
      }
      share.setEnabled(true);
      share.setSessionId(sessionId);
      share.setStartedAt(now);
      share.setExpiresAt(request.expiresAt());
      share.setStoppedAt(null);
      share.setLastLatitude(request.latitude());
      share.setLastLongitude(request.longitude());
      share.setLastUpdatedAt(request.latitude() != null ? now : null);
    } else {
      share =
          new LocationShare(
              tripId,
              userId,
              true,
              now,
              request.expiresAt(),
              request.latitude(),
              request.longitude(),
              request.latitude() != null ? now : null);
      share.setSessionId(sessionId);
    }

    share = locationShareRepository.save(share);
    UserEntity user = userRepository.findById(userId).orElse(null);
    return toResponse(share, user);
  }

  public LocationShareResponse updateLocation(
      UUID tripId, UUID userId, UpdateLocationShareRequest request) {
    tripAccessService.requireMember(tripId, userId);

    Instant now = Instant.now();
    LocationShare share =
        locationShareRepository
            .findByTripIdAndUserId(tripId, userId)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "No active location sharing session found"));

    if (!share.isEnabled() || share.getStoppedAt() != null || !share.getExpiresAt().isAfter(now)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Location sharing session is disabled or expired");
    }

    if (request.sessionId() != null) {
      if (!request.sessionId().equals(share.getSessionId())) {
        throw new ResponseStatusException(
            HttpStatus.CONFLICT, "Session identifier does not match active session");
      }
    } else if (request.sessionStartedAt() != null) {
      long diffMillis =
          Math.abs(Duration.between(share.getStartedAt(), request.sessionStartedAt()).toMillis());
      if (diffMillis > 2000) {
        throw new ResponseStatusException(
            HttpStatus.CONFLICT, "Session started marker does not match current session");
      }
    }

    share.setLastLatitude(request.latitude());
    share.setLastLongitude(request.longitude());
    share.setLastUpdatedAt(now);
    share = locationShareRepository.save(share);

    UserEntity user = userRepository.findById(userId).orElse(null);
    return toResponse(share, user);
  }

  public void stopShare(UUID tripId, UUID userId) {
    tripAccessService.requireMember(tripId, userId);

    Instant now = Instant.now();
    locationShareRepository
        .findByTripIdAndUserId(tripId, userId)
        .ifPresent(
            share -> {
              share.setEnabled(false);
              share.setStoppedAt(now);
              share.setLastLatitude(null);
              share.setLastLongitude(null);
              share.setLastUpdatedAt(null);
              share.setSessionId(null);
              locationShareRepository.save(share);
            });
  }

  @Transactional(readOnly = true)
  public Page<LocationShareResponse> getActiveShares(
      UUID tripId, UUID currentUserId, Pageable pageable) {
    tripAccessService.requireMember(tripId, currentUserId);

    Instant now = Instant.now();
    Page<LocationShare> page = locationShareRepository.findActiveShares(tripId, now, pageable);

    List<LocationShare> activeMemberShares =
        page.getContent().stream()
            .filter(share -> tripAccessService.isMember(tripId, share.getUserId()))
            .toList();

    List<UUID> userIds = activeMemberShares.stream().map(LocationShare::getUserId).toList();
    Map<UUID, UserEntity> userMap =
        userRepository.findAllById(userIds).stream()
            .collect(Collectors.toMap(UserEntity::getId, u -> u));

    List<LocationShareResponse> responses =
        activeMemberShares.stream()
            .map(share -> toResponse(share, userMap.get(share.getUserId())))
            .toList();

    long accurateTotal = page.getTotalElements() - (page.getContent().size() - activeMemberShares.size());
    return new PageImpl<>(responses, pageable, Math.max(0, accurateTotal));
  }

  private LocationShareResponse toResponse(LocationShare share, UserEntity user) {
    return new LocationShareResponse(
        share.getId(),
        share.getTripId(),
        share.getUserId(),
        user != null ? user.getDisplayName() : "Thành viên VISTA",
        user != null ? user.getAvatarUrl() : null,
        share.getLastLatitude(),
        share.getLastLongitude(),
        share.getStartedAt(),
        share.getExpiresAt(),
        share.getLastUpdatedAt(),
        share.isEnabled(),
        share.getSessionId());
  }
}
