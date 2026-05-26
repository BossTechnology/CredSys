"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { signUp } from "@/app/actions/auth";

const ROLE_OPTIONS = [
  { value: "startup", label: "Startup — Apply for Accreditation" },
  { value: "evaluator", label: "Evaluator Organization" },
  { value: "accelerator", label: "Accelerator / Program" },
];

const INDUSTRY_OPTIONS = [
  { value: "fintech", label: "Fintech" },
  { value: "edtech", label: "Edtech" },
  { value: "healthtech", label: "Healthtech" },
  { value: "agritech", label: "Agritech" },
  { value: "ecommerce", label: "E-Commerce" },
  { value: "saas", label: "SaaS / B2B" },
  { value: "cleantech", label: "Cleantech" },
  { value: "logistics", label: "Logistics" },
  { value: "other", label: "Other" },
];

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cs-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[480px]">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm font-bold tracking-tight text-black block mb-6">
            StartupBoss.org
          </Link>
          <div className="bg-black text-white px-4 py-2 mb-1">
            <span className="text-[8px] font-mono uppercase tracking-widest">Create Account</span>
          </div>
          <div className="h-0.5 bg-sb-default" />
        </div>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <Select
            name="role"
            label="Account Type"
            options={ROLE_OPTIONS}
            placeholder="Select account type..."
            required
          />
          <Input
            name="org_name"
            label="Organization Name"
            placeholder="Acme Startup Inc."
            required
          />
          <Input
            name="email"
            type="email"
            label="Email Address"
            placeholder="you@startup.com"
            required
            autoComplete="email"
          />
          <Select
            name="industry"
            label="Industry"
            options={INDUSTRY_OPTIONS}
            placeholder="Select industry..."
          />
          <Input
            name="website"
            type="url"
            label="Website (optional)"
            placeholder="https://yourstartup.com"
          />
          <Input
            name="password"
            type="password"
            label="Password"
            placeholder="Min. 8 characters"
            required
            autoComplete="new-password"
            minLength={8}
          />

          {error && (
            <div className="bg-cs-red-100 border border-cs-red px-3 py-2 text-[8px] font-mono text-cs-red">
              {error}
            </div>
          )}

          <div className="bg-sb-light border border-sb-default px-3 py-2 text-[8px] font-mono text-sb-text">
            Evaluator and Accelerator accounts require admin review before activation.
          </div>

          <Button type="submit" loading={loading} size="lg" className="mt-2 w-full">
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-[8px] font-mono text-cs-400">
            Already have an account?{" "}
            <Link href="/login" className="text-black underline">
              Sign In
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
