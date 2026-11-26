package com.vista.destination.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "destination_requests")
public class DestinationRequest {

  public static final String TYPE_CREATE = "CREATE";
  public static final String TYPE_UPDATE = "UPDATE";

  public static final String STATUS_PENDING = "PENDING";
  public static final String STATUS_APPROVED = "APPROVED";
  public static final String STATUS_REJECTED = "REJECTED";

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "request_type", nullable = false, length = 20)
  private String requestType;

  @Column(name = "target_destination_id")
  private UUID targetDestinationId;

  @Column(name = "submitted_by", nullable = false)
  private UUID submittedBy;

  @Column(length = 200)
  private String name;

  @Column(name = "province_name", length = 120)
  private String provinceName;

  @Column(name = "category_name", length = 120)
  private String categoryName;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(length = 300)
  private String address;

  @Column(precision = 9, scale = 6)
  private BigDecimal latitude;

  @Column(precision = 9, scale = 6)
  private BigDecimal longitude;

  @Column(name = "price_min", precision = 15, scale = 2)
  private BigDecimal priceMin;

  @Column(name = "price_max", precision = 15, scale = 2)
  private BigDecimal priceMax;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "opening_hours", columnDefinition = "jsonb")
  private String openingHours;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "image_urls", columnDefinition = "jsonb")
  private String imageUrls;

  @Column(name = "source_url", columnDefinition = "TEXT")
  private String sourceUrl;

  @Column(columnDefinition = "TEXT")
  private String note;

  @Column(nullable = false, length = 20)
  private String status = STATUS_PENDING;

  @Column(name = "rejection_reason", columnDefinition = "TEXT")
  private String rejectionReason;

  @Column(name = "reviewed_by")
  private UUID reviewedBy;

  @Column(name = "reviewed_at")
  private Instant reviewedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt = Instant.now();

  @Version
  @Column(nullable = false)
  private Long version = 0L;

  public DestinationRequest() {}

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public String getRequestType() {
    return requestType;
  }

  public void setRequestType(String requestType) {
    this.requestType = requestType;
  }

  public UUID getTargetDestinationId() {
    return targetDestinationId;
  }

  public void setTargetDestinationId(UUID targetDestinationId) {
    this.targetDestinationId = targetDestinationId;
  }

  public UUID getSubmittedBy() {
    return submittedBy;
  }

  public void setSubmittedBy(UUID submittedBy) {
    this.submittedBy = submittedBy;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getProvinceName() {
    return provinceName;
  }

  public void setProvinceName(String provinceName) {
    this.provinceName = provinceName;
  }

  public String getCategoryName() {
    return categoryName;
  }

  public void setCategoryName(String categoryName) {
    this.categoryName = categoryName;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getAddress() {
    return address;
  }

  public void setAddress(String address) {
    this.address = address;
  }

  public BigDecimal getLatitude() {
    return latitude;
  }

  public void setLatitude(BigDecimal latitude) {
    this.latitude = latitude;
  }

  public BigDecimal getLongitude() {
    return longitude;
  }

  public void setLongitude(BigDecimal longitude) {
    this.longitude = longitude;
  }

  public BigDecimal getPriceMin() {
    return priceMin;
  }

  public void setPriceMin(BigDecimal priceMin) {
    this.priceMin = priceMin;
  }

  public BigDecimal getPriceMax() {
    return priceMax;
  }

  public void setPriceMax(BigDecimal priceMax) {
    this.priceMax = priceMax;
  }

  public String getOpeningHours() {
    return openingHours;
  }

  public void setOpeningHours(String openingHours) {
    this.openingHours = openingHours;
  }

  public String getImageUrls() {
    return imageUrls;
  }

  public void setImageUrls(String imageUrls) {
    this.imageUrls = imageUrls;
  }

  public String getSourceUrl() {
    return sourceUrl;
  }

  public void setSourceUrl(String sourceUrl) {
    this.sourceUrl = sourceUrl;
  }

  public String getNote() {
    return note;
  }

  public void setNote(String note) {
    this.note = note;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getRejectionReason() {
    return rejectionReason;
  }

  public void setRejectionReason(String rejectionReason) {
    this.rejectionReason = rejectionReason;
  }

  public UUID getReviewedBy() {
    return reviewedBy;
  }

  public void setReviewedBy(UUID reviewedBy) {
    this.reviewedBy = reviewedBy;
  }

  public Instant getReviewedAt() {
    return reviewedAt;
  }

  public void setReviewedAt(Instant reviewedAt) {
    this.reviewedAt = reviewedAt;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }

  public Long getVersion() {
    return version;
  }

  public void setVersion(Long version) {
    this.version = version;
  }
}
