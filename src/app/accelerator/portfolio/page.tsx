import { createServiceClient } from "@/lib/supabase/service";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { AccreditationStatus } from "@/lib/supabase/types";

type PortfolioRow = {
  id: string;
  startup_org_name: string;
  startup_email: string;
  industry: string | null;
  country: string | null;
  unique_code: string | null;
  accredited_at: string | null;
  expires_at: string | null;
};

export default async function AcceleratorPortfolioPage() {
  const admin = createServiceClient();

  const { data: startups } = await admin
    .from("accreditation_requests")
    .select("id, startup_org_name, startup_email, industry, country, unique_code, accredited_at, expires_at")
    .eq("status", "accredited")
    .order("accredited_at", { ascending: false });

  const total = startups?.length ?? 0;

  const columns: Column<PortfolioRow>[] = [
    {
      key: "startup_org_name",
      label: "Startup",
      render: (_, row) => (
        <div>
          <div className="font-semibold text-[8px]">{row.startup_org_name}</div>
          <div className="text-cs-400 text-[7px] font-mono">{row.startup_email}</div>
        </div>
      ),
    },
    {
      key: "industry",
      label: "Industry",
      render: (v) => (
        <span className="text-[8px] font-mono">{String(v ?? "—")}</span>
      ),
    },
    {
      key: "country",
      label: "Country",
      render: (v) => (
        <span className="text-[8px] font-mono">{String(v ?? "—")}</span>
      ),
    },
    {
      key: "unique_code",
      label: "Credential",
      render: (v) =>
        v ? (
          <a
            href={`/verify/${v}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[8px] text-sb-text font-semibold hover:underline"
          >
            {String(v)} ↗
          </a>
        ) : (
          <span className="text-cs-400">—</span>
        ),
    },
    {
      key: "accredited_at",
      label: "Accredited",
      render: (v) => (
        <span className="font-mono text-cs-500 text-[7px]">
          {v ? formatDate(v as string) : "—"}
        </span>
      ),
    },
    {
      key: "expires_at",
      label: "Status",
      render: (v) => {
        const expired = v && new Date(v as string) < new Date();
        return (
          <Badge variant={expired ? "expired" : "accredited"} />
        );
      },
    },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-7 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Startup Portfolio</h1>
        <p className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mt-1">
          Accredited Startups — {total} Total
        </p>
      </div>

      <SectionDivider label={`Verified Startups · ${total}`} className="mb-3" />
      <DataTable
        columns={columns}
        data={(startups ?? []) as PortfolioRow[]}
        rowKey="id"
        title={`StartupCred Portfolio · ${total} Accredited`}
        emptyMessage="No accredited startups yet."
      />
    </div>
  );
}
