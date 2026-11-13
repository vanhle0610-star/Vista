package com.vista.admin.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vista.admin.dto.AiImagePageDto;
import com.vista.admin.dto.AiImageStatsDto;
import com.vista.admin.dto.DestinationImageAuditItemDto;
import com.vista.admin.dto.ImageCandidateDto;
import com.vista.admin.dto.ImageUpdateHistoryDto;
import com.vista.common.audit.AuditLogService;
import com.vista.destination.domain.Destination;
import com.vista.destination.domain.DestinationImage;
import com.vista.destination.repository.DestinationRepository;
import com.vista.destination.service.DestinationNotFoundException;
import com.vista.destination.service.DestinationService;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminDestinationImageService {

  private static final Logger log = LoggerFactory.getLogger(AdminDestinationImageService.class);

  public static final String STATUS_UNCHECKED = "UNCHECKED";
  public static final String STATUS_VALID = "VALID_IMAGE";
  public static final String STATUS_MISSING = "MISSING_IMAGE";
  public static final String STATUS_BROKEN = "BROKEN_IMAGE";
  public static final String STATUS_SUSPICIOUS = "SUSPICIOUS_IMAGE";
  public static final String STATUS_SEARCHING = "SEARCHING";
  public static final String STATUS_PENDING_APPROVAL = "PENDING_APPROVAL";
  public static final String STATUS_APPROVED_READY = "APPROVED_READY";
  public static final String STATUS_UPDATED = "UPDATED";
  public static final String STATUS_NO_MATCH = "NO_MATCH_FOUND";
  public static final String STATUS_SKIPPED = "SKIPPED";

  private static final String USER_AGENT = "VistaTravelAdminBot/1.0 (https://vista.vn; admin@vista.vn) JavaHttpClient/21";

  private static final Set<String> KNOWN_GENERIC_STOCK_PATTERNS = Set.of(
      "photo-1507525428034-b723cf961d3e",
      "photo-1583417319070-4a69db38a482",
      "photo-1464822759023-fed622ff2c3b",
      "photo-1555396273-367ea4eb4db5",
      "photo-1528127269322-539801943592",
      "picsum.photos",
      "placehold.co",
      "via.placeholder.com",
      "placeholder.com");

  private static final Set<String> STOP_WORDS = Set.copyOf(
      Arrays.asList(
          "khu", "du", "lich", "diem", "tham", "quan", "danh", "thang", "va", "tai", "o", "cua",
          "the", "of", "in", "and", "viet", "nam", "vietnam", "tp", "thanh", "pho", "tinh",
          "sinh", "thai", "di", "tich", "su", "canh", "quoc", "gia"));

  private static final Set<String> GENERIC_LANDMARK_TYPE_WORDS = Set.copyOf(
      Arrays.asList(
          "bai", "bien", "chua", "den", "dinh", "ho", "nui", "thac", "cho", "lang", "nghe",
          "dao", "ban", "vinh", "hang", "dong", "deo", "suoi", "vuon", "bao", "tang", "nha",
          "tho", "co", "do", "thanh", "dia", "ba", "tu", "lau", "cau", "pho", "cong", "vien",
          "quang", "truong", "mon", "am", "thuc", "dac", "san", "rung", "doi", "khe", "ghenh",
          "ganh", "mui", "hon", "cu", "lao", "bau", "ao", "buon", "ap", "cum", "trung", "tam",
          "ga", "xe", "lua", "hat", "lon", "khu", "ton", "thien", "nhien", "van", "hoa", "luu",
          "niem", "dai", "quan", "sat", "toa", "thung", "lung", "cao", "nguyen", "canh", "khau",
          "pha", "miet", "ruong", "khoang", "nong", "ngap", "man"));

  private static final Set<String> BANNED_MEDIA_KEYWORDS = Set.of(
      "locator",
      "location_map",
      "flag_of",
      "coat_of_arms",
      "logo",
      "icon",
      "symbol",
      "diagram",
      "map_of",
      "bando",
      "ban_do",
      "signature",
      "stamp",
      "BlankMap");

  private final DestinationRepository destinationRepository;
  private final ObjectMapper objectMapper;
  private final HttpClient httpClient;
  private final Semaphore httpCheckSemaphore = new Semaphore(20);
  private final java.util.concurrent.ExecutorService batchSearchExecutor = java.util.concurrent.Executors
      .newFixedThreadPool(4);

  @Autowired(required = false)
  private AuditLogService auditLogService;

  @Value("${GOOGLE_CSE_API_KEY:}")
  private String googleCseApiKey = "";

  @Value("${GOOGLE_CSE_CX:}")
  private String googleCseCx = "";

  @Value("${UNSPLASH_ACCESS_KEY:}")
  private String unsplashAccessKey = "";

  @Value("${SUPABASE_URL:}")
  private String supabaseUrl = "";

  // In-memory cache of scan & candidate states (also persisted to _imageMeta in
  // opening_hours)
  private final Map<UUID, DestinationImageAuditItemDto> stateCache = new ConcurrentHashMap<>();
  private final Map<String, Boolean> urlReachabilityCache = new ConcurrentHashMap<>();

  public AdminDestinationImageService(DestinationRepository destinationRepository) {
    this.destinationRepository = destinationRepository;
    this.objectMapper = new ObjectMapper();
    this.httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(4))
        .followRedirects(HttpClient.Redirect.NORMAL)
        .build();
  }

  public void setAuditLogService(AuditLogService auditLogService) {
    this.auditLogService = auditLogService;
  }

  private List<Destination> loadAllDestinations() {
    try {
      List<Destination> withDetails = destinationRepository.findAllWithDetails();
      if (withDetails != null && !withDetails.isEmpty()) {
        return withDetails;
      }
    } catch (Exception e) {
      log.warn(
          "Fallback to destinationRepository.findAll() after findAllWithDetails warning: {}",
          e.getMessage());
    }
    return destinationRepository.findAll();
  }

  private java.util.Optional<Destination> loadDestinationById(UUID id) {
    try {
      java.util.Optional<Destination> withDetails = destinationRepository.findByIdWithDetails(id);
      if (withDetails != null && withDetails.isPresent()) {
        return withDetails;
      }
    } catch (Exception e) {
      log.warn(
          "Fallback to destinationRepository.findById({}) after findByIdWithDetails warning: {}",
          id,
          e.getMessage());
    }
    return destinationRepository.findById(id);
  }

  private List<DestinationImageAuditItemDto> filterAndSortItems(
      List<DestinationImageAuditItemDto> allItems,
      String keyword,
      String province,
      String category,
      String auditStatus) {
    String normKeyword = keyword != null && !keyword.isBlank() ? DestinationService.stripAccents(keyword) : "";
    String normProvince = province != null && !province.isBlank() ? DestinationService.stripAccents(province) : "";
    String normCategory = category != null && !category.isBlank() ? DestinationService.stripAccents(category) : "";
    String normStatus = auditStatus != null && !auditStatus.isBlank() && !"ALL".equalsIgnoreCase(auditStatus)
        ? auditStatus.trim().toUpperCase(Locale.ROOT)
        : "";

    return allItems.stream()
        .filter(
            item -> {
              if (!normKeyword.isEmpty()) {
                String nameNorm = DestinationService.stripAccents(item.name());
                String provNorm = DestinationService.stripAccents(item.province());
                String reasonNorm = DestinationService.stripAccents(item.issueReason());
                if (!nameNorm.contains(normKeyword)
                    && !provNorm.contains(normKeyword)
                    && !reasonNorm.contains(normKeyword)) {
                  return false;
                }
              }
              if (!normProvince.isEmpty()) {
                String provNorm = DestinationService.stripAccents(item.province());
                if (!provNorm.contains(normProvince)) {
                  return false;
                }
              }
              if (!normCategory.isEmpty()) {
                String catNorm = DestinationService.stripAccents(item.category());
                if (!catNorm.contains(normCategory)) {
                  return false;
                }
              }
              if (!normStatus.isEmpty()) {
                if ("NEEDS_ATTENTION".equals(normStatus)) {
                  return STATUS_MISSING.equals(item.auditStatus())
                      || STATUS_BROKEN.equals(item.auditStatus())
                      || STATUS_SUSPICIOUS.equals(item.auditStatus());
                }
                if ("PENDING_APPROVAL".equals(normStatus)) {
                  return STATUS_PENDING_APPROVAL.equals(item.auditStatus())
                      || STATUS_APPROVED_READY.equals(item.auditStatus());
                }
                return normStatus.equals(item.auditStatus());
              }
              return true;
            })
        .sorted(
            Comparator.comparingInt(this::statusPriority)
                .thenComparing(DestinationImageAuditItemDto::name))
        .toList();
  }

  @Transactional(readOnly = true)
  public AiImagePageDto getPageAndStats(
      String keyword, String province, String category, String auditStatus, int page, int size) {
    List<Destination> allDestinations = loadAllDestinations();
    Map<String, Integer> urlCounts = computeUrlUsageCounts(allDestinations);

    List<DestinationImageAuditItemDto> allItems = new ArrayList<>(allDestinations.size());
    for (Destination dest : allDestinations) {
      DestinationImageAuditItemDto item = buildAuditItem(dest, urlCounts, false);
      allItems.add(item);
    }

    AiImageStatsDto stats = computeStats(allItems);
    List<DestinationImageAuditItemDto> filtered = filterAndSortItems(allItems, keyword, province, category,
        auditStatus);

    int validPage = Math.max(0, page);
    int validSize = Math.min(100, Math.max(1, size));
    int fromIndex = Math.min(validPage * validSize, filtered.size());
    int toIndex = Math.min(fromIndex + validSize, filtered.size());
    List<DestinationImageAuditItemDto> pageItems = filtered.subList(fromIndex, toIndex);

    return new AiImagePageDto(pageItems, validPage, validSize, filtered.size(), stats);
  }

  @Transactional(readOnly = true)
  public List<UUID> getTargetIds(String mode, String province, String keyword) {
    List<Destination> allDestinations = loadAllDestinations();
    Map<String, Integer> urlCounts = computeUrlUsageCounts(allDestinations);
    List<DestinationImageAuditItemDto> allItems = new ArrayList<>(allDestinations.size());
    for (Destination dest : allDestinations) {
      allItems.add(buildAuditItem(dest, urlCounts, false));
    }
    return filterAndSortItems(allItems, keyword, province, null, mode).stream()
        .map(DestinationImageAuditItemDto::destinationId)
        .toList();
  }

  private int statusPriority(DestinationImageAuditItemDto item) {
    return switch (item.auditStatus()) {
      case STATUS_APPROVED_READY -> 0;
      case STATUS_PENDING_APPROVAL -> 1;
      case STATUS_BROKEN -> 2;
      case STATUS_MISSING -> 3;
      case STATUS_SUSPICIOUS -> 4;
      case STATUS_NO_MATCH -> 5;
      case STATUS_UPDATED -> 6;
      case STATUS_VALID -> 7;
      case STATUS_SKIPPED -> 8;
      default -> 9;
    };
  }

  @Transactional(readOnly = true)
  public AiImageStatsDto getStats() {
    List<Destination> allDestinations = loadAllDestinations();
    Map<String, Integer> urlCounts = computeUrlUsageCounts(allDestinations);
    List<DestinationImageAuditItemDto> allItems = allDestinations.stream().map(d -> buildAuditItem(d, urlCounts, false))
        .toList();
    return computeStats(allItems);
  }

  private AiImageStatsDto computeStats(List<DestinationImageAuditItemDto> items) {
    long total = items.size();
    long valid = 0;
    long missing = 0;
    long suspicious = 0;
    long broken = 0;
    long pending = 0;
    long updated = 0;
    long unchecked = 0;
    long noMatch = 0;

    for (DestinationImageAuditItemDto item : items) {
      switch (item.auditStatus()) {
        case STATUS_VALID -> valid++;
        case STATUS_MISSING -> missing++;
        case STATUS_SUSPICIOUS -> suspicious++;
        case STATUS_BROKEN -> broken++;
        case STATUS_PENDING_APPROVAL, STATUS_APPROVED_READY -> pending++;
        case STATUS_UPDATED -> {
          updated++;
          valid++;
        }
        case STATUS_NO_MATCH -> noMatch++;
        default -> unchecked++;
      }
    }

    Map<String, Boolean> providers = new LinkedHashMap<>();
    providers.put("wikimediaCommons", true);
    providers.put("wikipediaVi", true);
    providers.put("wikipediaEn", true);
    providers.put(
        "googleCustomSearch",
        googleCseApiKey != null
            && !googleCseApiKey.isBlank()
            && googleCseCx != null
            && !googleCseCx.isBlank());
    providers.put("unsplashApi", unsplashAccessKey != null && !unsplashAccessKey.isBlank());
    providers.put("supabaseStorage", supabaseUrl != null && !supabaseUrl.isBlank());

    return new AiImageStatsDto(
        total, valid, missing, suspicious, broken, pending, updated, unchecked, noMatch, providers);
  }

  @Transactional
  public List<DestinationImageAuditItemDto> scanDestinations(
      List<UUID> destinationIds, boolean checkHttpReachability) {
    List<Destination> allDestinations = loadAllDestinations();
    Map<String, Integer> urlCounts = computeUrlUsageCounts(allDestinations);

    List<Destination> targets;
    if (destinationIds != null && !destinationIds.isEmpty()) {
      Set<UUID> targetSet = new LinkedHashSet<>(destinationIds);
      targets = allDestinations.stream().filter(d -> targetSet.contains(d.getId())).toList();
    } else {
      targets = allDestinations;
    }

    List<DestinationImageAuditItemDto> results = new ArrayList<>(targets.size());
    for (Destination dest : targets) {
      DestinationImageAuditItemDto existing = stateCache.get(dest.getId());
      if (existing != null
          && (STATUS_PENDING_APPROVAL.equals(existing.auditStatus())
              || STATUS_APPROVED_READY.equals(existing.auditStatus())
              || STATUS_UPDATED.equals(existing.auditStatus()))
          && existing.candidates() != null
          && !existing.candidates().isEmpty()) {
        results.add(existing);
        continue;
      }
      DestinationImageAuditItemDto evaluated = buildAuditItem(dest, urlCounts, checkHttpReachability);
      stateCache.put(dest.getId(), evaluated);
      results.add(evaluated);
    }
    return results;
  }

  private void updatePrimaryImageOnEntity(Destination dest, String targetUrl) {
    if (dest.getImages() == null || dest.getImages().isEmpty()) {
      dest.addImage(targetUrl, dest.getName(), 0);
      return;
    }
    DestinationImage primary = dest.getImages().stream()
        .min(
            Comparator.comparingInt(img -> img.getSortOrder() != null ? img.getSortOrder() : 0))
        .orElse(dest.getImages().get(0));
    primary.setStoragePath(targetUrl);
    primary.setAltText(dest.getName());
    if (primary.getSortOrder() == null) {
      primary.setSortOrder(0);
    }
  }

  public DestinationImageAuditItemDto searchCandidatesForDestination(
      UUID destinationId, String customQuery) {
    Destination dest = loadDestinationById(destinationId)
        .orElseThrow(
            () -> new DestinationNotFoundException("Không tìm thấy địa điểm: " + destinationId));

    List<Destination> allDestinations = loadAllDestinations();
    Map<String, Integer> urlCounts = computeUrlUsageCounts(allDestinations);
    DestinationImageAuditItemDto currentItem = buildAuditItem(dest, urlCounts, false);

    List<ImageCandidateDto> candidates = findBestCandidates(dest, customQuery);

    return persistSearchResultForDestination(
        dest, currentItem, candidates, urlCounts, customQuery == null);
  }

  private DestinationImageAuditItemDto persistSearchResultForDestination(
      Destination dest,
      DestinationImageAuditItemDto currentItem,
      List<ImageCandidateDto> candidates,
      Map<String, Integer> urlCounts,
      boolean allowAutoApply) {
    if (!candidates.isEmpty()) {
      // Prefer a candidate URL not already used by another destination to avoid
      // duplicates
      ImageCandidateDto top = candidates.get(0);
      for (ImageCandidateDto cand : candidates) {
        String normKey = normalizeUrlKey(normalizeWikimediaImageUrl(cand.imageUrl()));
        if (cand.confidence() >= 65 && urlCounts.getOrDefault(normKey, 0) == 0) {
          top = cand;
          break;
        }
      }

      boolean canAutoApply = allowAutoApply
          && top.confidence() >= 65
          && !STATUS_VALID.equals(currentItem.auditStatus());
      if (canAutoApply) {
        String targetUrl = normalizeWikimediaImageUrl(top.imageUrl());
        urlCounts.merge(normalizeUrlKey(targetUrl), 1, Integer::sum);
        String oldPrimaryUrl = extractPrimaryImageUrl(dest);
        Instant now = Instant.now();
        updatePrimaryImageOnEntity(dest, targetUrl);
        dest.setUpdatedAt(now);

        String preservedPreviousUrl = oldPrimaryUrl != null && !oldPrimaryUrl.equals(targetUrl)
            ? oldPrimaryUrl
            : currentItem.previousImageUrl();

        Map<String, Object> historyEntry = new LinkedHashMap<>();
        historyEntry.put("id", UUID.randomUUID().toString());
        historyEntry.put("action", "UPDATE");
        historyEntry.put("previousImageUrl", preservedPreviousUrl);
        historyEntry.put("newImageUrl", targetUrl);
        historyEntry.put("sourceName", top.sourceName());
        historyEntry.put("confidence", top.confidence());
        historyEntry.put("performedBy", "AI Image Manager (Auto)");
        historyEntry.put("performedAt", now.toString());

        DestinationImageAuditItemDto updatedItem = new DestinationImageAuditItemDto(
            dest.getId(),
            currentItem.name(),
            currentItem.province(),
            currentItem.category(),
            currentItem.description(),
            currentItem.latitude(),
            currentItem.longitude(),
            currentItem.destinationStatus(),
            targetUrl,
            1,
            STATUS_UPDATED,
            "Đã tự động cập nhật ảnh xác thực từ nguồn: " + top.sourceName(),
            candidates,
            targetUrl,
            top.sourceName(),
            top.sourcePageUrl(),
            top.license(),
            top.confidence(),
            preservedPreviousUrl,
            "AI Image Manager (Auto)",
            now,
            top.sourceName());

        stateCache.put(dest.getId(), updatedItem);
        persistImageMetaToDestination(dest, updatedItem, historyEntry);
        destinationRepository.saveAndFlush(dest);
        return updatedItem;
      }

      DestinationImageAuditItemDto pendingItem = new DestinationImageAuditItemDto(
          dest.getId(),
          currentItem.name(),
          currentItem.province(),
          currentItem.category(),
          currentItem.description(),
          currentItem.latitude(),
          currentItem.longitude(),
          currentItem.destinationStatus(),
          currentItem.currentImageUrl(),
          currentItem.duplicateCount(),
          STATUS_PENDING_APPROVAL,
          "Đã tìm thấy " + candidates.size() + " ảnh đề xuất phù hợp, đang chờ Admin duyệt",
          candidates,
          top.imageUrl(),
          top.sourceName(),
          top.sourcePageUrl(),
          top.license(),
          top.confidence(),
          currentItem.previousImageUrl(),
          currentItem.lastUpdatedBy(),
          currentItem.lastUpdatedAt(),
          currentItem.lastUpdateSource());

      stateCache.put(dest.getId(), pendingItem);
      persistImageMetaToDestination(dest, pendingItem, null);
      destinationRepository.saveAndFlush(dest);
      return pendingItem;
    }

    DestinationImageAuditItemDto noMatchItem = new DestinationImageAuditItemDto(
        dest.getId(),
        currentItem.name(),
        currentItem.province(),
        currentItem.category(),
        currentItem.description(),
        currentItem.latitude(),
        currentItem.longitude(),
        currentItem.destinationStatus(),
        currentItem.currentImageUrl(),
        currentItem.duplicateCount(),
        STATUS_NO_MATCH,
        "Đã tìm kiếm nhưng chưa tìm thấy ảnh có độ tin cậy cao",
        List.of(),
        null,
        null,
        null,
        null,
        null,
        currentItem.previousImageUrl(),
        currentItem.lastUpdatedBy(),
        currentItem.lastUpdatedAt(),
        currentItem.lastUpdateSource());

    stateCache.put(dest.getId(), noMatchItem);
    persistImageMetaToDestination(dest, noMatchItem, null);
    destinationRepository.saveAndFlush(dest);
    return noMatchItem;
  }

  public List<DestinationImageAuditItemDto> searchCandidatesBatch(List<UUID> destinationIds) {
    if (destinationIds == null || destinationIds.isEmpty()) {
      return List.of();
    }
    List<Destination> allDestinations = loadAllDestinations();
    Map<String, Integer> urlCounts = computeUrlUsageCounts(allDestinations);
    Map<UUID, Destination> destMap = new HashMap<>(allDestinations.size());
    for (Destination d : allDestinations) {
      destMap.put(d.getId(), d);
    }

    List<Destination> targetDests = new ArrayList<>();
    for (UUID id : destinationIds) {
      Destination dest = destMap.get(id);
      if (dest == null) {
        dest = loadDestinationById(id).orElse(null);
      }
      if (dest != null) {
        targetDests.add(dest);
      }
    }

    // Run external HTTP candidate searches in parallel outside any database
    // transaction
    Map<UUID, java.util.concurrent.CompletableFuture<List<ImageCandidateDto>>> futures = new LinkedHashMap<>();
    for (Destination dest : targetDests) {
      futures.put(
          dest.getId(),
          java.util.concurrent.CompletableFuture.supplyAsync(
              () -> findBestCandidates(dest, null), batchSearchExecutor));
    }

    List<DestinationImageAuditItemDto> results = new ArrayList<>(targetDests.size());
    for (Destination dest : targetDests) {
      try {
        List<ImageCandidateDto> candidates = futures.get(dest.getId()).get(25, java.util.concurrent.TimeUnit.SECONDS);
        DestinationImageAuditItemDto currentItem = buildAuditItem(dest, urlCounts, false);
        DestinationImageAuditItemDto updatedItem = persistSearchResultForDestination(dest, currentItem, candidates,
            urlCounts, true);
        results.add(updatedItem);
      } catch (Exception e) {
        log.warn("Lỗi tìm kiếm ảnh cho địa điểm {}: {}", dest.getId(), e.getMessage());
      }
    }
    return results;
  }

  @Transactional
  public DestinationImageAuditItemDto selectOrApproveCandidate(
      UUID destinationId,
      String candidateUrl,
      String sourceName,
      String sourcePageUrl,
      String license,
      Integer confidence,
      boolean approvedReady) {
    Destination dest = loadDestinationById(destinationId)
        .orElseThrow(
            () -> new DestinationNotFoundException("Không tìm thấy địa điểm: " + destinationId));

    List<Destination> allDestinations = loadAllDestinations();
    Map<String, Integer> urlCounts = computeUrlUsageCounts(allDestinations);
    DestinationImageAuditItemDto current = buildAuditItem(dest, urlCounts, false);

    String effectiveUrl = candidateUrl != null && !candidateUrl.isBlank()
        ? candidateUrl.trim()
        : current.selectedCandidateUrl();
    if (effectiveUrl == null || effectiveUrl.isBlank()) {
      throw new IllegalArgumentException("Chưa có URL ảnh đề xuất được chọn để duyệt.");
    }

    String effectiveSource = sourceName != null && !sourceName.isBlank()
        ? sourceName
        : (current.selectedCandidateSource() != null
            ? current.selectedCandidateSource()
            : "Admin Selected");
    String effectivePageUrl = sourcePageUrl != null ? sourcePageUrl : current.selectedCandidatePageUrl();
    String effectiveLicense = license != null ? license : current.selectedCandidateLicense();
    Integer effectiveConfidence = confidence != null
        ? confidence
        : (current.selectedCandidateConfidence() != null
            ? current.selectedCandidateConfidence()
            : 85);

    String nextStatus = approvedReady ? STATUS_APPROVED_READY : STATUS_PENDING_APPROVAL;

    DestinationImageAuditItemDto updated = new DestinationImageAuditItemDto(
        dest.getId(),
        current.name(),
        current.province(),
        current.category(),
        current.description(),
        current.latitude(),
        current.longitude(),
        current.destinationStatus(),
        current.currentImageUrl(),
        current.duplicateCount(),
        nextStatus,
        current.issueReason(),
        current.candidates(),
        effectiveUrl,
        effectiveSource,
        effectivePageUrl,
        effectiveLicense,
        effectiveConfidence,
        current.previousImageUrl(),
        current.lastUpdatedBy(),
        current.lastUpdatedAt(),
        current.lastUpdateSource());

    stateCache.put(dest.getId(), updated);
    persistImageMetaToDestination(dest, updated, null);
    return updated;
  }

  public DestinationImageAuditItemDto applyImageUpdate(
      UUID destinationId,
      String newImageUrl,
      String sourceName,
      String sourcePageUrl,
      String license,
      Integer confidence,
      UUID actorId,
      String actorName) {
    Destination dest = loadDestinationById(destinationId)
        .orElseThrow(
            () -> new DestinationNotFoundException("Không tìm thấy địa điểm: " + destinationId));

    List<Destination> allDestinations = loadAllDestinations();
    Map<String, Integer> urlCounts = computeUrlUsageCounts(allDestinations);
    DestinationImageAuditItemDto updated = applyImageUpdateOnLoadedDest(
        dest, urlCounts, newImageUrl, sourceName, sourcePageUrl, license, confidence, actorName);
    if (auditLogService != null) {
      auditLogService.logAction(
          actorId,
          "UPDATE_DESTINATION_IMAGE",
          "DESTINATION",
          destinationId.toString(),
          "Cập nhật ảnh địa điểm: " + dest.getName() + " từ nguồn " + sourceName);
    }
    return updated;
  }

  private DestinationImageAuditItemDto applyImageUpdateOnLoadedDest(
      Destination dest,
      Map<String, Integer> urlCounts,
      String newImageUrl,
      String sourceName,
      String sourcePageUrl,
      String license,
      Integer confidence,
      String actorName) {
    DestinationImageAuditItemDto current = buildAuditItem(dest, urlCounts, false);

    String targetUrl = newImageUrl != null && !newImageUrl.isBlank()
        ? newImageUrl.trim()
        : current.selectedCandidateUrl();

    if (targetUrl != null) {
      targetUrl = normalizeWikimediaImageUrl(targetUrl);
    }

    if (targetUrl == null || targetUrl.isBlank()) {
      throw new IllegalArgumentException(
          "Không thể cập nhật: Chưa có URL ảnh thay thế được xác minh.");
    }

    int effectiveConfidence = confidence != null
        ? confidence
        : (current.selectedCandidateConfidence() != null
            ? current.selectedCandidateConfidence()
            : 80);

    if (effectiveConfidence < 50) {
      throw new IllegalArgumentException(
          "Không thể tự động cập nhật ảnh có độ tin cậy thấp ("
              + effectiveConfidence
              + "%). Yêu cầu độ tin cậy tối thiểu 50%.");
    }

    String oldPrimaryUrl = extractPrimaryImageUrl(dest);
    String effectiveSource = sourceName != null && !sourceName.isBlank()
        ? sourceName
        : (current.selectedCandidateSource() != null
            ? current.selectedCandidateSource()
            : "Wikimedia / Verified Source");
    String effectiveActor = actorName != null && !actorName.isBlank() ? actorName : "Admin VISTA";
    Instant now = Instant.now();

    updatePrimaryImageOnEntity(dest, targetUrl);
    dest.setUpdatedAt(now);

    String preservedPreviousUrl = oldPrimaryUrl != null && !oldPrimaryUrl.equals(targetUrl)
        ? oldPrimaryUrl
        : current.previousImageUrl();

    Map<String, Object> historyEntry = new LinkedHashMap<>();
    historyEntry.put("id", UUID.randomUUID().toString());
    historyEntry.put("action", "UPDATE");
    historyEntry.put("previousImageUrl", preservedPreviousUrl);
    historyEntry.put("newImageUrl", targetUrl);
    historyEntry.put("sourceName", effectiveSource);
    historyEntry.put("confidence", effectiveConfidence);
    historyEntry.put("performedBy", effectiveActor);
    historyEntry.put("performedAt", now.toString());

    DestinationImageAuditItemDto updatedItem = new DestinationImageAuditItemDto(
        dest.getId(),
        dest.getName(),
        dest.getProvince() != null ? dest.getProvince().getName() : "",
        dest.getCategory() != null ? dest.getCategory().getName() : "",
        dest.getDescription(),
        dest.getLatitude() != null ? dest.getLatitude().doubleValue() : null,
        dest.getLongitude() != null ? dest.getLongitude().doubleValue() : null,
        dest.getStatus(),
        targetUrl,
        1,
        STATUS_UPDATED,
        "Đã cập nhật ảnh xác thực từ nguồn: " + effectiveSource,
        current.candidates(),
        targetUrl,
        effectiveSource,
        sourcePageUrl != null ? sourcePageUrl : current.selectedCandidatePageUrl(),
        license != null ? license : current.selectedCandidateLicense(),
        effectiveConfidence,
        preservedPreviousUrl,
        effectiveActor,
        now,
        effectiveSource);

    persistImageMetaToDestination(dest, updatedItem, historyEntry);
    destinationRepository.saveAndFlush(dest);
    stateCache.put(dest.getId(), updatedItem);
    return updatedItem;
  }

  public List<DestinationImageAuditItemDto> applyBatchApproved(
      List<UUID> destinationIds, UUID actorId, String actorName) {
    List<Destination> allDestinations = loadAllDestinations();
    Map<String, Integer> urlCounts = computeUrlUsageCounts(allDestinations);
    Map<UUID, Destination> destMap = new HashMap<>(allDestinations.size());
    for (Destination d : allDestinations) {
      destMap.put(d.getId(), d);
    }

    List<UUID> targets = new ArrayList<>();
    if (destinationIds != null && !destinationIds.isEmpty()) {
      targets.addAll(destinationIds);
    } else {
      for (Destination d : allDestinations) {
        DestinationImageAuditItemDto item = buildAuditItem(d, urlCounts, false);
        if ((STATUS_APPROVED_READY.equals(item.auditStatus())
            || STATUS_PENDING_APPROVAL.equals(item.auditStatus()))
            && item.selectedCandidateUrl() != null
            && !item.selectedCandidateUrl().isBlank()) {
          targets.add(d.getId());
        }
      }
    }

    List<DestinationImageAuditItemDto> updatedList = new ArrayList<>();
    for (UUID id : targets) {
      try {
        Destination dest = destMap.get(id);
        if (dest == null) {
          dest = loadDestinationById(id).orElse(null);
        }
        if (dest == null)
          continue;
        DestinationImageAuditItemDto updated = applyImageUpdateOnLoadedDest(dest, urlCounts, null, null, null, null,
            null, actorName);
        updatedList.add(updated);
      } catch (Exception e) {
        log.warn("Không thể cập nhật hàng loạt cho địa điểm {}: {}", id, e.getMessage());
      }
    }
    return updatedList;
  }

  public DestinationImageAuditItemDto rollbackImage(
      UUID destinationId, UUID actorId, String actorName) {
    Destination dest = loadDestinationById(destinationId)
        .orElseThrow(
            () -> new DestinationNotFoundException("Không tìm thấy địa điểm: " + destinationId));

    List<Destination> allDestinations = loadAllDestinations();
    Map<String, Integer> urlCounts = computeUrlUsageCounts(allDestinations);
    DestinationImageAuditItemDto current = buildAuditItem(dest, urlCounts, false);

    String prevUrl = current.previousImageUrl();
    if (prevUrl == null || prevUrl.isBlank()) {
      throw new IllegalArgumentException(
          "Địa điểm này chưa có URL ảnh cũ trong lịch sử để khôi phục (Rollback).");
    }

    String currentUrl = extractPrimaryImageUrl(dest);
    String effectiveActor = actorName != null && !actorName.isBlank() ? actorName : "Admin VISTA";
    Instant now = Instant.now();

    updatePrimaryImageOnEntity(dest, prevUrl);
    dest.setUpdatedAt(now);

    Map<String, Object> historyEntry = new LinkedHashMap<>();
    historyEntry.put("id", UUID.randomUUID().toString());
    historyEntry.put("action", "ROLLBACK");
    historyEntry.put("previousImageUrl", currentUrl);
    historyEntry.put("newImageUrl", prevUrl);
    historyEntry.put("sourceName", "Rollback về ảnh trước");
    historyEntry.put("confidence", 100);
    historyEntry.put("performedBy", effectiveActor);
    historyEntry.put("performedAt", now.toString());

    DestinationImageAuditItemDto rolledBackItem = new DestinationImageAuditItemDto(
        dest.getId(),
        dest.getName(),
        dest.getProvince() != null ? dest.getProvince().getName() : "",
        dest.getCategory() != null ? dest.getCategory().getName() : "",
        dest.getDescription(),
        dest.getLatitude() != null ? dest.getLatitude().doubleValue() : null,
        dest.getLongitude() != null ? dest.getLongitude().doubleValue() : null,
        dest.getStatus(),
        prevUrl,
        urlCounts.getOrDefault(prevUrl, 1),
        STATUS_VALID,
        "Đã khôi phục (Rollback) về ảnh gốc trước đó",
        current.candidates(),
        current.selectedCandidateUrl(),
        current.selectedCandidateSource(),
        current.selectedCandidatePageUrl(),
        current.selectedCandidateLicense(),
        current.selectedCandidateConfidence(),
        currentUrl,
        effectiveActor,
        now,
        "Rollback");

    persistImageMetaToDestination(dest, rolledBackItem, historyEntry);
    destinationRepository.saveAndFlush(dest);
    stateCache.put(dest.getId(), rolledBackItem);
    if (auditLogService != null) {
      auditLogService.logAction(
          actorId,
          "ROLLBACK_DESTINATION_IMAGE",
          "DESTINATION",
          destinationId.toString(),
          "Khôi phục ảnh cũ của địa điểm: " + dest.getName());
    }
    return rolledBackItem;
  }

  @Transactional
  public DestinationImageAuditItemDto skipDestination(UUID destinationId) {
    Destination dest = loadDestinationById(destinationId)
        .orElseThrow(
            () -> new DestinationNotFoundException("Không tìm thấy địa điểm: " + destinationId));

    List<Destination> allDestinations = loadAllDestinations();
    Map<String, Integer> urlCounts = computeUrlUsageCounts(allDestinations);
    DestinationImageAuditItemDto current = buildAuditItem(dest, urlCounts, false);

    DestinationImageAuditItemDto skipped = new DestinationImageAuditItemDto(
        dest.getId(),
        current.name(),
        current.province(),
        current.category(),
        current.description(),
        current.latitude(),
        current.longitude(),
        current.destinationStatus(),
        current.currentImageUrl(),
        current.duplicateCount(),
        STATUS_SKIPPED,
        "Admin đã đánh dấu bỏ qua kiểm tra địa điểm này",
        current.candidates(),
        current.selectedCandidateUrl(),
        current.selectedCandidateSource(),
        current.selectedCandidatePageUrl(),
        current.selectedCandidateLicense(),
        current.selectedCandidateConfidence(),
        current.previousImageUrl(),
        current.lastUpdatedBy(),
        current.lastUpdatedAt(),
        current.lastUpdateSource());

    stateCache.put(dest.getId(), skipped);
    persistImageMetaToDestination(dest, skipped, null);
    destinationRepository.save(dest);
    return skipped;
  }

  @Transactional(readOnly = true)
  public List<ImageUpdateHistoryDto> getUpdateHistory(int limit) {
    List<Destination> allDestinations = loadAllDestinations();
    List<ImageUpdateHistoryDto> historyList = new ArrayList<>();

    for (Destination dest : allDestinations) {
      Map<String, Object> meta = extractImageMetaFromOpeningHours(dest.getOpeningHours());
      if (meta == null)
        continue;
      Object histObj = meta.get("history");
      if (histObj instanceof List<?> rawList) {
        String provName = dest.getProvince() != null ? dest.getProvince().getName() : "";
        for (Object entryObj : rawList) {
          if (entryObj instanceof Map<?, ?> m) {
            String id = Objects.toString(m.get("id"), UUID.randomUUID().toString());
            String action = Objects.toString(m.get("action"), "UPDATE");
            String prevUrl = m.get("previousImageUrl") != null ? m.get("previousImageUrl").toString() : null;
            String newUrl = m.get("newImageUrl") != null ? m.get("newImageUrl").toString() : null;
            String source = Objects.toString(m.get("sourceName"), "Wikimedia Commons");
            Integer conf = 85;
            if (m.get("confidence") instanceof Number n) {
              conf = n.intValue();
            }
            String by = Objects.toString(m.get("performedBy"), "Admin VISTA");
            Instant at = Instant.now();
            try {
              if (m.get("performedAt") != null) {
                at = Instant.parse(m.get("performedAt").toString());
              }
            } catch (Exception ignored) {
            }
            historyList.add(
                new ImageUpdateHistoryDto(
                    id,
                    dest.getId(),
                    dest.getName(),
                    provName,
                    action,
                    prevUrl,
                    newUrl,
                    source,
                    conf,
                    by,
                    at));
          }
        }
      }
    }

    historyList.sort(Comparator.comparing(ImageUpdateHistoryDto::performedAt).reversed());
    int max = Math.min(Math.max(1, limit), 200);
    return historyList.size() > max ? historyList.subList(0, max) : historyList;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL: AUDIT & EVALUATION ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  private Map<String, Integer> computeUrlUsageCounts(List<Destination> destinations) {
    Map<String, Integer> counts = new HashMap<>();
    for (Destination d : destinations) {
      String url = extractPrimaryImageUrl(d);
      if (url != null && !url.isBlank()) {
        counts.merge(normalizeUrlKey(url), 1, Integer::sum);
      }
    }
    return counts;
  }

  private String extractPrimaryImageUrl(Destination dest) {
    if (dest.getImages() == null || dest.getImages().isEmpty()) {
      return null;
    }
    return dest.getImages().stream()
        .sorted(Comparator.comparingInt(img -> img.getSortOrder() != null ? img.getSortOrder() : 0))
        .map(DestinationImage::getStoragePath)
        .filter(p -> p != null && !p.isBlank())
        .findFirst()
        .orElse(null);
  }

  private String normalizeUrlKey(String url) {
    if (url == null)
      return "";
    String trimmed = url.trim();
    int qIdx = trimmed.indexOf('?');
    if (qIdx > 0 && trimmed.contains("unsplash.com")) {
      return trimmed.substring(0, qIdx);
    }
    return trimmed;
  }

  private DestinationImageAuditItemDto buildAuditItem(
      Destination dest, Map<String, Integer> urlCounts, boolean verifyHttpReachability) {
    String currentUrl = extractPrimaryImageUrl(dest);
    int dupCount = currentUrl != null && !currentUrl.isBlank()
        ? urlCounts.getOrDefault(normalizeUrlKey(currentUrl), 1)
        : 0;

    DestinationImageAuditItemDto cached = stateCache.get(dest.getId());
    Map<String, Object> persistedMeta = extractImageMetaFromOpeningHours(dest.getOpeningHours());

    String provinceName = dest.getProvince() != null ? dest.getProvince().getName() : "";
    String categoryName = dest.getCategory() != null ? dest.getCategory().getName() : "";
    Double lat = dest.getLatitude() != null ? dest.getLatitude().doubleValue() : null;
    Double lon = dest.getLongitude() != null ? dest.getLongitude().doubleValue() : null;

    // Restore persisted metadata if available
    String previousImageUrl = cached != null ? cached.previousImageUrl() : null;
    String lastUpdatedBy = cached != null ? cached.lastUpdatedBy() : null;
    Instant lastUpdatedAt = cached != null ? cached.lastUpdatedAt() : null;
    String lastUpdateSource = cached != null ? cached.lastUpdateSource() : null;
    List<ImageCandidateDto> candidates = cached != null && cached.candidates() != null ? cached.candidates()
        : List.of();
    String selectedUrl = cached != null ? cached.selectedCandidateUrl() : null;
    String selectedSource = cached != null ? cached.selectedCandidateSource() : null;
    String selectedPageUrl = cached != null ? cached.selectedCandidatePageUrl() : null;
    String selectedLicense = cached != null ? cached.selectedCandidateLicense() : null;
    Integer selectedConf = cached != null ? cached.selectedCandidateConfidence() : null;
    String persistedStatus = cached != null ? cached.auditStatus() : null;

    if (persistedMeta != null) {
      if (previousImageUrl == null && persistedMeta.get("previousImageUrl") != null) {
        previousImageUrl = persistedMeta.get("previousImageUrl").toString();
      }
      if (lastUpdatedBy == null && persistedMeta.get("lastUpdatedBy") != null) {
        lastUpdatedBy = persistedMeta.get("lastUpdatedBy").toString();
      }
      if (lastUpdateSource == null && persistedMeta.get("lastUpdateSource") != null) {
        lastUpdateSource = persistedMeta.get("lastUpdateSource").toString();
      }
      if (lastUpdatedAt == null && persistedMeta.get("lastUpdatedAt") != null) {
        try {
          lastUpdatedAt = Instant.parse(persistedMeta.get("lastUpdatedAt").toString());
        } catch (Exception ignored) {
        }
      }
      if (persistedStatus == null && persistedMeta.get("auditStatus") != null) {
        persistedStatus = persistedMeta.get("auditStatus").toString();
      }
      if (selectedUrl == null && persistedMeta.get("selectedCandidateUrl") != null) {
        selectedUrl = persistedMeta.get("selectedCandidateUrl").toString();
      }
      if (selectedSource == null && persistedMeta.get("selectedCandidateSource") != null) {
        selectedSource = persistedMeta.get("selectedCandidateSource").toString();
      }
      if (selectedPageUrl == null && persistedMeta.get("selectedCandidatePageUrl") != null) {
        selectedPageUrl = persistedMeta.get("selectedCandidatePageUrl").toString();
      }
      if (selectedLicense == null && persistedMeta.get("selectedCandidateLicense") != null) {
        selectedLicense = persistedMeta.get("selectedCandidateLicense").toString();
      }
      if (selectedConf == null
          && persistedMeta.get("selectedCandidateConfidence") instanceof Number n) {
        selectedConf = n.intValue();
      }
      if (candidates.isEmpty() && persistedMeta.get("candidates") != null) {
        try {
          candidates = objectMapper.convertValue(
              persistedMeta.get("candidates"), new TypeReference<List<ImageCandidateDto>>() {
              });
        } catch (Exception ignored) {
        }
      }
    }

    // Evaluate current image status
    String evaluatedStatus;
    String issueReason;

    if (STATUS_UPDATED.equals(persistedStatus)
        && currentUrl != null
        && !currentUrl.isBlank()
        && isValidHttpOrLocalUrl(currentUrl)
        && !isKnownGenericStock(currentUrl)) {
      evaluatedStatus = STATUS_UPDATED;
      issueReason = "Đã cập nhật ảnh xác thực ("
          + (lastUpdateSource != null ? lastUpdateSource : "Wikimedia")
          + ")";
    } else if (STATUS_APPROVED_READY.equals(persistedStatus) && selectedUrl != null) {
      evaluatedStatus = STATUS_APPROVED_READY;
      issueReason = "Đã được Admin chọn duyệt, sẵn sàng cập nhật";
    } else if (STATUS_PENDING_APPROVAL.equals(persistedStatus) && !candidates.isEmpty()) {
      evaluatedStatus = STATUS_PENDING_APPROVAL;
      issueReason = "Đã tìm thấy " + candidates.size() + " ảnh đề xuất phù hợp, đang chờ Admin duyệt";
    } else if (STATUS_SKIPPED.equals(persistedStatus)) {
      evaluatedStatus = STATUS_SKIPPED;
      issueReason = "Admin đã đánh dấu bỏ qua kiểm tra";
    } else if (STATUS_NO_MATCH.equals(persistedStatus)) {
      evaluatedStatus = STATUS_NO_MATCH;
      issueReason = "Đã tìm kiếm nhưng chưa tìm thấy ảnh có độ tin cậy cao";
    } else if (currentUrl == null || currentUrl.isBlank()) {
      evaluatedStatus = STATUS_MISSING;
      issueReason = "Địa điểm chưa có URL ảnh đại diện trong cơ sở dữ liệu";
    } else if (!isValidHttpOrLocalUrl(currentUrl)) {
      evaluatedStatus = STATUS_BROKEN;
      issueReason = "Định dạng URL ảnh không hợp lệ hoặc bị hỏng";
    } else if (currentUrl.contains("thumb.wikimedia.org") && currentUrl.contains("utm_source=")) {
      evaluatedStatus = STATUS_BROKEN;
      issueReason = "URL ảnh tạm thời (thumb.wikimedia.org) bị chặn hoặc hết hạn truy cập";
    } else if (verifyHttpReachability && !checkUrlReachable(currentUrl)) {
      evaluatedStatus = STATUS_BROKEN;
      issueReason = "Không thể tải được ảnh (HTTP 404/403 hoặc máy chủ ảnh không phản hồi)";
    } else if (isKnownGenericStock(currentUrl)) {
      evaluatedStatus = STATUS_SUSPICIOUS;
      issueReason = dupCount > 1
          ? "Sử dụng ảnh mẫu Unsplash mặc định trùng lặp trên "
              + dupCount
              + " địa điểm khác nhau"
          : "Sử dụng ảnh mẫu Unsplash chung chung, không phải ảnh thực tế của địa điểm";
    } else if (dupCount > 1) {
      evaluatedStatus = STATUS_SUSPICIOUS;
      issueReason = "Ảnh bị trùng lặp bất thường: Đang dùng chung URL với "
          + (dupCount - 1)
          + " địa điểm khác";
    } else if (hasExplicitLocationMismatch(currentUrl, dest.getName(), provinceName)) {
      evaluatedStatus = STATUS_SUSPICIOUS;
      issueReason = "Tên file ảnh chứa tên tỉnh/địa danh khác không khớp với '"
          + dest.getName()
          + "' ("
          + provinceName
          + ")";
    } else {
      evaluatedStatus = STATUS_VALID;
      issueReason = "Ảnh đại diện hợp lệ, duy nhất và hoạt động tốt";
    }

    DestinationImageAuditItemDto dto = new DestinationImageAuditItemDto(
        dest.getId(),
        dest.getName(),
        provinceName,
        categoryName,
        dest.getDescription(),
        lat,
        lon,
        dest.getStatus(),
        currentUrl,
        dupCount,
        evaluatedStatus,
        issueReason,
        candidates,
        selectedUrl,
        selectedSource,
        selectedPageUrl,
        selectedLicense,
        selectedConf,
        previousImageUrl,
        lastUpdatedBy,
        lastUpdatedAt,
        lastUpdateSource);

    stateCache.put(dest.getId(), dto);
    return dto;
  }

  private boolean isValidHttpOrLocalUrl(String url) {
    if (url == null || url.isBlank())
      return false;
    String trimmed = url.trim();
    if (trimmed.startsWith("/images/") || trimmed.startsWith("/")) {
      return true;
    }
    try {
      URI uri = URI.create(trimmed);
      String scheme = uri.getScheme();
      return ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))
          && uri.getHost() != null;
    } catch (Exception e) {
      return false;
    }
  }

  private boolean isKnownGenericStock(String url) {
    if (url == null)
      return false;
    String lower = url.toLowerCase(Locale.ROOT);
    for (String pattern : KNOWN_GENERIC_STOCK_PATTERNS) {
      if (lower.contains(pattern)) {
        return true;
      }
    }
    return false;
  }

  private boolean hasExplicitLocationMismatch(String url, String destName, String provinceName) {
    if (url == null || !url.contains("wikimedia.org")) {
      return false;
    }
    try {
      String decoded = java.net.URLDecoder.decode(url, StandardCharsets.UTF_8);
      String fileNameNorm = DestinationService.stripAccents(decoded);
      String destNorm = DestinationService.stripAccents(destName);
      String provNorm = DestinationService.stripAccents(provinceName);

      // Check if any distinctive token of destName or provinceName appears in the
      // filename
      List<String> destTokens = extractDistinctiveTokens(destNorm);
      for (String token : destTokens) {
        if (fileNameNorm.contains(token)) {
          return false;
        }
      }
      if (!provNorm.isBlank() && fileNameNorm.contains(provNorm.replace(" ", ""))) {
        return false;
      }
      return false;
    } catch (Exception e) {
      return false;
    }
  }

  private boolean checkUrlReachable(String url) {
    if (url == null || url.isBlank())
      return false;
    if (url.startsWith("/"))
      return true;
    if (!url.startsWith("http://") && !url.startsWith("https://"))
      return false;

    Boolean cached = urlReachabilityCache.get(url);
    if (cached != null) {
      return cached;
    }

    boolean acquired = false;
    try {
      acquired = httpCheckSemaphore.tryAcquire(3, java.util.concurrent.TimeUnit.SECONDS);
      URI safeUri = URI.create(url.trim().replace("|", "%7C").replace(" ", "%20"));
      HttpRequest req = HttpRequest.newBuilder()
          .uri(safeUri)
          .timeout(Duration.ofSeconds(4))
          .header("User-Agent", USER_AGENT)
          .header("Accept", "image/*,*/*;q=0.8")
          .method("HEAD", HttpRequest.BodyPublishers.noBody())
          .build();
      HttpResponse<Void> res = httpClient.send(req, HttpResponse.BodyHandlers.discarding());
      int code = res.statusCode();
      String contentType = res.headers().firstValue("content-type").orElse("").toLowerCase(Locale.ROOT);
      if (code == 405 || code == 403 || contentType.isEmpty()) {
        // Retry with lightweight ranged GET
        HttpRequest getReq = HttpRequest.newBuilder()
            .uri(safeUri)
            .timeout(Duration.ofSeconds(4))
            .header("User-Agent", USER_AGENT)
            .header("Accept", "image/*,*/*;q=0.8")
            .header("Range", "bytes=0-1023")
            .GET()
            .build();
        HttpResponse<Void> getRes = httpClient.send(getReq, HttpResponse.BodyHandlers.discarding());
        code = getRes.statusCode();
        contentType = getRes.headers().firstValue("content-type").orElse("").toLowerCase(Locale.ROOT);
      }
      boolean validContentType = contentType.isEmpty()
          || contentType.startsWith("image/")
          || contentType.contains("octet-stream");
      boolean notHtmlOrJson = !contentType.contains("text/html") && !contentType.contains("application/json");
      if (code == 429 && url.contains("wikimedia.org")) {
        return true;
      }
      boolean ok = code >= 200 && code < 400 && validContentType && notHtmlOrJson;
      urlReachabilityCache.put(url, ok);
      return ok;
    } catch (Exception e) {
      urlReachabilityCache.put(url, false);
      return false;
    } finally {
      if (acquired) {
        httpCheckSemaphore.release();
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL: MULTI-SOURCE REAL IMAGE SEARCH & SCORING ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  private List<ImageCandidateDto> findBestCandidates(Destination dest, String customQuery) {
    String name = dest.getName() != null ? dest.getName().trim() : "";
    String province = dest.getProvince() != null && dest.getProvince().getName() != null
        ? dest.getProvince().getName().trim()
        : "";
    Double lat = dest.getLatitude() != null ? dest.getLatitude().doubleValue() : null;
    Double lon = dest.getLongitude() != null ? dest.getLongitude().doubleValue() : null;

    Map<String, ImageCandidateDto> candidateMap = new LinkedHashMap<>();

    // Clean landmark name variations (e.g. "Bán đảo Sơn Trà & Chùa Linh Ứng" ->
    // also search parts)
    Set<String> querySet = new LinkedHashSet<>();
    if (customQuery != null && !customQuery.isBlank()) {
      querySet.add(customQuery.trim());
    } else {
      // Search exact landmark name first (crucial when provinces were merged in 2025)
      String normalizedApos = name.replace('’', '\'').replace('‘', '\'');
      if (!name.isEmpty()) {
        querySet.add(name);
        if (!normalizedApos.equals(name)) {
          querySet.add(normalizedApos);
        }
      }
      if (!name.isEmpty() && !province.isEmpty()) {
        querySet.add(name + " " + province);
      }
      if (name.contains("(")) {
        String beforeParen = name.substring(0, name.indexOf('(')).trim();
        String insideParen = name.substring(
            name.indexOf('(') + 1,
            name.indexOf(')') > name.indexOf('(') ? name.indexOf(')') : name.length())
            .trim();
        if (!beforeParen.isEmpty()) {
          querySet.add(beforeParen);
          if (!province.isEmpty())
            querySet.add(beforeParen + " " + province);
        }
        if (!insideParen.isEmpty()) {
          querySet.add(insideParen);
        }
      }
      if (name.contains("&")
          || name.contains("–")
          || name.contains(" - ")
          || name.toLowerCase(Locale.ROOT).contains(" và ")
          || name.toLowerCase(Locale.ROOT).contains(" tại ")
          || name.toLowerCase(Locale.ROOT).contains(" trên ")) {
        for (String part : name.split("(?i)(\\s*&\\s*|\\s+và\\s+|\\s*[–-]\\s*|\\s+tại\\s+|\\s+trên\\s+)")) {
          String trimmedPart = part.trim();
          if (trimmedPart.length() >= 4) {
            querySet.add(trimmedPart);
            if (!province.isEmpty())
              querySet.add(trimmedPart + " " + province);
          }
        }
      }
      // Strip generic prefixes like "Bãi biển ", "Khu du lịch ", "Bán đảo ", "Danh
      // thắng ", "Cố đô
      // ", "Thánh địa "
      String strippedPrefix = normalizedApos
          .replaceFirst(
              "(?i)^(Bãi biển|Khu du lịch sinh thái|Khu du lịch|Khu di tích lịch sử|Khu di tích|Di tích lịch sử|Di tích|Danh thắng|Thắng cảnh|Quần thể danh thắng|Quần thể di tích|Quần thể|Làng văn hóa du lịch|Làng du lịch|Làng nghề|Làng cổ|Làng hoa|Làng đá|Bán đảo|Cố đô|Thánh địa|Khu bảo tồn thiên nhiên|Khu bảo tồn|Khu lưu niệm|Đài quan sát|Tòa nhà|Rừng ngập mặn|Rừng thông|Rừng tràm|Cánh đồng quạt gió|Cánh đồng điện gió|Đồi chè|Thung lũng|Quảng trường|Tượng đài|Nhà tưởng niệm|Đền thờ)\\s+",
              "")
          .trim();
      String normProvCheck = DestinationService.stripAccents(province);
      String normStrippedCheck = DestinationService.stripAccents(strippedPrefix);
      if (!strippedPrefix.isEmpty()
          && !strippedPrefix.equalsIgnoreCase(name)
          && strippedPrefix.length() >= 4
          && !normStrippedCheck.equals(normProvCheck)) {
        querySet.add(strippedPrefix);
        if (!province.isEmpty())
          querySet.add(strippedPrefix + " " + province);
      }
      querySet.addAll(buildEnglishLandmarkQueries(name));
    }
    List<String> searchQueries = new ArrayList<>(querySet);

    // 1. Query Vietnamese Wikipedia (Articles + Lead PageImages) - stop early once
    // high confidence
    // is found
    int viQueriesRun = 0;
    for (String q : searchQueries) {
      fetchWikipediaCandidates("vi", q, dest, candidateMap);
      viQueriesRun++;
      if (maxConfidence(candidateMap) >= 82 || candidateMap.size() >= 3 || viQueriesRun >= 4) {
        break;
      }
    }

    // 2. Query Wikimedia Commons Directly (Accented + Unaccented + English landmark
    // queries)
    Set<String> commonsQueries = new LinkedHashSet<>();
    if (!name.isEmpty()) {
      commonsQueries.add(name);
      commonsQueries.addAll(buildEnglishLandmarkQueries(name));
      String unaccentedName = DestinationService.stripAccents(name);
      if (!unaccentedName.isBlank()) {
        commonsQueries.add(unaccentedName);
      }
    }
    commonsQueries.addAll(searchQueries);

    int maxCommonsQueries = maxConfidence(candidateMap) >= 82 ? 1 : 4;
    int commonsQueriesRun = 0;
    for (String q : commonsQueries) {
      fetchWikimediaCommonsCandidates(q, dest, candidateMap);
      commonsQueriesRun++;
      if (maxConfidence(candidateMap) >= 82
          || candidateMap.size() >= 4
          || commonsQueriesRun >= maxCommonsQueries) {
        break;
      }
    }

    // 3. Query Wikipedia & Wikimedia Commons by GPS Coordinates (Geosearch) only if
    // needed
    if (lat != null && lon != null && maxConfidence(candidateMap) < 78) {
      fetchWikipediaGeoCandidates("vi", lat, lon, dest, candidateMap);
      if (maxConfidence(candidateMap) < 78) {
        fetchWikimediaCommonsGeoCandidates(lat, lon, dest, candidateMap);
      }
    }

    // 4. Query English Wikipedia by text only if still no strong match
    if (maxConfidence(candidateMap) < 72) {
      int enQueriesRun = 0;
      for (String q : commonsQueries) {
        fetchWikipediaCandidates("en", q + " Vietnam", dest, candidateMap);
        enQueriesRun++;
        if (maxConfidence(candidateMap) >= 75 || enQueriesRun >= 2)
          break;
      }
    }

    // 5. Optional: Google Custom Search API if configured via environment variables
    if (candidateMap.isEmpty()
        && !searchQueries.isEmpty()
        && googleCseApiKey != null
        && !googleCseApiKey.isBlank()
        && googleCseCx != null
        && !googleCseCx.isBlank()) {
      fetchGoogleCseCandidates(searchQueries.get(0), dest, candidateMap);
    }

    // Sort by confidence descending, filter >= 65, verify HTTP reachability & image
    // content-type,
    // and return top 3
    List<ImageCandidateDto> sorted = candidateMap.values().stream()
        .filter(c -> c.confidence() >= 65)
        .sorted(Comparator.comparingInt(ImageCandidateDto::confidence).reversed())
        .toList();

    List<ImageCandidateDto> verified = new ArrayList<>(3);
    for (ImageCandidateDto cand : sorted) {
      if (cand.imageUrl().contains("wikimedia.org/wikipedia/")
          || checkUrlReachable(cand.imageUrl())) {
        verified.add(cand);
        if (verified.size() >= 3)
          break;
      }
    }
    return verified;
  }

  private int maxConfidence(Map<String, ImageCandidateDto> candidateMap) {
    return candidateMap.values().stream().mapToInt(ImageCandidateDto::confidence).max().orElse(0);
  }

  private String normalizeWikimediaImageUrl(String rawUrl) {
    if (rawUrl == null || rawUrl.isBlank())
      return "";
    String clean = rawUrl.trim();
    clean = clean.replace("https://thumb.wikimedia.org/", "https://upload.wikimedia.org/");
    clean = clean.replace("http://thumb.wikimedia.org/", "https://upload.wikimedia.org/");
    if (clean.contains("wikimedia.org") && clean.contains("?utm_source=")) {
      clean = clean.substring(0, clean.indexOf("?utm_source="));
    }
    return clean;
  }

  private void fetchWikipediaCandidates(
      String lang, String query, Destination dest, Map<String, ImageCandidateDto> candidateMap) {
    try {
      String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
      String apiUrl = String.format(
          "https://%s.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=%s&gsrlimit=5&prop=pageimages|info|extracts|coordinates&inprop=url&piprop=original|thumbnail&pithumbsize=1000&exintro=1&explaintext=1&exchars=300&format=json",
          lang, encoded);

      JsonNode root = sendGetJson(apiUrl);
      if (root == null)
        return;
      JsonNode pages = root.path("query").path("pages");
      if (!pages.isObject())
        return;

      pages
          .fields()
          .forEachRemaining(
              entry -> {
                JsonNode page = entry.getValue();
                String pageTitle = page.path("title").asText("");
                String extract = page.path("extract").asText("");
                String fullUrl = page.path("fullurl")
                    .asText(
                        "https://"
                            + lang
                            + ".wikipedia.org/wiki/"
                            + URLEncoder.encode(pageTitle, StandardCharsets.UTF_8));

                String thumbUrl = page.path("thumbnail").path("source").asText("");
                String origUrl = page.path("original").path("source").asText("");
                String imageUrl = normalizeWikimediaImageUrl(
                    !origUrl.isBlank() && !isBannedMediaUrl(origUrl) ? origUrl : thumbUrl);

                if (imageUrl.isBlank() || isBannedMediaUrl(imageUrl)) {
                  return;
                }

                Double pageLat = null;
                Double pageLon = null;
                JsonNode coords = page.path("coordinates");
                if (coords.isArray() && !coords.isEmpty()) {
                  pageLat = coords.get(0).path("lat").asDouble();
                  pageLon = coords.get(0).path("lon").asDouble();
                }

                int width = page.path("thumbnail").path("width").asInt(800);
                int height = page.path("thumbnail").path("height").asInt(600);

                String sourceLabel = "vi".equals(lang) ? "Wikipedia Tiếng Việt" : "Wikipedia English";
                ScoredCandidate scored = scoreCandidate(
                    dest,
                    pageTitle,
                    extract,
                    imageUrl,
                    pageLat,
                    pageLon,
                    true,
                    width,
                    height,
                    sourceLabel);

                if (scored.confidence >= 55) {
                  String key = normalizeCandidateDedupKey(imageUrl);
                  ImageCandidateDto candidate = new ImageCandidateDto(
                      imageUrl,
                      imageUrl,
                      pageTitle,
                      sourceLabel,
                      fullUrl,
                      "CC BY-SA / Wikimedia",
                      scored.confidence,
                      scored.reason,
                      width,
                      height);
                  candidateMap.merge(
                      key,
                      candidate,
                      (oldVal, newVal) -> newVal.confidence() > oldVal.confidence() ? newVal : oldVal);
                }
              });
    } catch (Exception e) {
      log.debug("Wikipedia ({}) search error for '{}': {}", lang, query, e.getMessage());
    }
  }

  private void fetchWikipediaGeoCandidates(
      String lang,
      double lat,
      double lon,
      Destination dest,
      Map<String, ImageCandidateDto> candidateMap) {
    try {
      String apiUrl = String.format(
          Locale.US,
          "https://%s.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=%.6f|%.6f&ggsradius=2000&ggslimit=5&prop=pageimages|info|extracts|coordinates&inprop=url&piprop=original|thumbnail&pithumbsize=1000&exintro=1&explaintext=1&exchars=250&format=json",
          lang,
          lat,
          lon);

      JsonNode root = sendGetJson(apiUrl);
      if (root == null)
        return;
      JsonNode pages = root.path("query").path("pages");
      if (!pages.isObject())
        return;

      pages
          .fields()
          .forEachRemaining(
              entry -> {
                JsonNode page = entry.getValue();
                String pageTitle = page.path("title").asText("");
                String extract = page.path("extract").asText("");
                String fullUrl = page.path("fullurl").asText("");
                String thumbUrl = page.path("thumbnail").path("source").asText("");
                String origUrl = page.path("original").path("source").asText("");
                String imageUrl = normalizeWikimediaImageUrl(
                    !origUrl.isBlank() && !isBannedMediaUrl(origUrl) ? origUrl : thumbUrl);

                if (imageUrl.isBlank() || isBannedMediaUrl(imageUrl)) {
                  return;
                }

                Double pageLat = lat;
                Double pageLon = lon;
                JsonNode coords = page.path("coordinates");
                if (coords.isArray() && !coords.isEmpty()) {
                  pageLat = coords.get(0).path("lat").asDouble();
                  pageLon = coords.get(0).path("lon").asDouble();
                }

                int width = page.path("thumbnail").path("width").asInt(800);
                int height = page.path("thumbnail").path("height").asInt(600);
                String sourceLabel = "vi".equals(lang)
                    ? "Wikipedia Geosearch (GPS)"
                    : "Wikipedia EN Geosearch (GPS)";

                ScoredCandidate scored = scoreCandidate(
                    dest,
                    pageTitle,
                    extract,
                    imageUrl,
                    pageLat,
                    pageLon,
                    true,
                    width,
                    height,
                    sourceLabel);

                if (scored.confidence >= 55) {
                  String key = normalizeCandidateDedupKey(imageUrl);
                  ImageCandidateDto candidate = new ImageCandidateDto(
                      imageUrl,
                      imageUrl,
                      pageTitle,
                      sourceLabel,
                      fullUrl,
                      "CC BY-SA / Wikimedia",
                      scored.confidence,
                      scored.reason,
                      width,
                      height);
                  candidateMap.merge(
                      key,
                      candidate,
                      (oldVal, newVal) -> newVal.confidence() > oldVal.confidence() ? newVal : oldVal);
                }
              });
    } catch (Exception e) {
      log.debug("Wikipedia Geosearch error: {}", e.getMessage());
    }
  }

  private void fetchWikimediaCommonsCandidates(
      String query, Destination dest, Map<String, ImageCandidateDto> candidateMap) {
    try {
      String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
      String apiUrl = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch="
          + encoded
          + "&gsrlimit=6&prop=imageinfo|coordinates&iiprop=url|dimensions|mime|extmetadata&iiurlwidth=1024&format=json";

      JsonNode root = sendGetJson(apiUrl);
      if (root == null)
        return;
      JsonNode pages = root.path("query").path("pages");
      if (!pages.isObject())
        return;

      pages
          .fields()
          .forEachRemaining(
              entry -> {
                JsonNode page = entry.getValue();
                String rawTitle = page.path("title").asText("").replaceFirst("^File:", "");
                JsonNode imageInfoArr = page.path("imageinfo");
                if (!imageInfoArr.isArray() || imageInfoArr.isEmpty())
                  return;

                JsonNode ii = imageInfoArr.get(0);
                String mime = ii.path("mime").asText("");
                if (!mime.startsWith("image/jpeg")
                    && !mime.startsWith("image/png")
                    && !mime.startsWith("image/webp")) {
                  return;
                }

                int width = ii.path("width").asInt(0);
                int height = ii.path("height").asInt(0);
                if (width > 0 && (width < 320 || height < 200)) {
                  return;
                }

                String thumbUrl = ii.path("thumburl").asText("");
                String origUrl = ii.path("url").asText("");
                String imageUrl = normalizeWikimediaImageUrl(
                    !origUrl.isBlank() && !isBannedMediaUrl(origUrl) ? origUrl : thumbUrl);
                String descriptionUrl = ii.path("descriptionurl").asText("");

                if (imageUrl.isBlank()
                    || isBannedMediaUrl(imageUrl)
                    || isBannedMediaUrl(rawTitle)) {
                  return;
                }

                JsonNode ext = ii.path("extmetadata");
                String imgDesc = ext.path("ImageDescription")
                    .path("value")
                    .asText("")
                    .replaceAll("<[^>]+>", " ");
                String categories = ext.path("Categories").path("value").asText("");
                String license = ext.path("LicenseShortName").path("value").asText("Wikimedia Commons CC");

                Double fileLat = null;
                Double fileLon = null;
                JsonNode coords = page.path("coordinates");
                if (coords.isArray() && !coords.isEmpty()) {
                  fileLat = coords.get(0).path("lat").asDouble();
                  fileLon = coords.get(0).path("lon").asDouble();
                }

                ScoredCandidate scored = scoreCandidate(
                    dest,
                    rawTitle,
                    imgDesc + " " + categories,
                    imageUrl,
                    fileLat,
                    fileLon,
                    false,
                    width,
                    height,
                    "Wikimedia Commons");

                if (scored.confidence >= 55) {
                  String key = normalizeCandidateDedupKey(imageUrl);
                  ImageCandidateDto candidate = new ImageCandidateDto(
                      imageUrl,
                      imageUrl,
                      rawTitle.replaceAll("\\.[a-zA-Z0-9]+$", ""),
                      "Wikimedia Commons",
                      descriptionUrl,
                      license,
                      scored.confidence,
                      scored.reason,
                      width,
                      height);
                  candidateMap.merge(
                      key,
                      candidate,
                      (oldVal, newVal) -> newVal.confidence() > oldVal.confidence() ? newVal : oldVal);
                }
              });
    } catch (Exception e) {
      log.debug("Wikimedia Commons search error for '{}': {}", query, e.getMessage());
    }
  }

  private void fetchWikimediaCommonsGeoCandidates(
      double lat, double lon, Destination dest, Map<String, ImageCandidateDto> candidateMap) {
    try {
      String apiUrl = String.format(
          Locale.US,
          "https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggsnamespace=6&ggscoord=%.6f|%.6f&ggsradius=1200&ggslimit=6&prop=imageinfo|coordinates&iiprop=url|dimensions|mime|extmetadata&iiurlwidth=1024&format=json",
          lat,
          lon);

      JsonNode root = sendGetJson(apiUrl);
      if (root == null)
        return;
      JsonNode pages = root.path("query").path("pages");
      if (!pages.isObject())
        return;

      pages
          .fields()
          .forEachRemaining(
              entry -> {
                JsonNode page = entry.getValue();
                String rawTitle = page.path("title").asText("").replaceFirst("^File:", "");
                JsonNode imageInfoArr = page.path("imageinfo");
                if (!imageInfoArr.isArray() || imageInfoArr.isEmpty())
                  return;

                JsonNode ii = imageInfoArr.get(0);
                String mime = ii.path("mime").asText("");
                if (!mime.startsWith("image/jpeg")
                    && !mime.startsWith("image/png")
                    && !mime.startsWith("image/webp")) {
                  return;
                }

                String thumbUrl = ii.path("thumburl").asText("");
                String origUrl = ii.path("url").asText("");
                String imageUrl = normalizeWikimediaImageUrl(
                    !origUrl.isBlank() && !isBannedMediaUrl(origUrl) ? origUrl : thumbUrl);
                String descriptionUrl = ii.path("descriptionurl").asText("");
                if (imageUrl.isBlank()
                    || isBannedMediaUrl(imageUrl)
                    || isBannedMediaUrl(rawTitle)) {
                  return;
                }

                int width = ii.path("width").asInt(800);
                int height = ii.path("height").asInt(600);
                JsonNode ext = ii.path("extmetadata");
                String imgDesc = ext.path("ImageDescription")
                    .path("value")
                    .asText("")
                    .replaceAll("<[^>]+>", " ");
                String license = ext.path("LicenseShortName").path("value").asText("Wikimedia Commons CC");

                Double fileLat = lat;
                Double fileLon = lon;
                JsonNode coords = page.path("coordinates");
                if (coords.isArray() && !coords.isEmpty()) {
                  fileLat = coords.get(0).path("lat").asDouble();
                  fileLon = coords.get(0).path("lon").asDouble();
                }

                ScoredCandidate scored = scoreCandidate(
                    dest,
                    rawTitle,
                    imgDesc,
                    imageUrl,
                    fileLat,
                    fileLon,
                    false,
                    width,
                    height,
                    "Wikimedia Commons GPS");

                if (scored.confidence >= 55) {
                  String key = normalizeCandidateDedupKey(imageUrl);
                  ImageCandidateDto candidate = new ImageCandidateDto(
                      imageUrl,
                      imageUrl,
                      rawTitle.replaceAll("\\.[a-zA-Z0-9]+$", ""),
                      "Wikimedia Commons GPS",
                      descriptionUrl,
                      license,
                      scored.confidence,
                      scored.reason,
                      width,
                      height);
                  candidateMap.merge(
                      key,
                      candidate,
                      (oldVal, newVal) -> newVal.confidence() > oldVal.confidence() ? newVal : oldVal);
                }
              });
    } catch (Exception e) {
      log.debug("Wikimedia Commons Geosearch error: {}", e.getMessage());
    }
  }

  private void fetchOpenverseCandidates(
      String query, Destination dest, Map<String, ImageCandidateDto> candidateMap) {
    try {
      String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
      String apiUrl = "https://api.openverse.org/v1/images/?q=" + encoded + "&page_size=5&license_type=all";
      JsonNode root = sendGetJson(apiUrl);
      if (root == null)
        return;
      JsonNode results = root.path("results");
      if (!results.isArray())
        return;

      for (JsonNode item : results) {
        String rawUrl = item.path("url").asText("");
        String imageUrl = normalizeWikimediaImageUrl(rawUrl);
        String thumbUrl = normalizeWikimediaImageUrl(item.path("thumbnail").asText(imageUrl));
        String title = item.path("title").asText("");
        String foreignUrl = item.path("foreign_landing_url").asText("");
        String licenseCode = item.path("license").asText("cc").toUpperCase(Locale.ROOT);
        String source = item.path("source").asText("openverse");
        int width = item.path("width").asInt(800);
        int height = item.path("height").asInt(600);

        if (imageUrl.isBlank() || isBannedMediaUrl(imageUrl) || isBannedMediaUrl(title)) {
          continue;
        }
        if (width > 0 && (width < 320 || height < 200)) {
          continue;
        }

        String tagsText = "";
        JsonNode tags = item.path("tags");
        if (tags.isArray()) {
          StringBuilder sb = new StringBuilder();
          for (JsonNode t : tags) {
            sb.append(t.path("name").asText("")).append(" ");
          }
          tagsText = sb.toString();
        }

        String sourceLabel = "Openverse / " + source.toUpperCase(Locale.ROOT) + " CC";
        ScoredCandidate scored = scoreCandidate(
            dest, title, tagsText, imageUrl, null, null, false, width, height, sourceLabel);

        if (scored.confidence >= 65) {
          String key = normalizeCandidateDedupKey(imageUrl);
          ImageCandidateDto candidate = new ImageCandidateDto(
              imageUrl,
              !thumbUrl.isBlank() ? thumbUrl : imageUrl,
              title,
              sourceLabel,
              foreignUrl,
              "CC " + licenseCode,
              scored.confidence,
              scored.reason,
              width,
              height);
          candidateMap.merge(
              key,
              candidate,
              (oldVal, newVal) -> newVal.confidence() > oldVal.confidence() ? newVal : oldVal);
        }
      }
    } catch (Exception e) {
      log.debug("Openverse search error for '{}': {}", query, e.getMessage());
    }
  }

  private void fetchGoogleCseCandidates(
      String query, Destination dest, Map<String, ImageCandidateDto> candidateMap) {
    try {
      String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
      String apiUrl = String.format(
          "https://www.googleapis.com/customsearch/v1?key=%s&cx=%s&q=%s&searchType=image&num=3&safe=active",
          URLEncoder.encode(googleCseApiKey, StandardCharsets.UTF_8),
          URLEncoder.encode(googleCseCx, StandardCharsets.UTF_8),
          encoded);
      JsonNode root = sendGetJson(apiUrl);
      if (root == null)
        return;
      JsonNode items = root.path("items");
      if (!items.isArray())
        return;

      for (JsonNode item : items) {
        String link = item.path("link").asText("");
        String title = item.path("title").asText("");
        String snippet = item.path("snippet").asText("");
        String contextLink = item.path("image").path("contextLink").asText("");
        int width = item.path("image").path("width").asInt(800);
        int height = item.path("image").path("height").asInt(600);

        if (link.isBlank() || isBannedMediaUrl(link))
          continue;
        ScoredCandidate scored = scoreCandidate(
            dest,
            title,
            snippet,
            link,
            null,
            null,
            false,
            width,
            height,
            "Google Custom Search");
        if (scored.confidence >= 60) {
          String key = normalizeCandidateDedupKey(link);
          candidateMap.putIfAbsent(
              key,
              new ImageCandidateDto(
                  link,
                  link,
                  title,
                  "Google Custom Search",
                  contextLink,
                  "Web Source Verified",
                  scored.confidence,
                  scored.reason,
                  width,
                  height));
        }
      }
    } catch (Exception e) {
      log.debug("Google CSE search error: {}", e.getMessage());
    }
  }

  private List<String> buildEnglishLandmarkQueries(String destName) {
    if (destName == null || destName.isBlank())
      return List.of();
    String norm = DestinationService.stripAccents(destName)
        .replaceAll("[^a-z0-9\\s]", " ")
        .replaceAll("\\s+", " ")
        .trim();
    List<String> out = new ArrayList<>();
    if (norm.startsWith("bai bien ")) {
      String core = norm.substring("bai bien ".length()).trim();
      if (!core.isBlank()) {
        out.add(core + " beach");
        out.add("bai " + core + " beach");
      }
    } else if (norm.startsWith("bai ")) {
      String core = norm.substring("bai ".length()).trim();
      if (!core.isBlank()) {
        out.add(core + " beach");
        out.add("bai " + core + " beach");
      }
    } else if (norm.startsWith("bao tang ")) {
      String core = norm.substring("bao tang ".length()).trim();
      if (!core.isBlank()) {
        out.add(core + " museum");
        out.add("museum of " + core);
      }
    } else if (norm.startsWith("chua ")) {
      String core = norm.substring("chua ".length()).trim();
      if (!core.isBlank()) {
        out.add(core + " pagoda");
        out.add("chua " + core);
      }
    } else if (norm.startsWith("thien vien ")) {
      String core = norm.substring("thien vien ".length()).trim();
      if (!core.isBlank()) {
        out.add(core + " monastery");
        out.add(core + " pagoda");
      }
    } else if (norm.startsWith("nha tho chinh toa ") || norm.startsWith("nha tho lon ")) {
      String core = norm.replaceFirst("^(nha tho chinh toa|nha tho lon)\\s+", "").trim();
      if (!core.isBlank()) {
        out.add(core + " cathedral");
        out.add(core + " church");
      }
    } else if (norm.startsWith("nha tho ")) {
      String core = norm.substring("nha tho ".length()).trim();
      if (!core.isBlank()) {
        out.add(core + " church");
        out.add(core + " cathedral");
      }
    } else if (norm.startsWith("thac ")) {
      String core = norm.substring("thac ".length()).trim();
      if (!core.isBlank()) {
        out.add(core + " waterfall");
        out.add(core + " falls");
      }
    } else if (norm.startsWith("ho ")) {
      String core = norm.substring("ho ".length()).trim();
      if (!core.isBlank()) {
        out.add(core + " lake");
        out.add("ho " + core + " lake");
      }
    } else if (norm.startsWith("deo ")) {
      String core = norm.substring("deo ".length()).trim();
      if (!core.isBlank()) {
        out.add(core + " pass");
      }
    } else if (norm.startsWith("dao ") || norm.startsWith("hon ") || norm.startsWith("cu lao ")) {
      String core = norm.replaceFirst("^(dao|hon|cu lao)\\s+", "").trim();
      if (!core.isBlank()) {
        out.add(core + " island");
        out.add("hon " + core);
      }
    } else if (norm.startsWith("vinh ")) {
      String core = norm.substring("vinh ".length()).trim();
      if (!core.isBlank()) {
        out.add(core + " bay");
      }
    } else if (norm.startsWith("cho noi ")) {
      String core = norm.substring("cho noi ".length()).trim();
      if (!core.isBlank()) {
        out.add(core + " floating market");
        out.add(core + " market");
      }
    } else if (norm.startsWith("cho dem ")) {
      String core = norm.substring("cho dem ".length()).trim();
      if (!core.isBlank()) {
        out.add(core + " night market");
        out.add(core + " market");
      }
    } else if (norm.startsWith("cho ")) {
      String core = norm.substring("cho ".length()).trim();
      if (!core.isBlank()) {
        out.add(core + " market");
      }
    } else if (norm.startsWith("vuon quoc gia ")) {
      String core = norm.substring("vuon quoc gia ".length()).trim();
      if (!core.isBlank()) {
        out.add(core + " national park");
      }
    } else if (norm.startsWith("hang ") || norm.startsWith("dong ")) {
      String core = norm.replaceFirst("^(hang|dong)\\s+", "").trim();
      if (!core.isBlank()) {
        out.add(core + " cave");
        out.add(core + " grotto");
      }
    } else if (norm.startsWith("nui ") || norm.startsWith("dinh ")) {
      String core = norm.replaceFirst("^(nui|dinh)\\s+", "").trim();
      if (!core.isBlank()) {
        out.add(core + " mountain");
        out.add("mount " + core);
      }
    } else if (norm.startsWith("cau ")) {
      String core = norm.substring("cau ".length()).trim();
      if (!core.isBlank()) {
        out.add(core + " bridge");
      }
    } else if (norm.startsWith("den ") || norm.startsWith("mieu ")) {
      String core = norm.replaceFirst("^(den|mieu)\\s+", "").trim();
      if (!core.isBlank()) {
        out.add(core + " temple");
      }
    } else if (norm.startsWith("lang ") && destName.toLowerCase(Locale.ROOT).startsWith("lăng ")) {
      String core = norm.substring("lang ".length()).trim();
      if (!core.isBlank()) {
        out.add("tomb of " + core);
        out.add(core + " tomb");
        out.add(core + " mausoleum");
      }
    } else if (norm.startsWith("lang ") || norm.startsWith("ban ")) {
      String core = norm.replaceFirst("^(lang nghe|lang co|lang|ban)\\s+", "").trim();
      if (!core.isBlank()) {
        out.add(core + " village");
      }
    } else if (norm.startsWith("hai dang ")) {
      String core = norm.substring("hai dang ".length()).trim();
      if (!core.isBlank()) {
        out.add(core + " lighthouse");
      }
    } else if (norm.startsWith("cot co ")) {
      String core = norm.substring("cot co ".length()).trim();
      if (!core.isBlank()) {
        out.add(core + " flag tower");
      }
    } else if (norm.startsWith("thap ")) {
      String core = norm.substring("thap ".length()).trim();
      if (!core.isBlank()) {
        out.add(core + " tower");
        out.add(core + " towers");
      }
    } else if (norm.startsWith("thanh co ")
        || norm.startsWith("hoang thanh ")
        || norm.startsWith("kinh thanh ")) {
      String core = norm.replaceFirst("^(thanh co|hoang thanh|kinh thanh)\\s+", "").trim();
      if (!core.isBlank()) {
        out.add(core + " citadel");
        out.add("imperial city " + core);
      }
    }
    return out;
  }

  private record ScoredCandidate(int confidence, String reason) {
  }

  private ScoredCandidate scoreCandidate(
      Destination dest,
      String candidateTitle,
      String candidateDesc,
      String imageUrl,
      Double candLat,
      Double candLon,
      boolean isWikipediaLeadImage,
      int width,
      int height,
      String sourceName) {

    String destName = dest.getName() != null ? dest.getName() : "";
    String province = dest.getProvince() != null && dest.getProvince().getName() != null
        ? dest.getProvince().getName()
        : "";

    String normDestName = DestinationService.stripAccents(destName)
        .replaceAll("[^a-z0-9\\s]", " ")
        .replaceAll("\\s+", " ")
        .trim();
    String normProv = DestinationService.stripAccents(province)
        .replaceAll("[^a-z0-9\\s]", " ")
        .replaceAll("\\s+", " ")
        .trim();
    String normTitle = DestinationService.stripAccents(candidateTitle)
        .replaceAll("[^a-z0-9\\s]", " ")
        .replaceAll("\\s+", " ")
        .trim();
    String normDesc = DestinationService.stripAccents(candidateDesc)
        .replaceAll("[^a-z0-9\\s]", " ")
        .replaceAll("\\s+", " ")
        .trim();

    if (normDestName.isBlank() || normTitle.isBlank()) {
      return new ScoredCandidate(0, "Thiếu tiêu đề đối chiếu");
    }

    // 1. Reject generic province overview articles, list/category pages, archival
    // maps, or person
    // bios
    if (!normProv.isBlank()
        && (normTitle.equals(normProv)
            || normTitle.equals("tinh " + normProv)
            || normTitle.equals("thanh pho " + normProv)
            || normTitle.equals(normProv + " province")
            || normTitle.equals(normProv + " city"))) {
      return new ScoredCandidate(0, "Bỏ qua bài viết tổng quan cấp Tỉnh/Thành phố");
    }
    if (normTitle.startsWith("danh sach ")
        || normTitle.startsWith("list of ")
        || normTitle.startsWith("the loai ")
        || normTitle.startsWith("category ")
        || normTitle.startsWith("ban mau ")
        || normTitle.startsWith("template ")
        || normTitle.contains("trung tam hanh chinh")
        || normTitle.contains("uy ban nhan dan")
        || normTitle.contains(" vs ")
        || normTitle.contains("tiep phai doan")
        || normTitle.contains("ban tau cua bo")
        || normTitle.contains("dresse le")
        || normTitle.contains("btv1b")
        || normTitle.contains("1 5 000")
        || normTitle.contains("1 10 000")
        || normTitle.contains("herbarium")
        || normTitle.contains("holotype")
        || normTitle.contains("specimen")
        || imageUrl.toLowerCase(Locale.ROOT).contains("trung_t%c3%a2m_h%c3%a0nh_ch%c3%adnh")) {
      return new ScoredCandidate(0, "Bỏ qua trang danh sách, bản đồ cổ hoặc ảnh hành chính chung");
    }

    // 2. Separate full landmark phrases from stripped proper phrases
    List<String> fullPhrases = new ArrayList<>();
    fullPhrases.add(normDestName);
    fullPhrases.addAll(buildEnglishLandmarkQueries(destName));

    List<String> strippedProperPhrases = new ArrayList<>();
    List<String> destTokens = extractDistinctiveTokens(normDestName);
    List<String> properTokens = destTokens.stream().filter(t -> !GENERIC_LANDMARK_TYPE_WORDS.contains(t)).toList();

    // Never allow stripped proper phrase if it is identical to the province/city
    // name (e.g. "Bảo
    // tàng Hải Phòng" -> "hai phong")
    if (properTokens.size() >= 2) {
      String properPhrase = String.join(" ", properTokens);
      if (properPhrase.length() >= 5
          && !properPhrase.equals(normProv)
          && !normProv.equals("thanh pho " + properPhrase)) {
        strippedProperPhrases.add(properPhrase);
      } else {
        properTokens = destTokens;
      }
    } else {
      properTokens = destTokens;
    }

    String strippedPrefixRaw = destName
        .replace('’', '\'')
        .replace('‘', '\'')
        .replaceFirst(
            "(?i)^(Bãi biển|Khu du lịch sinh thái|Khu du lịch|Khu di tích lịch sử|Khu di tích|Di tích lịch sử|Di tích|Danh thắng|Thắng cảnh|Quần thể danh thắng|Quần thể di tích|Quần thể|Làng văn hóa du lịch|Làng du lịch|Làng nghề|Làng cổ|Làng hoa|Làng đá|Bán đảo|Cố đô|Thánh địa|Khu bảo tồn thiên nhiên|Khu bảo tồn|Khu lưu niệm|Đài quan sát|Tòa nhà|Rừng ngập mặn|Rừng thông|Rừng tràm|Cánh đồng quạt gió|Cánh đồng điện gió|Đồi chè|Thung lũng|Quảng trường|Tượng đài|Nhà tưởng niệm|Đền thờ)\\s+",
            "")
        .trim();
    String strippedPrefixNorm = DestinationService.stripAccents(strippedPrefixRaw)
        .replaceAll("[^a-z0-9\\s]", " ")
        .replaceAll("\\s+", " ")
        .trim();
    if (strippedPrefixNorm.length() >= 5
        && !strippedPrefixNorm.equals(normDestName)
        && !strippedPrefixNorm.equals(normProv)
        && !normProv.equals("thanh pho " + strippedPrefixNorm)) {
      strippedProperPhrases.add(strippedPrefixNorm);
    }

    // Handle compound names ("Bà Nà Hills và Cầu Vàng", "Bán đảo Sơn Trà & Chùa
    // Linh Ứng", "Văn
    // Miếu - Quốc Tử Giám")
    if (destName.contains("&")
        || destName.contains("–")
        || destName.contains(" - ")
        || destName.toLowerCase(Locale.ROOT).contains(" và ")
        || destName.toLowerCase(Locale.ROOT).contains(" tại ")
        || destName.toLowerCase(Locale.ROOT).contains(" trên ")) {
      for (String part : destName.split("(?i)(\\s*&\\s*|\\s+và\\s+|\\s*[–-]\\s*|\\s+tại\\s+|\\s+trên\\s+)")) {
        String normPart = DestinationService.stripAccents(part)
            .replaceAll("[^a-z0-9\\s]", " ")
            .replaceAll("\\s+", " ")
            .trim();
        if (normPart.length() >= 5 && !normPart.equals(normProv)) {
          fullPhrases.add(normPart);
          fullPhrases.addAll(buildEnglishLandmarkQueries(part));
          List<String> subProper = extractDistinctiveTokens(normPart).stream()
              .filter(t -> !GENERIC_LANDMARK_TYPE_WORDS.contains(t))
              .toList();
          if (subProper.size() >= 2) {
            String subProperPhrase = String.join(" ", subProper);
            if (subProperPhrase.length() >= 5 && !subProperPhrase.equals(normProv)) {
              strippedProperPhrases.add(subProperPhrase);
            }
          }
        }
      }
    }
    if (destName.contains("(")) {
      String beforeParen = DestinationService.stripAccents(destName.substring(0, destName.indexOf('(')))
          .replaceAll("[^a-z0-9\\s]", " ")
          .replaceAll("\\s+", " ")
          .trim();
      if (beforeParen.length() >= 5 && !beforeParen.equals(normProv)) {
        fullPhrases.add(beforeParen);
        fullPhrases.addAll(
            buildEnglishLandmarkQueries(destName.substring(0, destName.indexOf('('))));
      }
    }

    // 3. Whole-word and contiguous-phrase verification
    String paddedTitle = " " + normTitle + " ";
    String paddedDesc = " " + normDesc + " ";
    Set<String> titleWords = new LinkedHashSet<>(Arrays.asList(normTitle.split("\\s+")));

    boolean fullPhraseInTitle = false;
    boolean fullPhraseInDesc = false;
    for (String phrase : fullPhrases) {
      if (phrase == null || phrase.isBlank())
        continue;
      if (paddedTitle.contains(" " + phrase + " ")) {
        fullPhraseInTitle = true;
        break;
      }
      String compactPhrase = phrase.replace(" ", "");
      if (compactPhrase.length() >= 7 && normTitle.replace(" ", "").contains(compactPhrase)) {
        fullPhraseInTitle = true;
        break;
      }
      if (phrase.length() >= 6 && paddedDesc.contains(" " + phrase + " ")) {
        fullPhraseInDesc = true;
      }
    }

    boolean strippedPhraseInTitle = false;
    for (String phrase : strippedProperPhrases) {
      if (phrase == null || phrase.isBlank())
        continue;
      if (paddedTitle.contains(" " + phrase + " ")) {
        strippedPhraseInTitle = true;
        break;
      }
      String compactPhrase = phrase.replace(" ", "");
      if (compactPhrase.length() >= 7 && normTitle.replace(" ", "").contains(compactPhrase)) {
        strippedPhraseInTitle = true;
        break;
      }
    }

    int matchedDestInTitle = 0;
    for (String token : destTokens) {
      if (titleWords.contains(token)) {
        matchedDestInTitle++;
      }
    }
    boolean allDestTokensInTitle = destTokens.size() >= 2 && matchedDestInTitle == destTokens.size();

    int matchedProperInTitle = 0;
    for (String token : properTokens) {
      if (titleWords.contains(token)) {
        matchedProperInTitle++;
      }
    }
    boolean highMultiWordProperMatch = properTokens.size() >= 3 && matchedProperInTitle == properTokens.size();

    boolean provinceMatched = matchesProvinceOrAlias(paddedTitle, paddedDesc, normTitle, normProv);

    // Check if candidate has landmark/geography context when only stripped proper
    // phrase matched
    String combinedContext = paddedTitle + " " + paddedDesc;
    boolean hasLandmarkContext = isWikipediaLeadImage
        || provinceMatched
        || combinedContext.contains(" viet nam ")
        || combinedContext.contains(" vietnam ")
        || combinedContext.contains(" beach ")
        || combinedContext.contains(" pagoda ")
        || combinedContext.contains(" temple ")
        || combinedContext.contains(" museum ")
        || combinedContext.contains(" waterfall ")
        || combinedContext.contains(" lake ")
        || combinedContext.contains(" island ")
        || combinedContext.contains(" bay ")
        || combinedContext.contains(" cave ")
        || combinedContext.contains(" grotto ")
        || combinedContext.contains(" pass ")
        || combinedContext.contains(" mountain ")
        || combinedContext.contains(" market ")
        || combinedContext.contains(" church ")
        || combinedContext.contains(" cathedral ")
        || combinedContext.contains(" bridge ")
        || combinedContext.contains(" palace ")
        || combinedContext.contains(" citadel ")
        || combinedContext.contains(" park ")
        || combinedContext.contains(" village ");
    if (!hasLandmarkContext) {
      for (String token : destTokens) {
        if (GENERIC_LANDMARK_TYPE_WORDS.contains(token)
            && combinedContext.contains(" " + token + " ")) {
          hasLandmarkContext = true;
          break;
        }
      }
    }

    Double distanceKm = null;
    if (dest.getLatitude() != null
        && dest.getLongitude() != null
        && candLat != null
        && candLon != null) {
      distanceKm = haversineKm(
          dest.getLatitude().doubleValue(),
          dest.getLongitude().doubleValue(),
          candLat,
          candLon);
    }

    // Reject if GPS coordinates are known and far away (> 15 km)
    if (distanceKm != null && distanceKm > 15.0) {
      return new ScoredCandidate(
          0, "Tọa độ GPS của ảnh cách quá xa địa điểm (" + Math.round(distanceKm) + "km)");
    }

    boolean validStrippedMatch = (strippedPhraseInTitle || highMultiWordProperMatch)
        && (hasLandmarkContext || (distanceKm != null && distanceKm <= 5.0));

    // STRICT ACCEPTANCE GATE:
    if (!fullPhraseInTitle && !allDestTokensInTitle && !validStrippedMatch && !fullPhraseInDesc) {
      return new ScoredCandidate(20, "Không khớp chính xác cụm tên riêng và ngữ cảnh địa danh");
    }

    int score = 35;
    List<String> reasons = new ArrayList<>();

    if (fullPhraseInTitle || allDestTokensInTitle) {
      score += 46;
      reasons.add("Khớp chính xác tên địa danh '" + destName + "' trong tiêu đề");
    } else if (validStrippedMatch) {
      score += 38;
      reasons.add("Khớp cụm tên riêng và ngữ cảnh địa danh");
    } else if (fullPhraseInDesc) {
      score += 32;
      reasons.add("Khớp chính xác tên địa danh trong mô tả ảnh");
    }

    if (provinceMatched) {
      score += 12;
      reasons.add("Đúng tỉnh/thành " + province);
    }

    if (distanceKm != null) {
      if (distanceKm <= 0.5) {
        score += 15;
        reasons.add(
            String.format(Locale.US, "Tọa độ GPS khớp chính xác (cách %.0fm)", distanceKm * 1000));
      } else if (distanceKm <= 2.5) {
        score += 10;
        reasons.add(String.format(Locale.US, "Tọa độ GPS gần (cách %.1fkm)", distanceKm));
      }
    }

    if (isWikipediaLeadImage) {
      score += 6;
      reasons.add("Ảnh đại diện bách khoa toàn thư");
    }

    if (width >= 600 && height >= 400) {
      score += 4;
    }

    int finalScore = Math.max(0, Math.min(99, score));
    String reasonStr = reasons.isEmpty() ? "Nguồn: " + sourceName : String.join(" · ", reasons);

    return new ScoredCandidate(finalScore, reasonStr);
  }

  private boolean matchesProvinceOrAlias(
      String paddedTitle, String paddedDesc, String normTitle, String normProv) {
    if (normProv == null || normProv.isBlank())
      return false;
    List<String> aliases = new ArrayList<>();
    aliases.add(normProv);
    switch (normProv) {
      case "vinh long" -> aliases.addAll(List.of("tra vinh", "ben tre"));
      case "lam dong" ->
        aliases.addAll(List.of("binh thuan", "dak nong", "da lat", "phan thiet", "mui ne"));
      case "dak lak" -> aliases.addAll(List.of("phu yen", "tuy hoa", "buon ma thuot"));
      case "gia lai" -> aliases.addAll(List.of("binh dinh", "quy nhon", "kon tum", "pleiku"));
      case "can tho" -> aliases.addAll(List.of("soc trang", "hau giang"));
      case "ca mau" -> aliases.addAll(List.of("bac lieu"));
      case "hung yen" -> aliases.addAll(List.of("thai binh"));
      case "ninh binh" -> aliases.addAll(List.of("ha nam", "nam dinh"));
      case "quang tri" -> aliases.addAll(List.of("quang binh", "dong hoi", "phong nha"));
      case "an giang" -> aliases.addAll(List.of("kien giang", "phu quoc", "ha tien", "chau doc"));
      case "da nang" -> aliases.addAll(List.of("quang nam", "hoi an"));
      case "hai phong" -> aliases.addAll(List.of("hai duong", "cat ba", "do son"));
      case "phu tho" -> aliases.addAll(List.of("vinh phuc", "hoa binh", "tam dao"));
      case "bac ninh" -> aliases.addAll(List.of("bac giang"));
      case "lao cai" -> aliases.addAll(List.of("yen bai", "sa pa", "sapa", "mu cang chai"));
      case "thai nguyen" -> aliases.addAll(List.of("bac kan", "ba be"));
      case "tuyen quang" -> aliases.addAll(List.of("ha giang", "dong van", "meo vac"));
      case "quang ngai" -> aliases.addAll(List.of("kon tum", "ly son", "mang den"));
      case "khanh hoa" -> aliases.addAll(List.of("ninh thuan", "nha trang", "phan rang"));
      case "dong nai" -> aliases.addAll(List.of("binh phuoc"));
      case "tay ninh" -> aliases.addAll(List.of("long an"));
      case "dong thap" -> aliases.addAll(List.of("tien giang", "my tho", "sa dec"));
      case "ho chi minh", "tp ho chi minh", "thanh pho ho chi minh" ->
        aliases.addAll(
            List.of(
                "ho chi minh",
                "sai gon",
                "saigon",
                "ba ria vung tau",
                "vung tau",
                "binh duong",
                "con dao"));
      case "hue", "thua thien hue" -> aliases.addAll(List.of("hue", "thua thien hue"));
      default -> {
      }
    }
    String compactTitle = normTitle.replace(" ", "");
    for (String alias : aliases) {
      if (paddedTitle.contains(" " + alias + " ")
          || paddedDesc.contains(" " + alias + " ")
          || compactTitle.contains(alias.replace(" ", ""))) {
        return true;
      }
    }
    return false;
  }

  private List<String> extractDistinctiveTokens(String normalizedText) {
    if (normalizedText == null || normalizedText.isBlank()) {
      return List.of();
    }
    String cleaned = normalizedText.replaceAll("[^a-z0-9\\s]", " ");
    return Arrays.stream(cleaned.split("\\s+"))
        .filter(t -> t.length() >= 2 && !STOP_WORDS.contains(t))
        .distinct()
        .toList();
  }

  private boolean isBannedMediaUrl(String text) {
    if (text == null || text.isBlank())
      return true;
    String lower = text.toLowerCase(Locale.ROOT);
    if (lower.endsWith(".svg")
        || lower.endsWith(".svg.png")
        || lower.endsWith(".pdf")
        || lower.endsWith(".gif")
        || lower.endsWith(".tif")
        || lower.endsWith(".tiff")
        || lower.endsWith(".ogg")
        || lower.endsWith(".webm")) {
      return true;
    }
    for (String banned : BANNED_MEDIA_KEYWORDS) {
      if (lower.contains(banned.toLowerCase(Locale.ROOT))) {
        return true;
      }
    }
    return false;
  }

  private String normalizeCandidateDedupKey(String url) {
    if (url == null)
      return "";
    // Deduplicate different thumbnail sizes of the same Wikimedia image
    String cleaned = url.replaceAll("/\\d+px-", "/px-");
    return cleaned.toLowerCase(Locale.ROOT);
  }

  private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
    final double r = 6371.0;
    double dLat = Math.toRadians(lat2 - lat1);
    double dLon = Math.toRadians(lon2 - lon1);
    double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(Math.toRadians(lat1))
            * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2)
            * Math.sin(dLon / 2);
    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return r * c;
  }

  private JsonNode sendGetJson(String url) {
    boolean acquired = false;
    try {
      acquired = httpCheckSemaphore.tryAcquire(5, java.util.concurrent.TimeUnit.SECONDS);
      URI safeUri = URI.create(url.replace("|", "%7C"));
      HttpRequest req = HttpRequest.newBuilder()
          .uri(safeUri)
          .timeout(Duration.ofSeconds(6))
          .header("User-Agent", USER_AGENT)
          .header("Accept", "application/json")
          .GET()
          .build();
      HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (res.statusCode() >= 200 && res.statusCode() < 300) {
        return objectMapper.readTree(res.body());
      }
    } catch (Exception e) {
      log.debug("HTTP GET JSON failed for {}: {}", url, e.getMessage());
    } finally {
      if (acquired) {
        httpCheckSemaphore.release();
      }
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL: PERSISTENCE IN DESTINATIONS.OPENING_HOURS (_imageMeta)
  // ═══════════════════════════════════════════════════════════════════════════

  private Map<String, Object> extractImageMetaFromOpeningHours(String openingHoursJson) {
    if (openingHoursJson == null || openingHoursJson.isBlank()) {
      return null;
    }
    try {
      Map<String, Object> root = objectMapper.readValue(openingHoursJson, new TypeReference<Map<String, Object>>() {
      });
      Object metaObj = root.get("_imageMeta");
      if (metaObj instanceof Map<?, ?> m) {
        Map<String, Object> result = new LinkedHashMap<>();
        m.forEach((k, v) -> result.put(String.valueOf(k), v));
        return result;
      }
    } catch (Exception ignored) {
    }
    return null;
  }

  private void persistImageMetaToDestination(
      Destination dest, DestinationImageAuditItemDto item, Map<String, Object> newHistoryEntry) {
    try {
      Map<String, Object> root = new LinkedHashMap<>();
      if (dest.getOpeningHours() != null && !dest.getOpeningHours().isBlank()) {
        try {
          root.putAll(
              objectMapper.readValue(
                  dest.getOpeningHours(), new TypeReference<Map<String, Object>>() {
                  }));
        } catch (Exception ignored) {
        }
      }

      Map<String, Object> meta = new LinkedHashMap<>();
      Object existingMetaObj = root.get("_imageMeta");
      if (existingMetaObj instanceof Map<?, ?> m) {
        m.forEach((k, v) -> meta.put(String.valueOf(k), v));
      }

      meta.put("auditStatus", item.auditStatus());
      meta.put("issueReason", item.issueReason());
      meta.put("selectedCandidateUrl", item.selectedCandidateUrl());
      meta.put("selectedCandidateSource", item.selectedCandidateSource());
      meta.put("selectedCandidatePageUrl", item.selectedCandidatePageUrl());
      meta.put("selectedCandidateLicense", item.selectedCandidateLicense());
      meta.put("selectedCandidateConfidence", item.selectedCandidateConfidence());
      meta.put("previousImageUrl", item.previousImageUrl());
      meta.put("lastUpdatedBy", item.lastUpdatedBy());
      meta.put(
          "lastUpdatedAt", item.lastUpdatedAt() != null ? item.lastUpdatedAt().toString() : null);
      meta.put("lastUpdateSource", item.lastUpdateSource());
      meta.put("candidates", item.candidates());

      if (newHistoryEntry != null) {
        List<Object> history = new ArrayList<>();
        history.add(newHistoryEntry);
        Object oldHist = meta.get("history");
        if (oldHist instanceof List<?> list) {
          for (int i = 0; i < Math.min(list.size(), 9); i++) {
            history.add(list.get(i));
          }
        }
        meta.put("history", history);
      }

      root.put("_imageMeta", meta);
      dest.setOpeningHours(objectMapper.writeValueAsString(root));
    } catch (Exception e) {
      log.warn("Không thể lưu _imageMeta cho địa điểm {}: {}", dest.getId(), e.getMessage());
    }
  }
}
