import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VISTA — Nền tảng Du lịch Thông minh Việt Nam | Smart Travel Platform',
  description: 'Khám phá điểm đến Việt Nam, lập lịch trình AI thông minh, quản lý chuyến đi nhóm và thủ quỹ chi phí minh bạch.',
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
