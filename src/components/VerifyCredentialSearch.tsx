"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function VerifyCredentialSearch() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    router.push(`/verify/${encodeURIComponent(clean)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-0 max-w-md mx-auto">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter Credential ID (e.g. AB3X7)"
        maxLength={10}
        className="flex-1 h-[34px] px-3 text-[10px] font-mono bg-cs-800 border border-cs-700 text-white placeholder:text-cs-600 focus:border-sb-default focus:outline-none uppercase tracking-widest"
      />
      <Button type="submit" variant="accent" className="h-[34px] !px-5">
        Verify →
      </Button>
    </form>
  );
}
