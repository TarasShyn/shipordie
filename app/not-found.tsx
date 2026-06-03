import { Metadata } from 'next';
import Link from 'next/link';
import { Button, HeadingL, TextL } from '@/components/ui';
import { getSEOTags } from '@/lib/seo';

export const metadata: Metadata = getSEOTags({
  title: 'Page Not Found — 404 Error',
  description: 'Page not found. It may have been moved or deleted.',
  canonicalUrlRelative: '/404',
  extraTags: {
    robots: { index: false, follow: false },
  },
});

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1a2530] px-4">
      <div className="mx-auto max-w-md text-center text-white">
        <div className="mb-6">
          <h1 className="mb-0 text-9xl leading-none font-bold text-amber-400">404</h1>
          <HeadingL className="mb-4">Lost at Sea</HeadingL>
          <TextL className="text-white/70">We couldn&apos;t find this page. It may have been moved, deleted, or swept overboard.</TextL>
        </div>
        <Button className="mx-auto">
          <Link href="/">Back to the ship</Link>
        </Button>
      </div>
    </main>
  );
}
