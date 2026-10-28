package com.vista.location.application;

import com.vista.location.api.dto.CheckInResponse;
import com.vista.location.api.dto.CreateCheckInRequest;
import com.vista.location.domain.CheckIn;
import com.vista.location.domain.CheckInRepository;
import com.vista.trip.application.TripAccessService;
import com.vista.user.domain.UserEntity;
import com.vista.user.infrastructure.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CheckInService {

  private final CheckInRepository checkInRepository;
  private final TripAccessService tripAccessService;
  private final UserRepository userRepository;

  public CheckInService(
      CheckInRepository checkInRepository,
      TripAccessService tripAccessService,
      UserRepository userRepository) {
    this.checkInRepository = checkInRepository;
    this.tripAccessService = tripAccessService;
    this.userRepository = userRepository;
  }

  public CheckInResponse createCheckIn(UUID tripId, UUID userId, CreateCheckInRequest request) {
    tripAccessService.requireMember(tripId, userId);

    CheckIn checkIn =
        new CheckIn(
            tripId, request.itineraryItemId(), userId, request.latitude(), request.longitude());

    checkIn = checkInRepository.save(checkIn);
    UserEntity user = userRepository.findById(userId).orElse(null);
    return toResponse(checkIn, user);
  }

  @Transactional(readOnly = true)
  public List<CheckInResponse> getCheckIns(UUID tripId, UUID userId) {
    tripAccessService.requireMember(tripId, userId);

    List<CheckIn> checkIns = checkInRepository.findByTripIdOrderByCheckedInAtDesc(tripId);
    List<UUID> userIds = checkIns.stream().map(CheckIn::getUserId).distinct().toList();
    Map<UUID, UserEntity> userMap =
        userRepository.findAllById(userIds).stream()
            .collect(Collectors.toMap(UserEntity::getId, u -> u));

    return checkIns.stream().map(c -> toResponse(c, userMap.get(c.getUserId()))).toList();
  }

  private CheckInResponse toResponse(CheckIn c, UserEntity user) {
    return new CheckInResponse(
        c.getId(),
        c.getTripId(),
        c.getItineraryItemId(),
        c.getUserId(),
        user != null ? user.getDisplayName() : "Thành viên VISTA",
        user != null ? user.getAvatarUrl() : null,
        c.getLatitude(),
        c.getLongitude(),
        c.getCheckedInAt());
  }
}
