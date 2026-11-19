import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { TripMembersScreen } from '@/features/trips/screens/TripMembersScreen';

export default function TripMembersRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return <TripMembersScreen tripId={id} />;
}

