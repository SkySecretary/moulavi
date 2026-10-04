'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PublicApiDocsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/settings/api-docs');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-mono text-sm">
      Redirecting to Admin API Documentation...
    </div>
  );
}
