'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/layout/Footer';

/**
 * Renders the public site chrome (Navbar + Footer) conditionally:
 * - /admin        → no chrome (admin sidebar handles it)
 * - /resume-builder → no chrome (full-viewport builder shell)
 * - everywhere else → Navbar + Footer
 */
export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin          = pathname.startsWith('/admin');
  const isResumeBuilder  = pathname.startsWith('/resume-builder');
  const hideChrome       = isAdmin || isResumeBuilder;

  return (
    <>
      {!hideChrome && <Navbar />}
      <main className={hideChrome ? undefined : 'flex-grow'}>{children}</main>
      {!hideChrome && <Footer />}
    </>
  );
}
