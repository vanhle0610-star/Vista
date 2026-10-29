'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';

const NO_NAVBAR_ROUTES = [
  '/login',
  '/forgot-password',
  '/dashboard',
  '/moderation',
  '/users',
  '/destinations',
];

export function GlobalNavbar() {
  const pathname = usePathname();

  // Hide on auth & admin dashboard pages
  const shouldHide = NO_NAVBAR_ROUTES.some((route) => pathname?.startsWith(route));

  if (shouldHide) {
    return null;
  }

  return <Navbar />;
}
