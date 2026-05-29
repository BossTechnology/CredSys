"use client";

import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-cs-50 flex flex-col items-center justify-center px-7">
      <div className="bg-cs-red-100 border border-cs-red px-6 py-5 max-w-[480px] w-full">
        <div className="text-[13px] font-mono text-cs-red uppercase tracking-widest mb-2">
          System Error
        </div>
        <p className="text-[13px] text-cs-700 font-mono mb-4">
          {error.message ?? "An unexpected error occurred."}
        </p>
        <Button variant="primary" size="sm" onClick={reset}>
          Try Again
        </Button>
      </div>
    </div>
  );
}
