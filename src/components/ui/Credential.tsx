import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/utils";
import type { AccreditationRequest, CredPage } from "@/lib/supabase/types";
import { ACCREDITATION_STATUS_LABELS } from "@/lib/supabase/types";

// =============================================
// CredBadge — embeddable credential card
// =============================================

interface CredBadgeProps {
  startupName:  string;
  uniqueCode:   string;
  accreditedAt: string;
  domain?:      string;
  className?:   string;
}

export function CredBadge({
  startupName,
  uniqueCode,
  accreditedAt,
  domain = "startupboss.org",
  className,
}: CredBadgeProps) {
  const displayName = startupName.length > 28
    ? startupName.slice(0, 28) + "…"
    : startupName;

  return (
    <div
      className={cn(
        "bg-black text-white flex flex-col justify-between p-4 relative overflow-hidden",
        "w-[320px] h-[130px]",
        className
      )}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-sb-default" />

      <div className="pl-3">
        <div className="text-[13px] font-mono text-cs-400 uppercase tracking-widest mb-1">
          CredSys · StartupBoss.org
        </div>
        <span className="inline-flex items-center px-2 py-0.5 bg-sb-default text-sb-text text-[10px] font-mono font-semibold uppercase tracking-wider mb-2">
          ACCREDITED
        </span>
        <div className="text-lg font-bold leading-tight">{displayName}</div>
        <div className="text-[13px] font-mono text-cs-400 mt-1">
          {formatDateShort(accreditedAt)}
        </div>
      </div>

      <div className="pl-3 flex items-end justify-between">
        <div className="text-[14px] font-mono text-cs-500">
          ID: {uniqueCode} · {domain}
        </div>
        <div className="text-sb-default text-xl font-bold">✓</div>
      </div>
    </div>
  );
}

// =============================================
// ScoreDisplay — competition score widget
// =============================================

interface ScoreDisplayProps {
  score:          number;
  maxScore?:      number;
  rank?:          number;
  label?:         string;
  className?:     string;
}

export function ScoreDisplay({
  score,
  maxScore = 100,
  rank,
  label = "Score",
  className,
}: ScoreDisplayProps) {
  const pct = Math.min(100, Math.round((score / maxScore) * 100));

  return (
    <div className={cn("border border-cs-200 bg-white px-4 py-3", className)}>
      <div className="text-[14px] font-mono text-cs-500 uppercase tracking-widest mb-1">
        {label}
      </div>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-sb-text leading-none">
          {score}
        </span>
        <span className="text-cs-400 text-sm font-mono mb-0.5">/ {maxScore}</span>
        {rank != null && (
          <span className="text-[13px] font-mono text-cs-600 uppercase tracking-widest mb-0.5 ml-2">
            #{rank}
          </span>
        )}
      </div>
      {/* Progress bar */}
      <div className="mt-2 h-1 bg-cs-100 w-full">
        <div
          className="h-1 bg-sb-default transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// =============================================
// AccreditationDetailBlock — request summary
// =============================================

interface AccreditationDetailBlockProps {
  request:    AccreditationRequest;
  className?: string;
}

export function AccreditationDetailBlock({
  request,
  className,
}: AccreditationDetailBlockProps) {
  const statusLabel = ACCREDITATION_STATUS_LABELS[request.status];

  const fields: [string, string | number | undefined | null][] = [
    ["Startup",      request.startup_name],
    ["Email",        request.startup_email],
    ["Industry",     request.industry],
    ["Stage",        request.stage],
    ["Country",      request.country],
    ["Website",      request.website],
    ["Team Size",    request.team_size],
    ["Status",       statusLabel],
    ["Submitted",    formatDateShort(request.created_at)],
    ...(request.accredited_at
      ? [["Accredited", formatDateShort(request.accredited_at)] as [string, string]]
      : []),
    ...(request.expires_at
      ? [["Expires",    formatDateShort(request.expires_at)] as [string, string]]
      : []),
    ...(request.unique_code
      ? [["Credential ID", request.unique_code] as [string, string]]
      : []),
  ];

  return (
    <div className={cn("border border-cs-200 bg-white", className)}>
      <div className="bg-black text-white text-[13px] font-mono uppercase tracking-widest px-4 py-1">
        Accreditation Request
      </div>
      <div className="grid grid-cols-2 gap-px bg-cs-200">
        {fields.map(([label, value]) =>
          value != null ? (
            <div key={label} className="bg-white px-3 py-2">
              <div className="text-[14px] font-mono text-cs-400 uppercase tracking-widest">
                {label}
              </div>
              <div className="text-[13px] font-semibold mt-0.5 break-all">{value}</div>
            </div>
          ) : null
        )}
      </div>

      {/* Problem / Traction / Description */}
      {[
        { label: "Problem",     value: request.problem },
        { label: "Traction",    value: request.traction },
        { label: "Description", value: request.description },
        { label: "Notes",       value: request.additional_notes },
      ].map(
        ({ label, value }) =>
          value ? (
            <div key={label} className="border-t border-cs-200 px-4 py-3">
              <div className="text-[14px] font-mono text-cs-400 uppercase tracking-widest mb-1">
                {label}
              </div>
              <p className="text-[13px] text-cs-800 leading-relaxed">{value}</p>
            </div>
          ) : null
      )}
    </div>
  );
}

// =============================================
// CredPageCard — public CRED list card
// =============================================

interface CredPageCardProps {
  page:       CredPage;
  className?: string;
}

export function CredPageCard({ page, className }: CredPageCardProps) {
  const startup = page.startup;
  return (
    <div className={cn("border border-cs-200 bg-white px-4 py-3 flex items-center gap-4", className)}>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold truncate">
          {startup?.org_name ?? "—"}
        </div>
        <div className="text-[14px] font-mono text-cs-500 mt-0.5">
          {startup?.industry ?? ""}
          {startup?.country ? ` · ${startup.country}` : ""}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[14px] font-mono text-cs-400 uppercase tracking-widest">
          Credential ID
        </span>
        <span className="text-[13px] font-mono font-bold text-sb-text">
          {page.unique_code}
        </span>
        <span className="text-[14px] font-mono text-cs-400">
          {formatDateShort(page.accredited_at)}
        </span>
      </div>
    </div>
  );
}
