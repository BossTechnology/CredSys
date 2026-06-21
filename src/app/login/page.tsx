"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { signIn } from "@/app/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cs-50 flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm font-bold tracking-tight text-black block mb-6">
            StartupBoss.org
          </Link>
          <div className="bg-black text-white px-4 py-2 mb-1">
            <span className="text-[13px] font-mono uppercase tracking-widest">Sign In</span>
          </div>
          <div className="h-0.5 bg-sb-default" />
        </div>

        {/* Form */}
        <form action={handleSubmit} className="flex flex-col gap-4">
          <Input
            name="email"
            type="email"
            label="Email Address"
            placeholder="you@startup.com"
            required
            autoComplete="email"
          />
          <Input
            name="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          {error && (
            <div className="bg-cs-red-100 border border-cs-red px-3 py-2 text-[13px] font-mono text-cs-red">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} size="lg" className="mt-2 w-full">
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-[13px] font-mono text-cs-400">
            No account?{" "}
            <Link href="/signup" className="cs-link">
              Apply for Accreditation
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
