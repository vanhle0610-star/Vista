import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VISTA Admin',
  description: 'Giao diện quản trị và kiểm duyệt VISTA',
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
