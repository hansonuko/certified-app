'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function VerifyLookupForm() {
  const router = useRouter();
  const [publicId, setPublicId] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = publicId.trim();
    if (!trimmed) return;
    router.push(`/verify/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      <input
        value={publicId}
        onChange={(e) => setPublicId(e.target.value)}
        placeholder="CERT-8F2K9-XQ41"
        className="rounded-control border border-certified-border px-4 py-3 text-center font-mono uppercase tracking-wide"
      />
      <button type="submit" className="rounded-control bg-certified-navy px-4 py-3 text-white">
        Verify
      </button>
    </form>
  );
}
