import type { Metadata } from 'next';
import Script from 'next/script';
import { Navbar } from '@/components/common/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'VISTA — Nền tảng Du lịch Thông minh Việt Nam | Smart Travel Platform',
  description: 'Khám phá điểm đến Việt Nam, lập lịch trình AI thông minh, quản lý chuyến đi nhóm và thủ quỹ chi phí minh bạch.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,400;1,600;1,700&display=swap"
          rel="stylesheet"
        />
        <Script
          id="strip-extension-attrs"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                var clean = function(node) {
                  if (node && node.removeAttribute) {
                    node.removeAttribute('bis_skin_checked');
                    node.removeAttribute('bis_register');
                  }
                };
                var observer = new MutationObserver(function(mutations) {
                  for (var i = 0; i < mutations.length; i++) {
                    var m = mutations[i];
                    if (m.type === 'attributes' && m.attributeName && m.attributeName.indexOf('bis_') === 0) {
                      clean(m.target);
                    }
                  }
                });
                if (document.documentElement) {
                  observer.observe(document.documentElement, {
                    attributes: true,
                    subtree: true,
                    attributeFilter: ['bis_skin_checked', 'bis_register']
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
