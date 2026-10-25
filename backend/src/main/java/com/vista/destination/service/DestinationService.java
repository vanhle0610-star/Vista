package com.vista.destination.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.destination.api.dto.DestinationDetailDto;
import com.vista.destination.api.dto.DestinationPageDto;
import com.vista.destination.api.dto.DestinationSummaryDto;
import com.vista.destination.application.DestinationQueryService;
import com.vista.destination.application.DestinationSummary;
import com.vista.destination.domain.Destination;
import com.vista.destination.domain.DestinationHistory;
import com.vista.destination.domain.Favorite;
import com.vista.destination.repository.DestinationHistoryRepository;
import com.vista.destination.repository.DestinationRepository;
import com.vista.destination.repository.FavoriteRepository;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.context.annotation.Primary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vista.destination.api.dto.CreateDestinationRequest;
import com.vista.destination.domain.DestinationCategory;
import com.vista.destination.domain.Province;
import com.vista.destination.repository.DestinationCategoryRepository;
import com.vista.destination.repository.ProvinceRepository;
import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Autowired;

@Service
@Primary
@Transactional(readOnly = true)
public class DestinationService implements DestinationQueryService {

  private static final String STATUS_PUBLISHED = "PUBLISHED";

  private final DestinationRepository destinationRepository;
  private final FavoriteRepository favoriteRepository;
  private final DestinationHistoryRepository historyRepository;
  private final ProvinceRepository provinceRepository;
  private final DestinationCategoryRepository categoryRepository;
  private final ObjectMapper objectMapper;

  public DestinationService(
      DestinationRepository destinationRepository,
      FavoriteRepository favoriteRepository,
      DestinationHistoryRepository historyRepository) {
    this(destinationRepository, favoriteRepository, historyRepository, null, null);
  }

  @Autowired
  public DestinationService(
      DestinationRepository destinationRepository,
      FavoriteRepository favoriteRepository,
      DestinationHistoryRepository historyRepository,
      @Autowired(required = false) ProvinceRepository provinceRepository,
      @Autowired(required = false) DestinationCategoryRepository categoryRepository) {
    this.destinationRepository = destinationRepository;
    this.favoriteRepository = favoriteRepository;
    this.historyRepository = historyRepository;
    this.provinceRepository = provinceRepository;
    this.categoryRepository = categoryRepository;
    this.objectMapper = new ObjectMapper();
  }

  @Transactional
  public DestinationDetailDto createDestination(CreateDestinationRequest request) {
    String name = request.name().trim();
    String baseSlug = toSlug(name);
    String slug = baseSlug;
    int attempt = 1;
    while (destinationRepository.existsBySlug(slug)) {
      slug = baseSlug + "-" + (attempt++) + "-" + UUID.randomUUID().toString().substring(0, 4);
    }

    String provName = request.province() != null ? request.province().trim() : "Việt Nam";
    Province province = null;
    if (provinceRepository != null) {
      province =
          provinceRepository
              .findByName(provName)
              .orElseGet(
                  () -> {
                    Province p = new Province(provName, toSlug(provName), "VN-REGION");
                    return provinceRepository.save(p);
                  });
    }

    String catName =
        request.category() != null && !request.category().isBlank()
            ? request.category().trim()
            : "Cảnh quan & Văn hóa";
    DestinationCategory category = null;
    if (categoryRepository != null) {
      category =
          categoryRepository
              .findByName(catName)
              .orElseGet(
                  () -> {
                    DestinationCategory c = new DestinationCategory(catName, "category-default");
                    return categoryRepository.save(c);
                  });
    }

    Destination dest = new Destination();
    dest.setName(name);
    dest.setSlug(slug);
    dest.setProvince(province);
    dest.setCategory(category);
    dest.setDescription(request.description() != null ? request.description().trim() : "");
    dest.setLatitude(request.latitude());
    dest.setLongitude(request.longitude());
    dest.setPriceMin(request.priceMin() != null ? request.priceMin() : BigDecimal.ZERO);
    dest.setPriceMax(request.priceMax() != null ? request.priceMax() : request.priceMin());
    String openingHoursJson =
        "{\"mon\":\"-\",\"tue\":\"-\",\"wed\":\"-\",\"thu\":\"-\",\"fri\":\"-\",\"sat\":\"-\",\"sun\":\"-\"}";
    if (request.openingHours() != null && !request.openingHours().isBlank()) {
      String raw = request.openingHours().trim();
      if (raw.startsWith("{") && raw.endsWith("}")) {
        openingHoursJson = raw;
      } else {
        openingHoursJson = "{\"all\":\"" + raw.replace("\"", "\\\"") + "\"}";
      }
    }
    dest.setOpeningHours(openingHoursJson);
    dest.setSourceUrl(request.sourceUrl());
    dest.setStatus(
        request.status() != null && !request.status().isBlank()
            ? request.status().trim().toUpperCase()
            : STATUS_PUBLISHED);
    dest.setVerifiedAt(Instant.now());

    if (request.imageUrl() != null && !request.imageUrl().isBlank()) {
      dest.addImage(request.imageUrl().trim(), name, 0);
    }

    Destination saved = destinationRepository.save(dest);
    return toDetailDto(saved, false);
  }

  @Transactional
  public void deleteDestination(UUID id) {
    if (id != null && destinationRepository.existsById(id)) {
      destinationRepository.deleteById(id);
    }
  }

  private String toSlug(String input) {
    if (input == null || input.isBlank()) {
      return "diem-den-" + UUID.randomUUID().toString().substring(0, 8);
    }
    String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
    Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    String slug =
        pattern
            .matcher(normalized)
            .replaceAll("")
            .toLowerCase(Locale.ROOT)
            .replace('đ', 'd')
            .replace('Đ', 'd')
            .replaceAll("[^a-z0-9\\s-]", "")
            .replaceAll("[\\s-]+", "-")
            .replaceAll("^-+|-+$", "");
    return slug.isBlank() ? "diem-den" : slug;
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

    boolean isFavorite =
        currentUserId != null
            && favoriteRepository.existsByIdUserIdAndIdDestinationId(currentUserId, id);

    return toDetailDto(dest, isFavorite);
  }

  // --- FAVORITES API (TV1 W3) ---

  @Transactional
  public void addFavorite(UUID destinationId, UUID userId) {
    Destination destination =
        destinationRepository
            .findByIdAndStatus(destinationId, STATUS_PUBLISHED)
            .orElseThrow(
                () ->
                    new DestinationNotFoundException(
                        "Không tìm thấy địa điểm du lịch hoặc chưa công bố: " + destinationId));

    if (!favoriteRepository.existsByIdUserIdAndIdDestinationId(userId, destinationId)) {
      favoriteRepository.save(new Favorite(userId, destination));
    }
  }

  @Transactional
  public void removeFavorite(UUID destinationId, UUID userId) {
    if (!destinationRepository.existsByIdAndStatus(destinationId, STATUS_PUBLISHED)) {
      throw new DestinationNotFoundException(
          "Không tìm thấy địa điểm du lịch hoặc chưa công bố: " + destinationId);
    }
    favoriteRepository.deleteByIdUserIdAndIdDestinationId(userId, destinationId);
  }

  public List<DestinationSummaryDto> getFavorites(UUID userId) {
    List<Favorite> favorites = favoriteRepository.findByIdUserIdOrderByCreatedAtDesc(userId);
    return favorites.stream()
        .map(Favorite::getDestination)
        .filter(d -> STATUS_PUBLISHED.equals(d.getStatus()))
        .map(this::toSummaryDto)
        .toList();
  }

  public boolean isFavorite(UUID destinationId, UUID userId) {
    if (userId == null) {
      return false;
    }
    return favoriteRepository.existsByIdUserIdAndIdDestinationId(userId, destinationId);
  }

  // --- DESTINATION HISTORY API (TV1 W3) ---

  @Transactional
  public void recordView(UUID destinationId, UUID userId) {
    Destination destination =
        destinationRepository
            .findByIdAndStatus(destinationId, STATUS_PUBLISHED)
            .orElseThrow(
                () ->
                    new DestinationNotFoundException(
                        "Không tìm thấy địa điểm du lịch hoặc chưa công bố: " + destinationId));

    Optional<DestinationHistory> existing =
        historyRepository.findByUserIdAndDestinationId(userId, destinationId);

    if (existing.isPresent()) {
      DestinationHistory history = existing.get();
      history.setViewedAt(Instant.now());
      historyRepository.save(history);
    } else {
      historyRepository.save(new DestinationHistory(userId, destination));
    }
  }

  public List<DestinationSummaryDto> getRecentHistory(UUID userId, int limit) {
    int validLimit = Math.min(50, Math.max(1, limit));
    Pageable pageable = PageRequest.of(0, validLimit);
    List<DestinationHistory> histories =
        historyRepository.findByUserIdOrderByViewedAtDesc(userId, pageable);

    return histories.stream()
        .map(DestinationHistory::getDestination)
        .filter(d -> STATUS_PUBLISHED.equals(d.getStatus()))
        .map(this::toSummaryDto)
        .toList();
  }

  // --- CONTRACT DESTINATION QUERY SERVICE (TV3 / TV4) ---

  @Override
  public Optional<DestinationSummary> findPublishedById(UUID id) {
    return destinationRepository
        .findByIdAndStatus(id, STATUS_PUBLISHED)
        .map(this::toDestinationSummary);
  }

  @Override
  public List<DestinationSummary> findPublishedByIds(List<UUID> ids) {
    if (ids == null || ids.isEmpty()) {
      return Collections.emptyList();
    }
    return destinationRepository.findAllByIdInAndStatus(ids, STATUS_PUBLISHED).stream()
        .map(this::toDestinationSummary)
        .toList();
  }

  @Override
  public List<DestinationSummary> searchPublished(
      String keyword, String province, String category, int limit) {
    int validLimit = Math.min(50, Math.max(1, limit));
    DestinationPageDto page =
        searchPublished(keyword, province, category, null, 0, validLimit);

    return page.items().stream()
        .map(
            item ->
                new DestinationSummary(
                    item.id(),
                    item.name(),
                    item.province(),
                    item.category(),
                    item.priceMin() != null ? item.priceMin() : BigDecimal.ZERO,
                    item.priceMax() != null ? item.priceMax() : BigDecimal.ZERO,
                    item.latitude(),
                    item.longitude(),
                    item.imageUrl()))
        .toList();
  }

  @Override
  public boolean isPublished(UUID id) {
    return id != null && destinationRepository.existsByIdAndStatus(id, STATUS_PUBLISHED);
  }

  // --- HELPER MAPPERS ---

  private DestinationSummary toDestinationSummary(Destination d) {
    String imageUrl = null;
    if (d.getImages() != null && !d.getImages().isEmpty()) {
      imageUrl = d.getImages().get(0).getStoragePath();
    }

    return new DestinationSummary(
        d.getId(),
        d.getName(),
        d.getProvince() != null ? d.getProvince().getName() : "",
        d.getCategory() != null ? d.getCategory().getName() : "",
        d.getPriceMin() != null ? d.getPriceMin() : BigDecimal.ZERO,
        d.getPriceMax() != null ? d.getPriceMax() : BigDecimal.ZERO,
        d.getLatitude() != null ? d.getLatitude().doubleValue() : null,
        d.getLongitude() != null ? d.getLongitude().doubleValue() : null,
        imageUrl,
        d.getOpeningHours());
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
