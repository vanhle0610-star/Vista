package com.vista.destination.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.destination.api.dto.DestinationDetailDto;
import com.vista.destination.api.dto.DestinationPageDto;
import com.vista.destination.api.dto.DestinationSummaryDto;
import com.vista.destination.application.DestinationQueryService;
import com.vista.destination.application.DestinationSummary;
import com.vista.destination.domain.Destination;
import com.vista.destination.repository.DestinationRepository;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.context.annotation.Primary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Primary
@Transactional(readOnly = true)
public class DestinationService implements DestinationQueryService {

  private static final String STATUS_PUBLISHED = "PUBLISHED";

  private final DestinationRepository destinationRepository;
  private final ObjectMapper objectMapper;

  public DestinationService(DestinationRepository destinationRepository) {
    this.destinationRepository = destinationRepository;
    this.objectMapper = new ObjectMapper();
  }

  public DestinationPageDto searchPublished(
      String keyword, String province, String category, BigDecimal priceMax, int page, int size) {
    int validPage = Math.max(0, page);
    int validSize = Math.min(100, Math.max(1, size));

    Specification<Destination> spec =
        (root, query, cb) -> {
          List<Predicate> predicates = new ArrayList<>();
          predicates.add(cb.equal(root.get("status"), STATUS_PUBLISHED));

          if (keyword != null && !keyword.isBlank()) {
            String pattern = "%" + keyword.trim().toLowerCase() + "%";
            predicates.add(
                cb.or(
                    cb.like(cb.lower(root.get("name")), pattern),
                    cb.like(cb.lower(root.get("description")), pattern)));
          }

          if (province != null && !province.isBlank()) {
            String provPattern = "%" + province.trim().toLowerCase() + "%";
            predicates.add(cb.like(cb.lower(root.get("province").get("name")), provPattern));
          }

          if (category != null && !category.isBlank()) {
            String catPattern = "%" + category.trim().toLowerCase() + "%";
            predicates.add(cb.like(cb.lower(root.get("category").get("name")), catPattern));
          }

          if (priceMax != null) {
            predicates.add(
                cb.or(
                    cb.isNull(root.get("priceMin")),
                    cb.lessThanOrEqualTo(root.get("priceMin"), priceMax)));
          }

          return cb.and(predicates.toArray(new Predicate[0]));
        };

    PageRequest pageRequest =
        PageRequest.of(validPage, validSize, Sort.by(Sort.Direction.DESC, "createdAt"));
    Page<Destination> pageResult = destinationRepository.findAll(spec, pageRequest);

    List<DestinationSummaryDto> items =
        pageResult.getContent().stream().map(this::toSummaryDto).toList();

    return new DestinationPageDto(
        items, pageResult.getNumber(), pageResult.getSize(), pageResult.getTotalElements());
  }

  public DestinationDetailDto getPublishedDetail(UUID id, UUID currentUserId) {
    Destination dest =
        destinationRepository
            .findByIdAndStatus(id, STATUS_PUBLISHED)
            .orElseThrow(
                () ->
                    new DestinationNotFoundException(
                        "Không tìm thấy địa điểm du lịch hoặc địa điểm chưa được xuất bản: " + id));

    return toDetailDto(dest, false);
  }

  @Override
  public Optional<DestinationSummary> findPublishedById(UUID id) {
    return destinationRepository
        .findByIdAndStatus(id, STATUS_PUBLISHED)
        .map(
            d ->
                new DestinationSummary(
                    d.getId(),
                    d.getName(),
                    d.getProvince() != null ? d.getProvince().getName() : "",
                    d.getCategory() != null ? d.getCategory().getName() : "",
                    d.getPriceMin() != null ? d.getPriceMin() : BigDecimal.ZERO,
                    d.getPriceMax() != null ? d.getPriceMax() : BigDecimal.ZERO,
                    d.getLatitude() != null ? d.getLatitude().doubleValue() : null,
                    d.getLongitude() != null ? d.getLongitude().doubleValue() : null));
  }

  private DestinationSummaryDto toSummaryDto(Destination dest) {
    String imageUrl = null;
    if (dest.getImages() != null && !dest.getImages().isEmpty()) {
      imageUrl = dest.getImages().get(0).getStoragePath();
    }

    return new DestinationSummaryDto(
        dest.getId(),
        dest.getName(),
        dest.getProvince() != null ? dest.getProvince().getName() : "",
        dest.getCategory() != null ? dest.getCategory().getName() : "",
        imageUrl,
        dest.getPriceMin(),
        dest.getPriceMax(),
        dest.getLatitude() != null ? dest.getLatitude().doubleValue() : null,
        dest.getLongitude() != null ? dest.getLongitude().doubleValue() : null,
        dest.getStatus());
  }

  private DestinationDetailDto toDetailDto(Destination dest, boolean isFavorite) {
    String imageUrl = null;
    if (dest.getImages() != null && !dest.getImages().isEmpty()) {
      imageUrl = dest.getImages().get(0).getStoragePath();
    }

    Map<String, Object> openingHoursMap = Collections.emptyMap();
    if (dest.getOpeningHours() != null && !dest.getOpeningHours().isBlank()) {
      try {
        openingHoursMap = objectMapper.readValue(dest.getOpeningHours(), new TypeReference<>() {});
      } catch (Exception ignored) {
        // Fallback gracefully if parsing fails
      }
    }

    return new DestinationDetailDto(
        dest.getId(),
        dest.getName(),
        dest.getProvince() != null ? dest.getProvince().getName() : "",
        dest.getCategory() != null ? dest.getCategory().getName() : "",
        imageUrl,
        dest.getPriceMin(),
        dest.getPriceMax(),
        dest.getLatitude() != null ? dest.getLatitude().doubleValue() : null,
        dest.getLongitude() != null ? dest.getLongitude().doubleValue() : null,
        dest.getStatus(),
        dest.getDescription(),
        openingHoursMap,
        dest.getSourceUrl(),
        dest.getVerifiedAt(),
        isFavorite);
  }
}
