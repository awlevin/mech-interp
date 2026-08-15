"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useProgress } from "@/lib/progress";

const SYNC_LABEL: Record<string, { text: string; cls: string }> = {
  syncing: { text: "syncing…", cls: "text-warn" },
  synced: { text: "synced", cls: "text-good" },
  offline: { text: "offline — saved locally", cls: "text-warn" },
  error: { text: "sync error — will retry", cls: "text-critical" },
  local: { text: "", cls: "" },
};

export function AccountButton() {
  const { syncStatus } = useProgress();
  const label = SYNC_LABEL[syncStatus];
  return (
    <div className="px-2 py-1.5">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            className="w-full rounded-lg border border-borderline-strong px-3 py-2 text-left text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink"
          >
            Sign in to sync
            <span className="mt-0.5 block text-[11px] font-normal leading-4 text-ink-muted">
              Progress moves between phone &amp; desktop
            </span>
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <div className="flex items-center gap-2.5">
          <UserButton />
          <span className={`text-[12px] ${label.cls}`}>{label.text}</span>
        </div>
      </Show>
    </div>
  );
}
