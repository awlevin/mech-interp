"use client";

import { useOffline } from "next/offline";

export function OfflineBanner() {
  const isOffline = useOffline();
  if (!isOffline) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-borderline-strong bg-surface-2 px-4 py-2 text-[13px] text-ink-secondary shadow-lg lg:left-[calc(50%+9rem)]"
    >
      <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-warn align-middle" />
      Offline — the course keeps working; progress is saved on this device.
    </div>
  );
}
