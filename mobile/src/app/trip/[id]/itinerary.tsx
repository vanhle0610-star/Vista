import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ItineraryScreen } from '@/features/itinerary/screens/ItineraryScreen';

export default function TripItineraryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return <ItineraryScreen tripId={id} />;
}

