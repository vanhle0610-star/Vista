package com.vista.destination.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.collaboration.itinerary.ItineraryItemRepository;
import com.vista.collaboration.proposal.ProposalRepository;
import com.vista.common.audit.AuditLogService;
import com.vista.destination.api.dto.CreateDestinationRequest;
import com.vista.destination.api.dto.DestinationDetailDto;
import com.vista.destination.api.dto.DestinationPageDto;
import com.vista.destination.api.dto.DestinationSummaryDto;
import com.vista.destination.api.dto.UpdateDestinationRequest;
import com.vista.destination.application.DestinationQueryService;
import com.vista.destination.application.DestinationSummary;
import com.vista.destination.domain.Destination;
import com.vista.destination.domain.DestinationCategory;
import com.vista.destination.domain.DestinationHistory;
import com.vista.destination.domain.DestinationImage;
import com.vista.destination.domain.Favorite;
import com.vista.destination.domain.Province;
import com.vista.destination.repository.DestinationCategoryRepository;
import com.vista.destination.repository.DestinationHistoryRepository;
import com.vista.destination.repository.DestinationRepository;
import com.vista.destination.repository.FavoriteRepository;
import com.vista.destination.repository.ProvinceRepository;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Primary
@Transactional(readOnly = true)
public class DestinationService implements DestinationQueryService {

  public static final String STATUS_DRAFT = "DRAFT";
  public static final String STATUS_PUBLISHED = "PUBLISHED";
  public static final String STATUS_REJECTED = "REJECTED";
  public static final String STATUS_ARCHIVED = "ARCHIVED";

  private final DestinationRepository destinationRepository;
  private final FavoriteRepository favoriteRepository;
  private final DestinationHistoryRepository historyRepository;
  private final ProvinceRepository provinceRepository;
  private final DestinationCategoryRepository categoryRepository;
  private final ObjectMapper objectMapper;

  @Autowired(required = false)
  private AuditLogService auditLogService;

  @Autowired(required = false)
  private JdbcTemplate jdbcTemplate;

  @Autowired(required = false)
  private ItineraryItemRepository itineraryItemRepository;

  @Autowired(required = false)
  private ProposalRepository proposalRepository;

  public void setJdbcTemplate(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public void setItineraryItemRepository(ItineraryItemRepository itineraryItemRepository) {
    this.itineraryItemRepository = itineraryItemRepository;
  }

  public void setProposalRepository(ProposalRepository proposalRepository) {
    this.proposalRepository = proposalRepository;
  }

  public record DestinationReviewStats(Double rating, Integer reviewCount) {
    public static final DestinationReviewStats EMPTY = new DestinationReviewStats(null, 0);
  }

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
            ? request.status().trim().toUpperCase(Locale.ROOT)
            : STATUS_PUBLISHED);
    dest.setVerifiedAt(Instant.now());

    List<String> urlsToSave = new ArrayList<>();
    if (request.imageUrls() != null && !request.imageUrls().isEmpty()) {
      for (String u : request.imageUrls()) {
        if (u != null && !u.isBlank() && !urlsToSave.contains(u.trim())) {
          urlsToSave.add(u.trim());
        }
      }
    }
    if (request.imageUrl() != null && !request.imageUrl().isBlank()) {
      String primary = request.imageUrl().trim();
      urlsToSave.remove(primary);
      urlsToSave.add(0, primary);
    }
    for (int i = 0; i < urlsToSave.size(); i++) {
      dest.addImage(urlsToSave.get(i), name, i);
    }

    Destination saved = destinationRepository.save(dest);
    if (auditLogService != null && saved.getId() != null) {
      auditLogService.logAction(
          null,
          "CREATE_DESTINATION",
          "DESTINATION",
          saved.getId().toString(),
          "Tạo mới điểm đến: " + name);
    }
    return toDetailDto(saved, false, DestinationReviewStats.EMPTY);
  }

  @Transactional
  public DestinationDetailDto updateDestination(UUID id, UpdateDestinationRequest request) {
    return updateDestination(id, request, null);
  }

  @Transactional
  public DestinationDetailDto updateDestination(
      UUID id, UpdateDestinationRequest request, UUID actorId) {
    if (id == null) {
      throw new IllegalArgumentException("Mã điểm đến không được để trống");
    }
    if (request == null || request.name() == null || request.name().isBlank()) {
      throw new IllegalArgumentException("Tên điểm đến không được để trống");
    }
    if (request.priceMin() != null && request.priceMin().compareTo(BigDecimal.ZERO) < 0) {
      throw new IllegalArgumentException("Giá vé tối thiểu không được âm");
    }
    if (request.priceMax() != null && request.priceMax().compareTo(BigDecimal.ZERO) < 0) {
      throw new IllegalArgumentException("Giá vé tối đa không được âm");
    }
    if (request.priceMin() != null
        && request.priceMax() != null
        && request.priceMax().compareTo(request.priceMin()) < 0) {
      throw new IllegalArgumentException("Giá vé tối đa phải lớn hơn hoặc bằng giá vé tối thiểu");
    }

    Destination dest =
        destinationRepository
            .findById(id)
            .orElseThrow(
                () ->
                    new DestinationNotFoundException(
                        "Không tìm thấy địa điểm du lịch với mã: " + id));

    String trimmedName = request.name().trim();
    if (!trimmedName.equals(dest.getName()) || dest.getSlug() == null || dest.getSlug().isBlank()) {
      String baseSlug = toSlug(trimmedName);
      String candidateSlug = baseSlug;
      int suffix = 1;
      while (destinationRepository.existsBySlug(candidateSlug)
          && !candidateSlug.equals(dest.getSlug())) {
        candidateSlug = baseSlug + "-" + (suffix++);
      }
      dest.setName(trimmedName);
      dest.setSlug(candidateSlug);
    }

    if (request.provinceId() != null) {
      if (provinceRepository != null) {
        Province p =
            provinceRepository
                .findById(request.provinceId())
                .orElseThrow(
                    () ->
                        new IllegalArgumentException(
                            "Không tìm thấy tỉnh thành với mã: " + request.provinceId()));
        dest.setProvince(p);
      }
    } else if (request.province() != null && !request.province().isBlank()) {
      String provName = request.province().trim();
      if (provinceRepository != null) {
        Province p =
            provinceRepository
                .findByName(provName)
                .orElseGet(
                    () ->
                        provinceRepository.save(
                            new Province(provName, toSlug(provName), "VN-REGION")));
        dest.setProvince(p);
      } else {
        dest.setProvince(new Province(provName, toSlug(provName), "VN-REGION"));
      }
    }

    if (request.categoryId() != null) {
      if (categoryRepository != null) {
        DestinationCategory c =
            categoryRepository
                .findById(request.categoryId())
                .orElseThrow(
                    () ->
                        new IllegalArgumentException(
                            "Không tìm thấy danh mục với mã: " + request.categoryId()));
        dest.setCategory(c);
      }
    } else if (request.category() != null && !request.category().isBlank()) {
      String catName = request.category().trim();
      if (categoryRepository != null) {
        DestinationCategory c =
            categoryRepository
                .findByName(catName)
                .orElseGet(
                    () ->
                        categoryRepository.save(
                            new DestinationCategory(catName, "category-default")));
        dest.setCategory(c);
      } else {
        dest.setCategory(new DestinationCategory(catName, "category-default"));
      }
    }

    if (request.description() != null) {
      dest.setDescription(request.description().trim());
    }
    if (request.latitude() != null) {
      dest.setLatitude(request.latitude());
    }
    if (request.longitude() != null) {
      dest.setLongitude(request.longitude());
    }
    if (request.priceMin() != null) {
      dest.setPriceMin(request.priceMin());
    }
    if (request.priceMax() != null) {
      dest.setPriceMax(request.priceMax());
    }
    if (request.sourceUrl() != null) {
      dest.setSourceUrl(request.sourceUrl().isBlank() ? null : request.sourceUrl().trim());
    }

    if (request.openingHours() != null) {
      String raw = "";
      if (request.openingHours() instanceof String s) {
        raw = s.trim();
      } else {
        try {
          raw = objectMapper.writeValueAsString(request.openingHours());
        } catch (Exception ignored) {
          raw = request.openingHours().toString().trim();
        }
      }
      if (!raw.isBlank()) {
        String existingReason = extractRejectionReasonFromOpeningHours(dest.getOpeningHours());
        String openingHoursJson;
        if (raw.startsWith("{") && raw.endsWith("}")) {
          openingHoursJson = raw;
        } else {
          openingHoursJson = "{\"all\":\"" + raw.replace("\"", "\\\"") + "\"}";
        }
        if (existingReason != null && STATUS_REJECTED.equals(dest.getStatus())) {
          openingHoursJson =
              injectRejectionReasonIntoOpeningHours(openingHoursJson, existingReason);
        }
        dest.setOpeningHours(openingHoursJson);
      }
    }

    if (request.imageUrls() != null) {
      List<String> validUrls =
          request.imageUrls().stream()
              .filter(u -> u != null && !u.isBlank())
              .map(String::trim)
              .distinct()
              .collect(Collectors.toCollection(ArrayList::new));
      if (request.imageUrl() != null && !request.imageUrl().isBlank()) {
        String primary = request.imageUrl().trim();
        validUrls.remove(primary);
        validUrls.add(0, primary);
      }
      dest.getImages().clear();
      for (int i = 0; i < validUrls.size(); i++) {
        dest.addImage(validUrls.get(i), dest.getName(), i);
      }
    } else if (request.imageUrl() != null && !request.imageUrl().isBlank()) {
      dest.getImages().clear();
      dest.addImage(request.imageUrl().trim(), dest.getName(), 0);
    }

    // Nếu status hiện tại là REJECTED, giữ nguyên status; không tự thay đổi
    if (!STATUS_REJECTED.equals(dest.getStatus())
        && request.status() != null
        && !request.status().isBlank()) {
      dest.setStatus(request.status().trim().toUpperCase(Locale.ROOT));
    }

    dest.setUpdatedAt(Instant.now());
    Destination saved = destinationRepository.save(dest);

    if (auditLogService != null) {
      auditLogService.logAction(
          actorId,
          "UPDATE_DESTINATION",
          "DESTINATION",
          id.toString(),
          "Cập nhật thông tin điểm đến: " + dest.getName());
    }

    return toDetailDto(saved, false);
  }

  @Transactional(noRollbackFor = DestinationInUseException.class)
  public void deleteDestination(UUID id) {
    deleteDestination(id, null);
  }

  @Transactional(noRollbackFor = DestinationInUseException.class)
  public void deleteDestination(UUID id, UUID actorId) {
    if (id == null) {
      throw new IllegalArgumentException("Mã điểm đến không được để trống");
    }

    Optional<Destination> optDest = destinationRepository.findById(id);
    if (optDest.isEmpty() && !destinationRepository.existsById(id)) {
      throw new DestinationNotFoundException("Không tìm thấy địa điểm du lịch với mã: " + id);
    }

    Destination dest = optDest.orElse(null);
    String destName = dest != null ? dest.getName() : id.toString();

    if (hasForeignKeyReferences(id)) {
      if (dest != null) {
        dest.setStatus(STATUS_ARCHIVED);
        dest.setUpdatedAt(Instant.now());
        destinationRepository.save(dest);
      }
      if (auditLogService != null) {
        auditLogService.logAction(
            actorId,
            "ARCHIVE_DESTINATION",
            "DESTINATION",
            id.toString(),
            "Chuyển điểm đến sang trạng thái Lưu trữ (ARCHIVED) do đang được tham chiếu: "
                + destName);
      }
      throw new DestinationInUseException(
          "Địa điểm đang được tham chiếu, đã chuyển sang trạng thái Lưu trữ (Archived)");
    }

    destinationRepository.deleteById(id);
    if (auditLogService != null) {
      auditLogService.logAction(
          actorId,
          "DELETE_DESTINATION",
          "DESTINATION",
          id.toString(),
          "Xóa điểm đến khỏi hệ thống: " + destName);
    }
  }

  public boolean hasForeignKeyReferences(UUID destinationId) {
    if (destinationId == null) {
      return false;
    }
    if (itineraryItemRepository != null
        && itineraryItemRepository.existsByDestinationId(destinationId)) {
      return true;
    }
    if (proposalRepository != null && proposalRepository.existsByDestinationId(destinationId)) {
      return true;
    }
    if (jdbcTemplate != null) {
      try {
        Integer refCount =
            jdbcTemplate.queryForObject(
                "SELECT "
                    + "(SELECT COUNT(*) FROM reviews WHERE destination_id = ?) + "
                    + "(SELECT COUNT(*) FROM itinerary_items WHERE destination_id = ?) + "
                    + "(SELECT COUNT(*) FROM posts WHERE destination_id = ?) + "
                    + "(SELECT COUNT(*) FROM destination_proposals WHERE destination_id = ?)",
                Integer.class,
                destinationId,
                destinationId,
                destinationId,
                destinationId);
        if (refCount != null && refCount > 0) {
          return true;
        }
      } catch (Exception ignored) {
        // Fallback if jdbcTemplate query cannot execute in mock/unit environment
      }
    }
    return false;
  }

  public static String stripAccents(String input) {
    if (input == null || input.isBlank()) {
      return "";
    }
    String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
    Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    return pattern
        .matcher(normalized)
        .replaceAll("")
        .toLowerCase(Locale.ROOT)
        .replace('đ', 'd')
        .replace('Đ', 'd')
        .trim();
  }

  public static String toSlug(String input) {
    if (input == null || input.isBlank()) {
      return "diem-den-" + UUID.randomUUID().toString().substring(0, 8);
    }
    String stripped = stripAccents(input);
    String slug =
        stripped
            .replaceAll("[^a-z0-9\\s-]", "")
            .replaceAll("[\\s-]+", "-")
            .replaceAll("^-+|-+$", "");
    return slug.isBlank() ? "diem-den" : slug;
  }

  public DestinationPageDto searchPublished(
      String keyword, String province, String category, BigDecimal priceMax, int page, int size) {
    int validPage = Math.max(0, page);
    int validSize = Math.min(100, Math.max(1, size));

    Specification<Destination> spec = createSearchSpec(keyword, province, category, priceMax);
    PageRequest pageRequest =
        PageRequest.of(validPage, validSize, Sort.by(Sort.Direction.DESC, "createdAt"));
    Page<Destination> pageResult = destinationRepository.findAll(spec, pageRequest);

    List<Destination> content = pageResult.getContent();
    List<UUID> ids = content.stream().map(Destination::getId).toList();
    Map<UUID, DestinationReviewStats> statsMap = getReviewStatsBatch(ids);

    List<DestinationSummaryDto> items =
        content.stream()
            .map(
                d ->
                    toSummaryDto(d, statsMap.getOrDefault(d.getId(), DestinationReviewStats.EMPTY)))
            .toList();

    return new DestinationPageDto(
        items, pageResult.getNumber(), pageResult.getSize(), pageResult.getTotalElements());
  }

  public DestinationPageDto searchPublished(
      String keyword, String province, String category, int page, int size) {
    return searchPublished(keyword, province, category, null, page, size);
  }

  private Specification<Destination> createSearchSpec(
      String keyword, String province, String category, BigDecimal priceMax) {
    return (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();
      predicates.add(cb.equal(root.get("status"), STATUS_PUBLISHED));

      if (keyword != null && !keyword.isBlank()) {
        String trimmed = keyword.trim();
        String lowerKeyword = trimmed.toLowerCase(Locale.ROOT);
        String rawPattern = "%" + lowerKeyword + "%";

        String slugKeyword = toSlug(trimmed);
        String[] slugTokens = slugKeyword.split("-+");
        String tokenPattern = "%" + String.join("%", slugTokens) + "%";

        List<Predicate> keywordPredicates = new ArrayList<>();
        // 1. Accented / exact match on name
        keywordPredicates.add(cb.like(cb.lower(root.get("name")), rawPattern));
        // 2. Accented / exact match on description
        keywordPredicates.add(cb.like(cb.lower(root.get("description")), rawPattern));
        // 3. Unaccented matching on slug (e.g. "da nang" -> "da-nang", "chua cau" -> "chua-cau")
        keywordPredicates.add(cb.like(root.get("slug"), tokenPattern));
        keywordPredicates.add(cb.like(root.get("slug"), "%" + slugKeyword + "%"));
        // 4. Category has a name, not a slug; only Province exposes a slug.
        if (root.get("province") != null) {
          keywordPredicates.add(cb.like(root.get("province").get("slug"), tokenPattern));
        }
        if (root.get("category") != null) {
          keywordPredicates.add(cb.like(cb.lower(root.get("category").get("name")), rawPattern));
        }

        predicates.add(cb.or(keywordPredicates.toArray(new Predicate[0])));
      }

      if (province != null && !province.isBlank()) {
        String trimmedProv = province.trim();
        String provPattern = "%" + trimmedProv.toLowerCase(Locale.ROOT) + "%";
        String provSlug = toSlug(trimmedProv);
        String[] provTokens = provSlug.split("-+");
        String provTokenPattern = "%" + String.join("%", provTokens) + "%";

        predicates.add(
            cb.or(
                cb.like(cb.lower(root.get("province").get("name")), provPattern),
                cb.like(root.get("province").get("slug"), provTokenPattern)));
      }

      if (category != null && !category.isBlank()) {
        String trimmedCat = category.trim();
        String catPattern = "%" + trimmedCat.toLowerCase(Locale.ROOT) + "%";
        String catSlug = toSlug(trimmedCat);
        String[] catTokens = catSlug.split("-+");
        String catTokenPattern = "%" + String.join("%", catTokens) + "%";

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
      String keyword, String province, String category, BigDecimal priceMax, int limit) {
    int validLimit = Math.min(50, Math.max(1, limit));
    Specification<Destination> spec = createSearchSpec(keyword, province, category, priceMax);
    PageRequest pageRequest =
        PageRequest.of(0, validLimit, Sort.by(Sort.Direction.DESC, "createdAt"));
    Page<Destination> pageResult = destinationRepository.findAll(spec, pageRequest);

    return pageResult.getContent().stream().map(this::toDestinationSummary).toList();
  }

  @Override
  public List<DestinationSummary> searchPublished(
      String keyword, String province, String category, int limit) {
    return searchPublished(keyword, province, category, null, limit);
  }

  @Override
  public boolean isPublished(UUID id) {
    return id != null && destinationRepository.existsByIdAndStatus(id, STATUS_PUBLISHED);
  }

  public void setAuditLogService(AuditLogService auditLogService) {
    this.auditLogService = auditLogService;
  }

  // --- ADMIN MODERATION & APPROVAL QUEUE (TV1 W6) ---

  public DestinationPageDto searchModerationQueue(
      String keyword, String province, String category, String status, int page, int size) {
    int validPage = Math.max(0, page);
    int validSize = Math.min(100, Math.max(1, size));

    Specification<Destination> spec =
        (root, query, cb) -> {
          List<Predicate> predicates = new ArrayList<>();

          if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status.trim())) {
            predicates.add(
                cb.equal(cb.upper(root.get("status")), status.trim().toUpperCase(Locale.ROOT)));
          } else if (status == null || status.isBlank()) {
            predicates.add(cb.equal(root.get("status"), STATUS_DRAFT));
          }

          if (keyword != null && !keyword.isBlank()) {
            String trimmed = keyword.trim();
            String lowerKeyword = trimmed.toLowerCase(Locale.ROOT);
            String rawPattern = "%" + lowerKeyword + "%";

            String slugKeyword = toSlug(trimmed);
            String[] slugTokens = slugKeyword.split("-+");
            String tokenPattern = "%" + String.join("%", slugTokens) + "%";

            predicates.add(
                cb.or(
                    cb.like(cb.lower(root.get("name")), rawPattern),
                    cb.like(cb.lower(root.get("description")), rawPattern),
                    cb.like(root.get("slug"), tokenPattern),
                    cb.like(root.get("province").get("slug"), tokenPattern),
                    cb.like(cb.lower(root.get("category").get("name")), rawPattern)));
          }

          if (province != null && !province.isBlank()) {
            String trimmedProv = province.trim();
            String provPattern = "%" + trimmedProv.toLowerCase(Locale.ROOT) + "%";
            String provSlug = toSlug(trimmedProv);
            String[] provTokens = provSlug.split("-+");
            String provTokenPattern = "%" + String.join("%", provTokens) + "%";

            predicates.add(
                cb.or(
                    cb.like(cb.lower(root.get("province").get("name")), provPattern),
                    cb.like(root.get("province").get("slug"), provTokenPattern)));
          }

          if (category != null && !category.isBlank()) {
            String trimmedCat = category.trim();
            String catPattern = "%" + trimmedCat.toLowerCase(Locale.ROOT) + "%";
            String catSlug = toSlug(trimmedCat);
            String[] catTokens = catSlug.split("-+");
            String catTokenPattern = "%" + String.join("%", catTokens) + "%";

            predicates.add(cb.like(cb.lower(root.get("category").get("name")), catPattern));
          }

          return cb.and(predicates.toArray(new Predicate[0]));
        };

    PageRequest pageRequest =
        PageRequest.of(validPage, validSize, Sort.by(Sort.Direction.DESC, "createdAt"));
    Page<Destination> pageResult = destinationRepository.findAll(spec, pageRequest);

    List<Destination> content = pageResult.getContent();
    List<UUID> ids = content.stream().map(Destination::getId).toList();
    Map<UUID, DestinationReviewStats> statsMap = getReviewStatsBatch(ids);

    List<DestinationSummaryDto> items =
        content.stream()
            .map(
                d ->
                    toSummaryDto(d, statsMap.getOrDefault(d.getId(), DestinationReviewStats.EMPTY)))
            .toList();

    return new DestinationPageDto(
        items, pageResult.getNumber(), pageResult.getSize(), pageResult.getTotalElements());
  }

  public DestinationDetailDto getDestinationAdminDetail(UUID id) {
    Destination dest =
        destinationRepository
            .findById(id)
            .orElseThrow(
                () ->
                    new DestinationNotFoundException(
                        "Không tìm thấy địa điểm du lịch với mã: " + id));
    return toDetailDto(dest, false);
  }

  @Transactional
  public DestinationDetailDto updateDestinationStatus(
      UUID id, String targetStatus, UUID moderatorId, String note) {
    if (targetStatus == null || targetStatus.isBlank()) {
      throw new IllegalArgumentException("Trạng thái mục tiêu không được để trống");
    }
    String normalizedStatus = targetStatus.trim().toUpperCase(Locale.ROOT);
    if (!STATUS_PUBLISHED.equals(normalizedStatus)
        && !STATUS_REJECTED.equals(normalizedStatus)
        && !STATUS_DRAFT.equals(normalizedStatus)
        && !STATUS_ARCHIVED.equals(normalizedStatus)) {
      throw new IllegalArgumentException(
          "Trạng thái không hợp lệ: "
              + targetStatus
              + ". Chỉ chấp nhận: PUBLISHED, REJECTED, DRAFT, ARCHIVED");
    }

    Destination dest =
        destinationRepository
            .findById(id)
            .orElseThrow(
                () ->
                    new DestinationNotFoundException(
                        "Không tìm thấy địa điểm du lịch cần kiểm duyệt: " + id));

    dest.setStatus(normalizedStatus);
    dest.setUpdatedAt(Instant.now());
    if (STATUS_PUBLISHED.equals(normalizedStatus)) {
      dest.setVerifiedAt(Instant.now());
      dest.setRejectionReason(null);
      dest.setOpeningHours(removeRejectionReasonFromOpeningHours(dest.getOpeningHours()));
    } else if (STATUS_REJECTED.equals(normalizedStatus)) {
      String effectiveReason =
          (note != null && !note.isBlank()) ? note.trim() : "Từ chối kiểm duyệt điểm đến";
      dest.setRejectionReason(effectiveReason);
      dest.setOpeningHours(
          injectRejectionReasonIntoOpeningHours(dest.getOpeningHours(), effectiveReason));
    }

    Destination saved = destinationRepository.save(dest);

    if (auditLogService != null) {
      String details =
          (note != null && !note.isBlank())
              ? note
              : "Kiểm duyệt điểm đến " + dest.getName() + " -> " + normalizedStatus;
      auditLogService.logAction(
          moderatorId, "DESTINATION_" + normalizedStatus, "DESTINATION", id.toString(), details);
    }

    return toDetailDto(saved, false);
  }

  @Transactional
  public DestinationDetailDto approveDestination(UUID id, UUID moderatorId, String note) {
    return updateDestinationStatus(id, STATUS_PUBLISHED, moderatorId, note);
  }

  @Transactional
  public DestinationDetailDto rejectDestination(UUID id, UUID moderatorId, String note) {
    return updateDestinationStatus(id, STATUS_REJECTED, moderatorId, note);
  }

  public Map<String, Long> getModerationStats() {
    Map<String, Long> stats = new LinkedHashMap<>();
    stats.put("total", destinationRepository.count());
    stats.put("draft", destinationRepository.countByStatus(STATUS_DRAFT));
    stats.put("published", destinationRepository.countByStatus(STATUS_PUBLISHED));
    stats.put("rejected", destinationRepository.countByStatus(STATUS_REJECTED));
    stats.put("archived", destinationRepository.countByStatus(STATUS_ARCHIVED));
    return stats;
  }

  public Map<String, Long> getStatsByProvince() {
    Map<String, Long> counts = new HashMap<>();
    for (Destination d : destinationRepository.findAll()) {
      String prov =
          d.getProvince() != null && d.getProvince().getName() != null
              ? d.getProvince().getName()
              : "Khác";
      counts.merge(prov, 1L, Long::sum);
    }
    return counts.entrySet().stream()
        .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
        .collect(
            Collectors.toMap(
                Map.Entry::getKey, Map.Entry::getValue, (a, b) -> a, LinkedHashMap::new));
  }

  public Map<String, Long> getStatsByCategory() {
    Map<String, Long> counts = new HashMap<>();
    for (Destination d : destinationRepository.findAll()) {
      String cat =
          d.getCategory() != null && d.getCategory().getName() != null
              ? d.getCategory().getName()
              : "Khác";
      counts.merge(cat, 1L, Long::sum);
    }
    return counts.entrySet().stream()
        .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
        .collect(
            Collectors.toMap(
                Map.Entry::getKey, Map.Entry::getValue, (a, b) -> a, LinkedHashMap::new));
  }

  private String extractRejectionReasonFromOpeningHours(String openingHoursJson) {
    if (openingHoursJson == null || openingHoursJson.isBlank()) {
      return null;
    }
    try {
      Map<String, Object> map = objectMapper.readValue(openingHoursJson, new TypeReference<>() {});
      Object reason = map.get("_rejectionReason");
      return reason != null ? reason.toString() : null;
    } catch (Exception ignored) {
      return null;
    }
  }

  private String injectRejectionReasonIntoOpeningHours(String openingHoursJson, String reason) {
    try {
      Map<String, Object> map = new LinkedHashMap<>();
      if (openingHoursJson != null && !openingHoursJson.isBlank()) {
        map.putAll(objectMapper.readValue(openingHoursJson, new TypeReference<>() {}));
      }
      if (reason != null && !reason.isBlank()) {
        map.put("_rejectionReason", reason);
      }
      return objectMapper.writeValueAsString(map);
    } catch (Exception ignored) {
      return openingHoursJson;
    }
  }

  private String removeRejectionReasonFromOpeningHours(String openingHoursJson) {
    if (openingHoursJson == null || openingHoursJson.isBlank()) {
      return openingHoursJson;
    }
    try {
      Map<String, Object> map =
          new LinkedHashMap<>(objectMapper.readValue(openingHoursJson, new TypeReference<>() {}));
      map.remove("_rejectionReason");
      return objectMapper.writeValueAsString(map);
    } catch (Exception ignored) {
      return openingHoursJson;
    }
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

  public DestinationReviewStats getReviewStats(UUID destinationId) {
    if (jdbcTemplate == null || destinationId == null) {
      return DestinationReviewStats.EMPTY;
    }
    try {
      return jdbcTemplate.query(
          "SELECT AVG(rating) as avg_rating, COUNT(id) as review_count FROM reviews WHERE destination_id = ? AND status = 'VISIBLE'",
          rs -> {
            if (rs.next()) {
              int count = rs.getInt("review_count");
              if (count > 0) {
                double avg = rs.getDouble("avg_rating");
                double rounded = Math.round(avg * 10.0) / 10.0;
                return new DestinationReviewStats(rounded, count);
              }
            }
            return DestinationReviewStats.EMPTY;
          },
          destinationId);
    } catch (Exception e) {
      return DestinationReviewStats.EMPTY;
    }
  }

  public Map<UUID, DestinationReviewStats> getReviewStatsBatch(List<UUID> destinationIds) {
    if (jdbcTemplate == null || destinationIds == null || destinationIds.isEmpty()) {
      return Collections.emptyMap();
    }
    try {
      String inSql = String.join(",", Collections.nCopies(destinationIds.size(), "?"));
      String sql =
          "SELECT destination_id, AVG(rating) as avg_rating, COUNT(id) as review_count "
              + "FROM reviews "
              + "WHERE destination_id IN ("
              + inSql
              + ") AND status = 'VISIBLE' "
              + "GROUP BY destination_id";

      Object[] params = destinationIds.toArray();
      return jdbcTemplate.query(
          sql,
          rs -> {
            Map<UUID, DestinationReviewStats> map = new HashMap<>();
            while (rs.next()) {
              UUID destId = (UUID) rs.getObject("destination_id");
              int count = rs.getInt("review_count");
              if (count > 0) {
                double avg = rs.getDouble("avg_rating");
                double rounded = Math.round(avg * 10.0) / 10.0;
                map.put(destId, new DestinationReviewStats(rounded, count));
              }
            }
            return map;
          },
          params);
    } catch (Exception e) {
      return Collections.emptyMap();
    }
  }

  private DestinationSummaryDto toSummaryDto(Destination dest) {
    return toSummaryDto(dest, getReviewStats(dest.getId()));
  }

  private DestinationSummaryDto toSummaryDto(Destination dest, DestinationReviewStats stats) {
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
        dest.getStatus(),
        stats != null ? stats.rating() : null,
        stats != null ? stats.reviewCount() : 0);
  }

  private DestinationDetailDto toDetailDto(Destination dest, boolean isFavorite) {
    return toDetailDto(dest, isFavorite, getReviewStats(dest.getId()));
  }

  private DestinationDetailDto toDetailDto(
      Destination dest, boolean isFavorite, DestinationReviewStats stats) {
    List<String> imageUrls = List.of();
    if (dest.getImages() != null && !dest.getImages().isEmpty()) {
      imageUrls =
          dest.getImages().stream()
              .sorted(
                  Comparator.comparingInt(
                      img -> img.getSortOrder() != null ? img.getSortOrder() : 0))
              .map(DestinationImage::getStoragePath)
              .filter(p -> p != null && !p.isBlank())
              .toList();
    }
    String imageUrl = !imageUrls.isEmpty() ? imageUrls.get(0) : null;

    Map<String, Object> openingHoursMap = Collections.emptyMap();
    String extractedRejectionReason = null;
    if (dest.getOpeningHours() != null && !dest.getOpeningHours().isBlank()) {
      try {
        Map<String, Object> parsed =
            new LinkedHashMap<>(
                objectMapper.readValue(dest.getOpeningHours(), new TypeReference<>() {}));
        Object reasonObj = parsed.remove("_rejectionReason");
        if (reasonObj != null) {
          extractedRejectionReason = reasonObj.toString();
        }
        openingHoursMap = parsed;
      } catch (Exception ignored) {
        // Fallback gracefully if parsing fails
      }
    }

    String rejectionReason =
        dest.getRejectionReason() != null ? dest.getRejectionReason() : extractedRejectionReason;

    return new DestinationDetailDto(
        dest.getId(),
        dest.getName(),
        dest.getProvince() != null ? dest.getProvince().getName() : "",
        dest.getCategory() != null ? dest.getCategory().getName() : "",
        imageUrl,
        imageUrls,
        dest.getPriceMin(),
        dest.getPriceMax(),
        dest.getLatitude() != null ? dest.getLatitude().doubleValue() : null,
        dest.getLongitude() != null ? dest.getLongitude().doubleValue() : null,
        dest.getStatus(),
        dest.getDescription(),
        openingHoursMap,
        dest.getSourceUrl(),
        dest.getVerifiedAt(),
        isFavorite,
        stats != null ? stats.rating() : null,
        stats != null ? stats.reviewCount() : 0,
        rejectionReason);
  }
}
