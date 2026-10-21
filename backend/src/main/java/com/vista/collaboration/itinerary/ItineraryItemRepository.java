package com.vista.collaboration.itinerary;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ItineraryItemRepository extends JpaRepository<ItineraryItem, UUID> {

  List<ItineraryItem> findByDayIdOrderBySortOrderAsc(UUID dayId);
}
