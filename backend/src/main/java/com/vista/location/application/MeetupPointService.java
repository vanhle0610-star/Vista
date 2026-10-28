package com.vista.location.application;

import com.vista.location.api.dto.CreateMeetupPointRequest;
import com.vista.location.api.dto.MeetupPointResponse;
import com.vista.location.api.dto.UpdateMeetupPointRequest;
import com.vista.location.domain.MeetupPoint;
import com.vista.location.domain.MeetupPointRepository;
import com.vista.trip.application.TripAccessService;
import com.vista.user.domain.UserEntity;
import com.vista.user.infrastructure.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class MeetupPointService {

  private final MeetupPointRepository meetupPointRepository;
  private final TripAccessService tripAccessService;
  private final UserRepository userRepository;

  public MeetupPointService(
      MeetupPointRepository meetupPointRepository,
      TripAccessService tripAccessService,
      UserRepository userRepository) {
    this.meetupPointRepository = meetupPointRepository;
    this.tripAccessService = tripAccessService;
    this.userRepository = userRepository;
  }

  public MeetupPointResponse createMeetupPoint(
      UUID tripId, UUID userId, CreateMeetupPointRequest request) {
    tripAccessService.requireMember(tripId, userId);

    MeetupPoint point =
        new MeetupPoint(
            tripId,
            userId,
            request.label().trim(),
            request.latitude(),
            request.longitude(),
            request.targetTime(),
            request.description());

    point = meetupPointRepository.save(point);
    UserEntity creator = userRepository.findById(userId).orElse(null);
    return toResponse(point, creator);
  }

  public MeetupPointResponse updateMeetupPoint(
      UUID tripId, UUID meetupId, UUID userId, UpdateMeetupPointRequest request) {
    tripAccessService.requireMember(tripId, userId);

    MeetupPoint point =
        meetupPointRepository
            .findById(meetupId)
            .filter(p -> p.getTripId().equals(tripId))
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Meetup point not found: " + meetupId));

    if (!point.getCreatedBy().equals(userId) && !tripAccessService.isOwner(tripId, userId)) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Only the creator or trip owner can update this meetup point");
    }

    if (request.label() != null && !request.label().isBlank()) {
      point.setLabel(request.label().trim());
    }
    if (request.latitude() != null) {
      point.setLatitude(request.latitude());
    }
    if (request.longitude() != null) {
      point.setLongitude(request.longitude());
    }
    if (request.targetTime() != null) {
      point.setTargetTime(request.targetTime());
    }
    if (request.description() != null) {
      point.setDescription(request.description());
    }

    point = meetupPointRepository.save(point);
    UserEntity creator = userRepository.findById(point.getCreatedBy()).orElse(null);
    return toResponse(point, creator);
  }

  public void deleteMeetupPoint(UUID tripId, UUID meetupId, UUID userId) {
    tripAccessService.requireMember(tripId, userId);

    MeetupPoint point =
        meetupPointRepository
            .findById(meetupId)
            .filter(p -> p.getTripId().equals(tripId))
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Meetup point not found: " + meetupId));

    if (!point.getCreatedBy().equals(userId) && !tripAccessService.isOwner(tripId, userId)) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Only the creator or trip owner can delete this meetup point");
    }

    meetupPointRepository.delete(point);
  }

  @Transactional(readOnly = true)
  public List<MeetupPointResponse> getMeetupPoints(UUID tripId, UUID userId) {
    tripAccessService.requireMember(tripId, userId);

    List<MeetupPoint> points =
        meetupPointRepository.findByTripIdOrderByTargetTimeAscCreatedAtAsc(tripId);
    List<UUID> creatorIds = points.stream().map(MeetupPoint::getCreatedBy).distinct().toList();
    Map<UUID, UserEntity> userMap =
        userRepository.findAllById(creatorIds).stream()
            .collect(Collectors.toMap(UserEntity::getId, u -> u));

    return points.stream().map(p -> toResponse(p, userMap.get(p.getCreatedBy()))).toList();
  }

  private MeetupPointResponse toResponse(MeetupPoint p, UserEntity creator) {
    return new MeetupPointResponse(
        p.getId(),
        p.getTripId(),
        p.getCreatedBy(),
        creator != null ? creator.getDisplayName() : "Thành viên VISTA",
        p.getLabel(),
        p.getLatitude(),
        p.getLongitude(),
        p.getTargetTime(),
        p.getDescription(),
        p.getCreatedAt(),
        p.getUpdatedAt());
  }
}
