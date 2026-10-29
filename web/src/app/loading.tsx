'use client';

import React, { useState, useEffect } from 'react';
import {
  SkeletonPlannerPage,
  SkeletonTripsPage,
  SkeletonMapPage,
  SkeletonTreasuryPage,
  SkeletonUniversalPage,
} from '@/components/common/Skeleton';

export default function Loading() {
  const [target, setTarget] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const explicit = (window as any).__VISTA_TARGET_ROUTE__;
      const stored = window.sessionStorage.getItem('vista_target_route');
      const loc = window.location.pathname;
      return explicit || stored || loc || '';
    }
    return '';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkTarget = () => {
        const t =
          (window as any).__VISTA_TARGET_ROUTE__ ||
          window.sessionStorage.getItem('vista_target_route') ||
          window.location.pathname ||
          '';
        if (t) setTarget(t);
      };
      checkTarget();
      window.addEventListener('vista-nav-change', checkTarget);
      return () => {
        window.removeEventListener('vista-nav-change', checkTarget);
      };
    }
  }, []);

  if (target.startsWith('/planner')) {
    return <SkeletonPlannerPage />;
  }
  if (target.startsWith('/map')) {
    return <SkeletonMapPage />;
  }
  if (target.includes('/treasury')) {
    return <SkeletonTreasuryPage />;
  }
  if (target.startsWith('/trips')) {
    return <SkeletonTripsPage />;
  }

  return <SkeletonUniversalPage />;
}
