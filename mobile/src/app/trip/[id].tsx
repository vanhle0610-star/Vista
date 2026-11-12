import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { TripDetailScreen } from '@/features/trips/screens/TripDetailScreen';

export default function TripDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return <TripDetailScreen tripId={id} />;
}
