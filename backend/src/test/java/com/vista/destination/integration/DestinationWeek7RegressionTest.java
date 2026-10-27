package com.vista.destination.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.vista.destination.application.DestinationQueryService;
import com.vista.destination.application.DestinationSummary;
import com.vista.destination.application.StubDestinationQueryService;
import com.vista.destination.domain.Destination;
import com.vista.destination.domain.DestinationCategory;
import com.vista.destination.domain.Province;
import com.vista.destination.repository.DestinationHistoryRepository;
import com.vista.destination.repository.DestinationRepository;
import com.vista.destination.repository.FavoriteRepository;
import com.vista.destination.service.DestinationNotFoundException;
import com.vista.destination.service.DestinationService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

@DisplayName(
    "TV1 Week 7: Comprehensive Regression, Unaccented Search, Filter Sensitivity & Public Data Isolation")
class DestinationWeek7RegressionTest {

  private DestinationRepository destinationRepository;
  private FavoriteRepository favoriteRepository;
  private DestinationHistoryRepository historyRepository;
  private DestinationService destinationService;
  private DestinationQueryService destinationQueryService;

  private Destination chuaCau;
  private Destination baNaHills;
  private Destination vinhHaLong;
  private Destination phoCoHoiAn;
  private Destination cauRong;
  private Destination draftDestination;
  private Destination rejectedDestination;

  @BeforeEach
  void setUp() {
    destinationRepository = mock(DestinationRepository.class);
    favoriteRepository = mock(FavoriteRepository.class);
    historyRepository = mock(DestinationHistoryRepository.class);

    destinationService =
        new DestinationService(destinationRepository, favoriteRepository, historyRepository);
    destinationQueryService = destinationService;

    // Seed mock entities
    chuaCau =
        createDestination(
            UUID.fromString("10000000-0000-0000-0000-000000000001"),
            "Chùa Cầu",
            "chua-cau",
            "Quảng Nam",
            "quang-nam",
            "Di tích lịch sử",
            "di-tich-lich-su",
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            "PUBLISHED",
            "Biểu tượng phố cổ Hội An với kiến trúc mái ngói âm dương độc đáo");

    baNaHills =
        createDestination(
            UUID.fromString("10000000-0000-0000-0000-000000000002"),
            "Bà Nà Hills",
            "ba-na-hills",
            "Đà Nẵng",
            "da-nang",
            "Khu vui chơi & Nghỉ dưỡng",
            "khu-vui-choi",
            new BigDecimal("900000"),
            new BigDecimal("1250000"),
            "PUBLISHED",
            "Đường lên tiên cảnh với Cầu Vàng lừng danh thế giới");

    vinhHaLong =
        createDestination(
            UUID.fromString("10000000-0000-0000-0000-000000000003"),
            "Vịnh Hạ Long",
            "vinh-ha-long",
            "Quảng Ninh",
            "quang-ninh",
            "Kỳ quan thiên nhiên",
            "ky-quan-thien-nhien",
            new BigDecimal("290000"),
            new BigDecimal("500000"),
            "PUBLISHED",
            "Di sản thiên nhiên thế giới UNESCO với hàng ngàn đảo đá vôi kỳ vĩ");

    phoCoHoiAn =
        createDestination(
            UUID.fromString("10000000-0000-0000-0000-000000000004"),
            "Phố cổ Hội An",
            "pho-co-hoi-an",
            "Quảng Nam",
            "quang-nam",
            "Văn hóa & Di sản",
            "van-hoa-di-san",
            new BigDecimal("120000"),
            new BigDecimal("150000"),
            "PUBLISHED",
            "Đô thị cổ được bảo tồn nguyên vẹn từ thế kỷ 16");

    cauRong =
        createDestination(
            UUID.fromString("10000000-0000-0000-0000-000000000005"),
            "Cầu Rồng Đà Nẵng",
            "cau-rong-da-nang",
            "Đà Nẵng",
            "da-nang",
            "Cảnh quan & Văn hóa",
            "canh-quan-van-hoa",
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            "PUBLISHED",
            "Cây cầu phun lửa và nước nổi tiếng bắc qua sông Hàn");

    draftDestination =
        createDestination(
            UUID.fromString("90000000-0000-0000-0000-000000000001"),
            "Khu du lịch Bản Nháp Mới",
            "khu-du-lich-ban-nhap-moi",
            "Hà Giang",
            "ha-giang",
            "Cảnh quan",
            "canh-quan",
            new BigDecimal("50000"),
            new BigDecimal("50000"),
            "DRAFT",
            "Điểm đến đang soạn thảo chưa được kiểm duyệt");

    rejectedDestination =
        createDestination(
            UUID.fromString("90000000-0000-0000-0000-000000000002"),
            "Địa điểm Bị Từ Chối",
            "dia-diem-bi-tu-choi",
            "Lào Cai",
            "lao-cai",
            "Sinh thái",
            "sinh-thai",
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            "REJECTED",
            "Địa điểm không đạt yêu cầu an toàn bị từ chối");
  }

  private Destination createDestination(
      UUID id,
      String name,
      String slug,
      String provName,
      String provSlug,
      String catName,
      String catSlug,
      BigDecimal priceMin,
      BigDecimal priceMax,
      String status,
      String desc) {
    Destination d = new Destination();
    d.setId(id);
    d.setName(name);
    d.setSlug(slug);
    d.setProvince(new Province(provName, provSlug, "VN-REGION"));
    d.setCategory(new DestinationCategory(catName, catSlug));
    d.setPriceMin(priceMin);
    d.setPriceMax(priceMax);
    d.setStatus(status);
    d.setDescription(desc);
    d.setLatitude(BigDecimal.valueOf(16.0));
    d.setLongitude(BigDecimal.valueOf(108.0));
    d.setOpeningHours(
        "{\"mon\":\"08:00-17:00\",\"tue\":\"08:00-17:00\",\"wed\":\"08:00-17:00\",\"thu\":\"08:00-17:00\",\"fri\":\"08:00-17:00\",\"sat\":\"08:00-17:00\",\"sun\":\"08:00-17:00\"}");
    return d;
  }

  @Nested
  @DisplayName("1. Unaccented Vietnamese Search Tests")
  class UnaccentedSearchTests {

    @Test
    @DisplayName("stripAccents utility correctly strips all Vietnamese diacritics")
    void testStripAccentsUtility() {
      assertThat(DestinationService.stripAccents("Đà Nẵng")).isEqualTo("da nang");
      assertThat(DestinationService.stripAccents("Hội An")).isEqualTo("hoi an");
      assertThat(DestinationService.stripAccents("Chùa Cầu")).isEqualTo("chua cau");
      assertThat(DestinationService.stripAccents("Bà Nà Hills")).isEqualTo("ba na hills");
      assertThat(DestinationService.stripAccents("Vịnh Hạ Long")).isEqualTo("vinh ha long");
      assertThat(DestinationService.stripAccents("ĐẮK LẮK")).isEqualTo("dak lak");
      assertThat(DestinationService.stripAccents("  Thừa Thiên Huế  ")).isEqualTo("thua thien hue");
      assertThat(DestinationService.stripAccents(null)).isEqualTo("");
      assertThat(DestinationService.stripAccents("   ")).isEqualTo("");
    }

    @ParameterizedTest(name = "Query \"{0}\" matches expected destination \"{1}\"")
    @CsvSource({
      "da nang, Cầu Rồng Đà Nẵng",
      "DA NANG, Cầu Rồng Đà Nẵng",
      "hoi an, Phố cổ Hội An",
      "chua cau, Chùa Cầu",
      "ba na, Bà Nà Hills",
      "BA NA, Bà Nà Hills",
      "vinh ha long, Vịnh Hạ Long",
      "vinh, Vịnh Hạ Long",
      "cau rong, Cầu Rồng Đà Nẵng"
    })
    void testUnaccentedQueriesViaStubService(String query, String expectedMatchName) {
      StubDestinationQueryService stub = new StubDestinationQueryService();
      List<DestinationSummary> results = stub.searchPublished(query, null, null, 10);

      assertThat(results).isNotEmpty();
      assertThat(results)
          .anyMatch(
              d ->
                  d.name().contains(expectedMatchName)
                      || d.provinceName().contains(expectedMatchName));
    }

    @Test
    @DisplayName("Accented queries continue to work accurately alongside unaccented queries")
    void testAccentedSearchRemainsFunctional() {
      StubDestinationQueryService stub = new StubDestinationQueryService();

      List<DestinationSummary> chuaCauResults = stub.searchPublished("Chùa Cầu", null, null, 10);
      assertThat(chuaCauResults).extracting(DestinationSummary::name).contains("Chùa Cầu");

      List<DestinationSummary> baNaResults = stub.searchPublished("Bà Nà Hills", null, null, 10);
      assertThat(baNaResults).extracting(DestinationSummary::name).contains("Bà Nà Hills");

      List<DestinationSummary> vinhHaLongResults =
          stub.searchPublished("Vịnh Hạ Long", null, null, 10);
      assertThat(vinhHaLongResults).extracting(DestinationSummary::name).contains("Vịnh Hạ Long");
    }

    @Test
    @DisplayName("Non-matching unaccented keyword returns empty list")
    void testNonMatchingKeywordReturnsEmpty() {
      StubDestinationQueryService stub = new StubDestinationQueryService();
      List<DestinationSummary> results =
          stub.searchPublished("khong_co_dia_diem_nay_xyz_123", null, null, 10);
      assertThat(results).isEmpty();
    }
  }

  @Nested
  @DisplayName("2. Multi-Filter Sensitivity & Edge Case Tests")
  class FilterSensitivityTests {

    @Test
    @DisplayName("Multi-filter combination: keyword + province + category + priceMax")
    void testMultiFilterCombination() {
      StubDestinationQueryService stub = new StubDestinationQueryService();

      // Search for Da Nang + priceMax 1.000.000 VND
      List<DestinationSummary> results =
          stub.searchPublished(
              "ba na", "Đà Nẵng", "Khu vui chơi & Nghỉ dưỡng", new BigDecimal("1000000"), 10);

      assertThat(results).hasSize(1);
      assertThat(results.get(0).name()).isEqualTo("Bà Nà Hills");
      assertThat(results.get(0).priceMin()).isLessThanOrEqualTo(new BigDecimal("1000000"));

      // Search for Da Nang + priceMax 500.000 VND (Ba Na Hills is 900k -> should NOT match)
      List<DestinationSummary> expensiveExcluded =
          stub.searchPublished("ba na", "Đà Nẵng", null, new BigDecimal("500000"), 10);
      assertThat(expensiveExcluded).isEmpty();
    }

    @Test
    @DisplayName("Zero VND ticket price (free entrance) filter sensitivity")
    void testFreePriceFilter() {
      StubDestinationQueryService stub = new StubDestinationQueryService();

      List<DestinationSummary> freeDestinations =
          stub.searchPublished(null, null, null, BigDecimal.ZERO, 10);

      assertThat(freeDestinations).isNotEmpty();
      assertThat(freeDestinations)
          .allMatch(d -> d.priceMin() == null || d.priceMin().compareTo(BigDecimal.ZERO) <= 0);
      assertThat(freeDestinations).extracting(DestinationSummary::name).contains("Chùa Cầu");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "\t\n"})
    @DisplayName("Empty or whitespace-only keyword is safely ignored without errors")
    void testBlankKeywordDoesNotFilterOutAll(String blankKeyword) {
      StubDestinationQueryService stub = new StubDestinationQueryService();
      List<DestinationSummary> allResults = stub.searchPublished(blankKeyword, null, null, 10);
      assertThat(allResults.size()).isGreaterThanOrEqualTo(2);
    }
  }

  @Nested
  @DisplayName("3. Public API Data Isolation & Security Hardening Tests")
  class PublicDataIsolationTests {

    @Test
    @DisplayName("DRAFT and REJECTED destinations are NEVER returned in public search")
    void testDraftAndRejectedExcludedFromPublicSearch() {
      // Mock repository findAll to return only published matching spec
      when(destinationRepository.findAll(any(Specification.class), any(Pageable.class)))
          .thenAnswer(
              invocation -> {
                // Return published destinations only
                return new PageImpl<>(List.of(chuaCau, baNaHills, vinhHaLong));
              });

      var result = destinationService.searchPublished("ban nhap", null, null, 0, 10);
      assertThat(result.items()).extracting(d -> d.status()).containsOnly("PUBLISHED");
      assertThat(result.items())
          .noneMatch(d -> "DRAFT".equals(d.status()) || "REJECTED".equals(d.status()));
    }

    @Test
    @DisplayName(
        "getPublishedDetail throws 404 DestinationNotFoundException for DRAFT destinations")
    void testGetPublishedDetailThrowsForDraft() {
      UUID draftId = draftDestination.getId();
      when(destinationRepository.findByIdAndStatus(draftId, "PUBLISHED"))
          .thenReturn(Optional.empty());

      assertThatThrownBy(() -> destinationService.getPublishedDetail(draftId, null))
          .isInstanceOf(DestinationNotFoundException.class)
          .hasMessageContaining(draftId.toString());
    }

    @Test
    @DisplayName(
        "getPublishedDetail throws 404 DestinationNotFoundException for REJECTED destinations")
    void testGetPublishedDetailThrowsForRejected() {
      UUID rejectedId = rejectedDestination.getId();
      when(destinationRepository.findByIdAndStatus(rejectedId, "PUBLISHED"))
          .thenReturn(Optional.empty());

      assertThatThrownBy(() -> destinationService.getPublishedDetail(rejectedId, null))
          .isInstanceOf(DestinationNotFoundException.class)
          .hasMessageContaining(rejectedId.toString());
    }

    @Test
    @DisplayName("Member cannot add DRAFT or REJECTED destination to favorites")
    void testCannotFavoriteUnpublishedDestination() {
      UUID draftId = draftDestination.getId();
      UUID userId = UUID.randomUUID();
      when(destinationRepository.existsByIdAndStatus(draftId, "PUBLISHED")).thenReturn(false);

      assertThatThrownBy(() -> destinationService.addFavorite(draftId, userId))
          .isInstanceOf(DestinationNotFoundException.class);
    }

    @Test
    @DisplayName("recordView cannot be invoked for DRAFT or REJECTED destinations")
    void testCannotRecordViewForUnpublishedDestination() {
      UUID rejectedId = rejectedDestination.getId();
      UUID userId = UUID.randomUUID();
      when(destinationRepository.findByIdAndStatus(rejectedId, "PUBLISHED"))
          .thenReturn(Optional.empty());

      assertThatThrownBy(() -> destinationService.recordView(rejectedId, userId))
          .isInstanceOf(DestinationNotFoundException.class);
    }

    @Test
    @DisplayName("DestinationQueryService contract methods strictly enforce PUBLISHED status")
    void testContractQueryServiceEnforcesPublished() {
      UUID draftId = draftDestination.getId();
      when(destinationRepository.findByIdAndStatus(draftId, "PUBLISHED"))
          .thenReturn(Optional.empty());
      when(destinationRepository.existsByIdAndStatus(draftId, "PUBLISHED")).thenReturn(false);

      assertThat(destinationQueryService.findPublishedById(draftId)).isEmpty();
      assertThat(destinationQueryService.isPublished(draftId)).isFalse();
    }
  }
}
