"use client";

import { useState }             from "react";
import { completeAccountSetup } from "@/app/actions/setup";

interface SetupFormProps {
  token: string;
}

export function SetupForm({ token }: SetupFormProps) {
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await completeAccountSetup(token, formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success: server action calls redirect() — no client-side handling needed
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="cs-label">Password *</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          className="cs-input"
        />
      </div>
      <div>
        <label className="cs-label">Confirm Password *</label>
        <input
          name="password_confirm"
          type="password"
          required
          minLength={8}
          placeholder="Repeat your password"
          autoComplete="new-password"
          className="cs-input"
        />
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 px-3 py-2 text-[8px] font-mono text-red-700">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary btn-lg w-full mt-2">
        {loading ? "Activating…" : "Activate Account"}
      </button>
    </form>
  );
}
