package com.vista.destination.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.common.audit.AuditLogService;
import com.vista.destination.api.dto.ApproveDestinationRequestDto;
import com.vista.destination.api.dto.DestinationDetailDto;
import com.vista.destination.api.dto.DestinationRequestDto;
import com.vista.destination.api.dto.DestinationRequestPageDto;
import com.vista.destination.api.dto.DestinationRequestStatsDto;
import com.vista.destination.api.dto.SubmitDestinationRequestDto;
import com.vista.destination.domain.Destination;
import com.vista.destination.domain.DestinationCategory;
import com.vista.destination.domain.DestinationRequest;
import com.vista.destination.domain.Province;
import com.vista.destination.repository.DestinationCategoryRepository;
import com.vista.destination.repository.DestinationRepository;
import com.vista.destination.repository.DestinationRequestRepository;
import com.vista.destination.repository.ProvinceRepository;
import com.vista.user.domain.UserEntity;
import com.vista.user.infrastructure.UserRepository;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DestinationRequestService {

  private static final BigDecimal LAT_MIN = new BigDecimal("-90");
  private static final BigDecimal LAT_MAX = new BigDecimal("90");
  private static final BigDecimal LNG_MIN = new BigDecimal("-180");
  private static final BigDecimal LNG_MAX = new BigDecimal("180");
  private static final Pattern NON_ALPHANUM = Pattern.compile("[^a-z0-9]+");

  private final DestinationRequestRepository requestRepository;
  private final DestinationRepository destinationRepository;
  private final ProvinceRepository provinceRepository;
  private final DestinationCategoryRepository categoryRepository;
  private final DestinationService destinationService;
  private final ObjectMapper objectMapper;

  @Autowired(required = false)
  private UserRepository userRepository;

  @Autowired(required = false)
  private AuditLogService auditLogService;

  @Autowired
  public DestinationRequestService(
      DestinationRequestRepository requestRepository,
      DestinationRepository destinationRepository,
      @Autowired(required = false) ProvinceRepository provinceRepository,
      @Autowired(required = false) DestinationCategoryRepository categoryRepository,
      @Autowired(required = false) DestinationService destinationService) {
    this.requestRepository = requestRepository;
    this.destinationRepository = destinationRepository;
    this.provinceRepository = provinceRepository;
    this.categoryRepository = categoryRepository;
    this.destinationService = destinationService;
    this.objectMapper = new ObjectMapper();
  }

  public void setAuditLogService(AuditLogService auditLogService) {
    this.auditLogService = auditLogService;
  }

  public void setUserRepository(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Transactional
  public DestinationRequestDto submitRequest(UUID userId, SubmitDestinationRequestDto dto) {
    if (userId == null) {
      throw new IllegalArgumentException("Yêu cầu đăng nhập để gửi đề xuất");
    }
    if (dto == null || dto.requestType() == null || dto.requestType().isBlank()) {
      throw new IllegalArgumentException("Loại yêu cầu (requestType) không được để trống");
    }

    String type = dto.requestType().trim().toUpperCase(Locale.ROOT);
    if (!DestinationRequest.TYPE_CREATE.equals(type)
        && !DestinationRequest.TYPE_UPDATE.equals(type)) {
      throw new IllegalArgumentException(
          "Loại yêu cầu không hợp lệ: " + dto.requestType() + ". Chỉ chấp nhận CREATE hoặc UPDATE");
    }

    validateCoordinatesAndPrices(
        dto.latitude(), dto.longitude(), dto.priceMin(), dto.priceMax(), false);

    DestinationRequest req = new DestinationRequest();
    req.setRequestType(type);
    req.setSubmittedBy(userId);
    req.setStatus(DestinationRequest.STATUS_PENDING);
    req.setCreatedAt(Instant.now());
    req.setUpdatedAt(Instant.now());

    if (DestinationRequest.TYPE_CREATE.equals(type)) {
      if (isBlank(dto.name())) {
        throw new IllegalArgumentException("Tên địa điểm không được để trống khi đề xuất thêm mới");
      }
      if (isBlank(dto.provinceName())) {
        throw new IllegalArgumentException("Tỉnh/thành không được để trống khi đề xuất thêm mới");
      }
      if (dto.latitude() == null || dto.longitude() == null) {
        throw new IllegalArgumentException("Tọa độ GPS (latitude, longitude) là bắt buộc");
      }
      req.setTargetDestinationId(null);
    } else {
      if (dto.targetDestinationId() == null) {
        throw new IllegalArgumentException(
            "targetDestinationId là bắt buộc khi yêu cầu cập nhật địa điểm");
      }
      Destination target =
          destinationRepository
              .findById(dto.targetDestinationId())
              .orElseThrow(
                  () ->
                      new DestinationNotFoundException(
                          "Không tìm thấy địa điểm với mã: " + dto.targetDestinationId()));
      if (!DestinationService.STATUS_PUBLISHED.equalsIgnoreCase(target.getStatus())) {
        throw new IllegalArgumentException(
            "Chỉ có thể đề xuất cập nhật cho địa điểm đang ở trạng thái PUBLISHED");
      }
      if (!hasAnyContent(dto)) {
        throw new IllegalArgumentException(
            "Vui lòng cung cấp ít nhất một trường thông tin cần cập nhật hoặc ghi chú");
      }
      boolean duplicatePending =
          requestRepository.existsBySubmittedByAndTargetDestinationIdAndStatus(
              userId, dto.targetDestinationId(), DestinationRequest.STATUS_PENDING);
      if (duplicatePending) {
        throw new DestinationRequestConflictException(
            "Bạn đã có một yêu cầu cập nhật đang chờ duyệt cho địa điểm này. Vui lòng chỉnh sửa yêu cầu hiện có.");
      }
      req.setTargetDestinationId(dto.targetDestinationId());
    }

    applyPayloadToEntity(req, dto);
    DestinationRequest saved = requestRepository.save(req);
    return toDto(saved, null);
  }

  @Transactional
  public DestinationRequestDto updateMyRequest(
      UUID userId, UUID requestId, SubmitDestinationRequestDto dto) {
    if (userId == null) {
      throw new IllegalArgumentException("Yêu cầu đăng nhập để chỉnh sửa đề xuất");
    }
    DestinationRequest req =
        requestRepository
            .findById(requestId)
            .orElseThrow(
                () ->
                    new DestinationRequestNotFoundException(
                        "Không tìm thấy yêu cầu với mã: " + requestId));

    if (!userId.equals(req.getSubmittedBy())) {
      throw new DestinationRequestForbiddenException(
          "Bạn không có quyền chỉnh sửa yêu cầu của người dùng khác");
    }

    if (DestinationRequest.STATUS_APPROVED.equals(req.getStatus())) {
      throw new DestinationRequestConflictException(
          "Không thể chỉnh sửa yêu cầu đã được phê duyệt");
    }

    validateCoordinatesAndPrices(
        dto.latitude(), dto.longitude(), dto.priceMin(), dto.priceMax(), false);

    if (DestinationRequest.TYPE_CREATE.equals(req.getRequestType())) {
      if (isBlank(dto.name())) {
        throw new IllegalArgumentException("Tên địa điểm không được để trống");
      }
      if (isBlank(dto.provinceName())) {
        throw new IllegalArgumentException("Tỉnh/thành không được để trống");
      }
      if (dto.latitude() == null || dto.longitude() == null) {
        throw new IllegalArgumentException("Tọa độ GPS (latitude, longitude) là bắt buộc");
      }
    } else if (!hasAnyContent(dto)) {
      throw new IllegalArgumentException(
          "Vui lòng cung cấp ít nhất một trường thông tin cần cập nhật hoặc ghi chú");
    }

    applyPayloadToEntity(req, dto);
    req.setStatus(DestinationRequest.STATUS_PENDING);
    req.setRejectionReason(null);
    req.setReviewedBy(null);
    req.setReviewedAt(null);
    req.setUpdatedAt(Instant.now());

    DestinationRequest saved = requestRepository.save(req);
    return toDto(saved, null);
  }

  public DestinationRequestPageDto getMyRequests(UUID userId, String status, int page, int size) {
    int validPage = Math.max(0, page);
    int validSize = Math.min(Math.max(1, size), 100);

    Specification<DestinationRequest> spec =
        (root, query, cb) -> {
          List<Predicate> predicates = new ArrayList<>();
          predicates.add(cb.equal(root.get("submittedBy"), userId));
          if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status.trim())) {
            predicates.add(cb.equal(root.get("status"), status.trim().toUpperCase(Locale.ROOT)));
          }
          return cb.and(predicates.toArray(new Predicate[0]));
        };

    Page<DestinationRequest> pageResult =
        requestRepository.findAll(
            spec, PageRequest.of(validPage, validSize, Sort.by(Sort.Direction.DESC, "createdAt")));

    return toPageDto(pageResult);
  }

  public DestinationRequestPageDto getAdminRequests(
      String status, String requestType, String keyword, int page, int size) {
    int validPage = Math.max(0, page);
    int validSize = Math.min(Math.max(1, size), 100);

    Specification<DestinationRequest> spec =
        (root, query, cb) -> {
          List<Predicate> predicates = new ArrayList<>();
          if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status.trim())) {
            predicates.add(cb.equal(root.get("status"), status.trim().toUpperCase(Locale.ROOT)));
          }
          if (requestType != null
              && !requestType.isBlank()
              && !"ALL".equalsIgnoreCase(requestType.trim())) {
            predicates.add(
                cb.equal(root.get("requestType"), requestType.trim().toUpperCase(Locale.ROOT)));
          }
          if (keyword != null && !keyword.isBlank()) {
            String pattern = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
            predicates.add(
                cb.or(
                    cb.like(cb.lower(root.get("name")), pattern),
                    cb.like(cb.lower(root.get("provinceName")), pattern),
                    cb.like(cb.lower(root.get("note")), pattern)));
          }
          return cb.and(predicates.toArray(new Predicate[0]));
        };

    Page<DestinationRequest> pageResult =
        requestRepository.findAll(
            spec, PageRequest.of(validPage, validSize, Sort.by(Sort.Direction.DESC, "createdAt")));

    return toPageDto(pageResult);
  }

  public DestinationRequestStatsDto getStats() {
    long pending = requestRepository.countByStatus(DestinationRequest.STATUS_PENDING);
    long approved = requestRepository.countByStatus(DestinationRequest.STATUS_APPROVED);
    long rejected = requestRepository.countByStatus(DestinationRequest.STATUS_REJECTED);
    long total = requestRepository.count();
    return new DestinationRequestStatsDto(pending, approved, rejected, total);
  }

  public DestinationRequestDto getAdminRequestDetail(UUID id) {
    DestinationRequest req =
        requestRepository
            .findById(id)
            .orElseThrow(
                () ->
                    new DestinationRequestNotFoundException(
                        "Không tìm thấy yêu cầu với mã: " + id));

    DestinationDetailDto currentDest = null;
    if (req.getTargetDestinationId() != null) {
      if (destinationService != null) {
        try {
          currentDest = destinationService.getDestinationAdminDetail(req.getTargetDestinationId());
        } catch (DestinationNotFoundException ignored) {
          currentDest = null;
        }
      }
    }
    return toDto(req, currentDest);
  }

  @Transactional
  public DestinationRequestDto approveRequest(
      UUID requestId, UUID moderatorId, ApproveDestinationRequestDto overrides) {
    DestinationRequest req =
        requestRepository
            .findById(requestId)
            .orElseThrow(
                () ->
                    new DestinationRequestNotFoundException(
                        "Không tìm thấy yêu cầu với mã: " + requestId));

    if (!DestinationRequest.STATUS_PENDING.equals(req.getStatus())) {
      throw new DestinationRequestConflictException(
          "Chỉ có thể phê duyệt yêu cầu đang ở trạng thái PENDING (hiện tại: "
              + req.getStatus()
              + ")");
    }

    if (overrides != null) {
      applyOverrides(req, overrides);
    }

    validateCoordinatesAndPrices(
        req.getLatitude(), req.getLongitude(), req.getPriceMin(), req.getPriceMax(), false);

    if (DestinationRequest.TYPE_CREATE.equals(req.getRequestType())) {
      if (isBlank(req.getName()) || isBlank(req.getProvinceName())) {
        throw new IllegalArgumentException(
            "Tên địa điểm và tỉnh thành là bắt buộc để tạo địa điểm mới");
      }
      Destination created = createDestinationFromRequest(req);
      req.setTargetDestinationId(created.getId());
    } else {
      if (req.getTargetDestinationId() == null) {
        throw new IllegalArgumentException("Thiếu targetDestinationId cho yêu cầu UPDATE");
      }
      Destination target =
          destinationRepository
              .findById(req.getTargetDestinationId())
              .orElseThrow(
                  () ->
                      new DestinationNotFoundException(
                          "Không tìm thấy địa điểm đích với mã: " + req.getTargetDestinationId()));
      applyUpdateToDestination(target, req);
      destinationRepository.save(target);
    }

    req.setStatus(DestinationRequest.STATUS_APPROVED);
    req.setReviewedBy(moderatorId);
    req.setReviewedAt(Instant.now());
    req.setUpdatedAt(Instant.now());
    DestinationRequest saved = requestRepository.save(req);

    if (auditLogService != null) {
      auditLogService.logAction(
          moderatorId,
          "APPROVE_DESTINATION_REQUEST",
          "DESTINATION_REQUEST",
          saved.getId().toString(),
          "Phê duyệt yêu cầu "
              + saved.getRequestType()
              + " cho địa điểm: "
              + (saved.getName() != null ? saved.getName() : saved.getTargetDestinationId()));
    }

    return toDto(saved, null);
  }

  @Transactional
  public DestinationRequestDto rejectRequest(UUID requestId, UUID moderatorId, String reason) {
    if (reason == null || reason.trim().length() < 10 || reason.trim().length() > 500) {
      throw new IllegalArgumentException("Lý do từ chối phải có độ dài từ 10 đến 500 ký tự");
    }

    DestinationRequest req =
        requestRepository
            .findById(requestId)
            .orElseThrow(
                () ->
                    new DestinationRequestNotFoundException(
                        "Không tìm thấy yêu cầu với mã: " + requestId));

    if (!DestinationRequest.STATUS_PENDING.equals(req.getStatus())) {
      throw new DestinationRequestConflictException(
          "Chỉ có thể từ chối yêu cầu đang ở trạng thái PENDING (hiện tại: "
              + req.getStatus()
              + ")");
    }

    req.setStatus(DestinationRequest.STATUS_REJECTED);
    req.setRejectionReason(reason.trim());
    req.setReviewedBy(moderatorId);
    req.setReviewedAt(Instant.now());
    req.setUpdatedAt(Instant.now());
    DestinationRequest saved = requestRepository.save(req);

    if (auditLogService != null) {
      auditLogService.logAction(
          moderatorId,
          "REJECT_DESTINATION_REQUEST",
          "DESTINATION_REQUEST",
          saved.getId().toString(),
          reason.trim());
    }

    return toDto(saved, null);
  }

  private Destination createDestinationFromRequest(DestinationRequest req) {
    String name = req.getName().trim();
    String slug = generateUniqueSlug(name, null);

    Province province = resolveProvince(req.getProvinceName());
    String catName =
        !isBlank(req.getCategoryName()) ? req.getCategoryName().trim() : "Cảnh quan & Văn hóa";
    DestinationCategory category = resolveCategory(catName);

    Destination dest = new Destination();
    dest.setName(name);
    dest.setSlug(slug);
    dest.setProvince(province);
    dest.setCategory(category);
    dest.setDescription(req.getDescription() != null ? req.getDescription().trim() : "");
    dest.setLatitude(req.getLatitude());
    dest.setLongitude(req.getLongitude());
    dest.setPriceMin(req.getPriceMin() != null ? req.getPriceMin() : BigDecimal.ZERO);
    dest.setPriceMax(req.getPriceMax() != null ? req.getPriceMax() : dest.getPriceMin());
    dest.setOpeningHours(
        req.getOpeningHours() != null && !req.getOpeningHours().isBlank()
            ? req.getOpeningHours()
            : "{\"mon\":\"-\",\"tue\":\"-\",\"wed\":\"-\",\"thu\":\"-\",\"fri\":\"-\",\"sat\":\"-\",\"sun\":\"-\"}");
    dest.setSourceUrl(req.getSourceUrl());
    dest.setStatus(DestinationService.STATUS_PUBLISHED);
    dest.setVerifiedAt(Instant.now());
    dest.setCreatedAt(Instant.now());
    dest.setUpdatedAt(Instant.now());

    List<String> urls = parseImageUrls(req.getImageUrls());
    for (int i = 0; i < urls.size(); i++) {
      dest.addImage(urls.get(i), name, i);
    }

    return destinationRepository.save(dest);
  }

  private void applyUpdateToDestination(Destination target, DestinationRequest req) {
    if (!isBlank(req.getName())) {
      String trimmedName = req.getName().trim();
      if (!trimmedName.equals(target.getName())) {
        target.setName(trimmedName);
        target.setSlug(generateUniqueSlug(trimmedName, target.getSlug()));
      }
    }
    if (!isBlank(req.getProvinceName())) {
      target.setProvince(resolveProvince(req.getProvinceName()));
    }
    if (!isBlank(req.getCategoryName())) {
      target.setCategory(resolveCategory(req.getCategoryName()));
    }
    if (!isBlank(req.getDescription())) {
      target.setDescription(req.getDescription().trim());
    }
    if (req.getLatitude() != null) {
      target.setLatitude(req.getLatitude());
    }
    if (req.getLongitude() != null) {
      target.setLongitude(req.getLongitude());
    }
    if (req.getPriceMin() != null) {
      target.setPriceMin(req.getPriceMin());
    }
    if (req.getPriceMax() != null) {
      target.setPriceMax(req.getPriceMax());
    }
    if (!isBlank(req.getOpeningHours())) {
      target.setOpeningHours(req.getOpeningHours());
    }
    if (!isBlank(req.getSourceUrl())) {
      target.setSourceUrl(req.getSourceUrl().trim());
    }
    List<String> urls = parseImageUrls(req.getImageUrls());
    if (!urls.isEmpty()) {
      target.getImages().clear();
      String alt = target.getName() != null ? target.getName() : "Destination";
      for (int i = 0; i < urls.size(); i++) {
        target.addImage(urls.get(i), alt, i);
      }
    }
    target.setVerifiedAt(Instant.now());
    target.setUpdatedAt(Instant.now());
  }

  private Province resolveProvince(String provinceName) {
    String provName = provinceName != null && !provinceName.isBlank() ? provinceName.trim() : "Đà Nẵng";
    if (provinceRepository != null) {
      return provinceRepository
          .findByName(provName)
          .orElseGet(
              () -> provinceRepository.save(new Province(provName, toSlug(provName), "VN-REGION")));
    }
    return new Province(provName, toSlug(provName), "VN-REGION");
  }

  private DestinationCategory resolveCategory(String categoryName) {
    String catName =
        categoryName != null && !categoryName.isBlank() ? categoryName.trim() : "Cảnh quan";
    if (categoryRepository != null) {
      return categoryRepository
          .findByName(catName)
          .orElseGet(
              () -> categoryRepository.save(new DestinationCategory(catName, "category-default")));
    }
    return new DestinationCategory(catName, "category-default");
  }

  private String generateUniqueSlug(String name, String currentSlug) {
    String baseSlug = toSlug(name);
    if (baseSlug.isBlank()) {
      baseSlug = "destination";
    }
    String slug = baseSlug;
    int attempt = 1;
    while (destinationRepository.existsBySlug(slug) && !slug.equals(currentSlug)) {
      slug = baseSlug + "-" + (attempt++) + "-" + UUID.randomUUID().toString().substring(0, 4);
    }
    return slug;
  }

  private void applyPayloadToEntity(DestinationRequest req, SubmitDestinationRequestDto dto) {
    req.setName(trimOrNull(dto.name()));
    req.setProvinceName(trimOrNull(dto.provinceName()));
    req.setCategoryName(trimOrNull(dto.categoryName()));
    req.setDescription(trimOrNull(dto.description()));
    req.setAddress(trimOrNull(dto.address()));
    req.setLatitude(dto.latitude());
    req.setLongitude(dto.longitude());
    req.setPriceMin(dto.priceMin());
    req.setPriceMax(dto.priceMax());
    req.setOpeningHours(serializeOpeningHours(dto.openingHours()));
    req.setImageUrls(serializeImageUrls(dto.imageUrls()));
    req.setSourceUrl(trimOrNull(dto.sourceUrl()));
    req.setNote(trimOrNull(dto.note()));
  }

  private void applyOverrides(DestinationRequest req, ApproveDestinationRequestDto overrides) {
    if (!isBlank(overrides.name())) req.setName(overrides.name().trim());
    if (!isBlank(overrides.provinceName())) req.setProvinceName(overrides.provinceName().trim());
    if (!isBlank(overrides.categoryName())) req.setCategoryName(overrides.categoryName().trim());
    if (overrides.description() != null) req.setDescription(trimOrNull(overrides.description()));
    if (overrides.address() != null) req.setAddress(trimOrNull(overrides.address()));
    if (overrides.latitude() != null) req.setLatitude(overrides.latitude());
    if (overrides.longitude() != null) req.setLongitude(overrides.longitude());
    if (overrides.priceMin() != null) req.setPriceMin(overrides.priceMin());
    if (overrides.priceMax() != null) req.setPriceMax(overrides.priceMax());
    if (overrides.openingHours() != null) {
      req.setOpeningHours(serializeOpeningHours(overrides.openingHours()));
    }
    if (overrides.imageUrls() != null) {
      req.setImageUrls(serializeImageUrls(overrides.imageUrls()));
    }
    if (overrides.sourceUrl() != null) req.setSourceUrl(trimOrNull(overrides.sourceUrl()));
  }

  private void validateCoordinatesAndPrices(
      BigDecimal lat, BigDecimal lng, BigDecimal priceMin, BigDecimal priceMax, boolean requireCoords) {
    if (requireCoords && (lat == null || lng == null)) {
      throw new IllegalArgumentException("Tọa độ GPS (latitude, longitude) là bắt buộc");
    }
    if (lat != null && (lat.compareTo(LAT_MIN) < 0 || lat.compareTo(LAT_MAX) > 0)) {
      throw new IllegalArgumentException("Vĩ độ (latitude) phải nằm trong khoảng [-90, 90]");
    }
    if (lng != null && (lng.compareTo(LNG_MIN) < 0 || lng.compareTo(LNG_MAX) > 0)) {
      throw new IllegalArgumentException("Kinh độ (longitude) phải nằm trong khoảng [-180, 180]");
    }
    if (priceMin != null && priceMin.compareTo(BigDecimal.ZERO) < 0) {
      throw new IllegalArgumentException("Giá vé tối thiểu không được âm");
    }
    if (priceMax != null && priceMax.compareTo(BigDecimal.ZERO) < 0) {
      throw new IllegalArgumentException("Giá vé tối đa không được âm");
    }
    if (priceMin != null && priceMax != null && priceMax.compareTo(priceMin) < 0) {
      throw new IllegalArgumentException("Giá vé tối đa phải lớn hơn hoặc bằng giá vé tối thiểu");
    }
  }

  private boolean hasAnyContent(SubmitDestinationRequestDto dto) {
    return !isBlank(dto.name())
        || !isBlank(dto.provinceName())
        || !isBlank(dto.categoryName())
        || !isBlank(dto.description())
        || !isBlank(dto.address())
        || dto.latitude() != null
        || dto.longitude() != null
        || dto.priceMin() != null
        || dto.priceMax() != null
        || dto.openingHours() != null
        || (dto.imageUrls() != null && !dto.imageUrls().isEmpty())
        || !isBlank(dto.sourceUrl())
        || !isBlank(dto.note());
  }

  private DestinationRequestPageDto toPageDto(Page<DestinationRequest> pageResult) {
    List<DestinationRequest> content = pageResult.getContent();
    Map<UUID, String> userNames = resolveUserNames(content);
    Map<UUID, String> destNames = resolveDestinationNames(content);

    List<DestinationRequestDto> items =
        content.stream()
            .map(
                r ->
                    toDto(
                        r,
                        null,
                        userNames.get(r.getSubmittedBy()),
                        r.getReviewedBy() != null ? userNames.get(r.getReviewedBy()) : null,
                        r.getTargetDestinationId() != null
                            ? destNames.get(r.getTargetDestinationId())
                            : null))
            .toList();
    return new DestinationRequestPageDto(
        items, pageResult.getNumber(), pageResult.getSize(), pageResult.getTotalElements());
  }

  private Map<UUID, String> resolveUserNames(List<DestinationRequest> requests) {
    if (userRepository == null || requests.isEmpty()) {
      return Collections.emptyMap();
    }
    Set<UUID> userIds =
        requests.stream()
            .flatMap(r -> java.util.stream.Stream.of(r.getSubmittedBy(), r.getReviewedBy()))
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
    if (userIds.isEmpty()) {
      return Collections.emptyMap();
    }
    Map<UUID, String> map = new HashMap<>();
    for (UserEntity u : userRepository.findAllById(userIds)) {
      map.put(u.getId(), u.getDisplayName() != null ? u.getDisplayName() : u.getEmail());
    }
    return map;
  }

  private Map<UUID, String> resolveDestinationNames(List<DestinationRequest> requests) {
    if (requests.isEmpty()) {
      return Collections.emptyMap();
    }
    Set<UUID> destIds =
        requests.stream()
            .map(DestinationRequest::getTargetDestinationId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
    if (destIds.isEmpty()) {
      return Collections.emptyMap();
    }
    Map<UUID, String> map = new HashMap<>();
    for (Destination d : destinationRepository.findAllById(destIds)) {
      map.put(d.getId(), d.getName());
    }
    return map;
  }

  private DestinationRequestDto toDto(
      DestinationRequest r, DestinationDetailDto currentDestination) {
    String submittedByName = null;
    String reviewedByName = null;
    String targetDestName = null;
    if (userRepository != null) {
      if (r.getSubmittedBy() != null) {
        submittedByName =
            userRepository
                .findById(r.getSubmittedBy())
                .map(u -> u.getDisplayName() != null ? u.getDisplayName() : u.getEmail())
                .orElse(null);
      }
      if (r.getReviewedBy() != null) {
        reviewedByName =
            userRepository
                .findById(r.getReviewedBy())
                .map(u -> u.getDisplayName() != null ? u.getDisplayName() : u.getEmail())
                .orElse(null);
      }
    }
    if (currentDestination != null) {
      targetDestName = currentDestination.name();
    } else if (r.getTargetDestinationId() != null) {
      targetDestName =
          destinationRepository
              .findById(r.getTargetDestinationId())
              .map(Destination::getName)
              .orElse(null);
    }
    return toDto(r, currentDestination, submittedByName, reviewedByName, targetDestName);
  }

  private DestinationRequestDto toDto(
      DestinationRequest r,
      DestinationDetailDto currentDestination,
      String submittedByName,
      String reviewedByName,
      String targetDestinationName) {
    return new DestinationRequestDto(
        r.getId(),
        r.getRequestType(),
        r.getTargetDestinationId(),
        targetDestinationName,
        r.getSubmittedBy(),
        submittedByName,
        r.getName(),
        r.getProvinceName(),
        r.getCategoryName(),
        r.getDescription(),
        r.getAddress(),
        r.getLatitude() != null ? r.getLatitude().doubleValue() : null,
        r.getLongitude() != null ? r.getLongitude().doubleValue() : null,
        r.getPriceMin(),
        r.getPriceMax(),
        parseOpeningHours(r.getOpeningHours()),
        parseImageUrls(r.getImageUrls()),
        r.getSourceUrl(),
        r.getNote(),
        r.getStatus(),
        r.getRejectionReason(),
        r.getReviewedBy(),
        reviewedByName,
        r.getReviewedAt(),
        r.getCreatedAt(),
        r.getUpdatedAt(),
        currentDestination);
  }

  private String serializeOpeningHours(Object openingHours) {
    if (openingHours == null) {
      return null;
    }
    if (openingHours instanceof String s) {
      String trimmed = s.trim();
      if (trimmed.isBlank()) return null;
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        return trimmed;
      }
      return "{\"all\":\"" + trimmed.replace("\"", "\\\"") + "\"}";
    }
    try {
      return objectMapper.writeValueAsString(openingHours);
    } catch (Exception e) {
      return null;
    }
  }

  private Map<String, Object> parseOpeningHours(String json) {
    if (json == null || json.isBlank()) {
      return Collections.emptyMap();
    }
    try {
      return new LinkedHashMap<>(objectMapper.readValue(json, new TypeReference<>() {}));
    } catch (Exception e) {
      return Collections.emptyMap();
    }
  }

  private String serializeImageUrls(List<String> urls) {
    if (urls == null || urls.isEmpty()) {
      return null;
    }
    List<String> clean =
        urls.stream().filter(u -> u != null && !u.isBlank()).map(String::trim).distinct().toList();
    if (clean.isEmpty()) {
      return null;
    }
    try {
      return objectMapper.writeValueAsString(clean);
    } catch (Exception e) {
      return null;
    }
  }

  private List<String> parseImageUrls(String json) {
    if (json == null || json.isBlank()) {
      return List.of();
    }
    try {
      return objectMapper.readValue(json, new TypeReference<>() {});
    } catch (Exception e) {
      return List.of();
    }
  }

  private static boolean isBlank(String s) {
    return s == null || s.isBlank();
  }

  private static String trimOrNull(String s) {
    return s == null || s.isBlank() ? null : s.trim();
  }

  private static String toSlug(String input) {
    if (input == null) return "";
    String normalized =
        Normalizer.normalize(input, Normalizer.Form.NFD)
            .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
            .replace('đ', 'd')
            .replace('Đ', 'D')
            .toLowerCase(Locale.ROOT);
    String slug = NON_ALPHANUM.matcher(normalized).replaceAll("-");
    return slug.replaceAll("^-+|-+$", "");
  }
}
