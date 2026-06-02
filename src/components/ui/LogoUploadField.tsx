"use client";

import { useState, useRef } from "react";

interface LogoUploadFieldProps {
  currentLogoUrl?: string | null;
}

export function LogoUploadField({ currentLogoUrl }: LogoUploadFieldProps) {
  const [preview, setPreview] = useState<string | null>(currentLogoUrl ?? null);
  const [fileName, setFileName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <label className="cs-label">Logo</label>

      {/* Hidden real file input */}
      <input
        ref={inputRef}
        type="file"
        name="logo"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
        onChange={handleChange}
        className="hidden"
      />

      {/* Preview + trigger */}
      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Logo preview"
            className="h-16 w-auto max-w-[120px] object-contain border border-cs-200 bg-white p-1"
          />
        ) : (
          <div className="h-16 w-16 border border-dashed border-cs-300 bg-cs-50 flex items-center justify-center text-cs-400 text-[11px] font-mono">
            No logo
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn-outline btn-sm"
          >
            {preview ? "Change logo" : "Upload logo"}
          </button>
          {fileName && (
            <span className="text-[11px] text-cs-400 font-mono">{fileName}</span>
          )}
          <span className="text-[11px] text-cs-400">
            PNG, JPG, WebP or SVG · max 2 MB
          </span>
        </div>
      </div>
    </div>
  );
}
