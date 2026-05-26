import { createAdminClient } from "@/lib/supabase/admin";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

type CredRow = {
  id: string;
  unique_code: string;
  startup_org_name: string;
  startup_email: string;
  industry: string;
  accredited_at: string;
  expires_at: string | null;
};

export default async function CredListPage() {
  const supabase = createAdminClient();

  const { data: accredited } = await supabase
    .from("accreditation_requests")
    .select("id,unique_code,startup_org_name,startup_email,industry,accredited_at,expires_at")
    .eq("status", "accredited")
    .order("accredited_at", { ascending: false });

  const columns: Column<CredRow>[] = [
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
      render: (v) => <span>{String(v ?? "—")}</span>,
    },
    {
      key: "unique_code",
      label: "Credential ID",
      render: (v) => (
        <a
          href={`/verify/${v}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[8px] text-sb-text font-semibold hover:underline"
        >
          {String(v)} ↗
        </a>
      ),
    },
    {
      key: "accredited_at",
      label: "Issued",
      render: (v) => (
        <span className="font-mono text-cs-500 text-[7px]">{formatDate(v as string)}</span>
      ),
    },
    {
      key: "expires_at",
      label: "Expires",
      render: (v) => {
        if (!v) return <span className="text-cs-400">—</span>;
        const expired = new Date(v as string) < new Date();
        return (
          <span className={expired ? "text-cs-red font-mono text-[7px]" : "font-mono text-cs-500 text-[7px]"}>
            {formatDate(v as string)}
          </span>
        );
      },
    },
    {
      key: "unique_code",
      label: "Status",
      render: (_, row) => {
        const expired = row.expires_at && new Date(row.expires_at) < new Date();
        return <Badge variant={expired ? "expired" : "accredited"} />;
      },
    },
  ];

  const total = accredited?.length ?? 0;

  return (
    <div className="max-w-[1280px] mx-auto px-7 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Credential List</h1>
        <p className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mt-1">
          All Issued StartupCred Credentials — {total} Total
        </p>
      </div>

      <DataTable
        columns={columns}
        data={(accredited ?? []) as CredRow[]}
        rowKey="id"
        title={`StartupCred Registry · ${total} Verified`}
        emptyMessage="No credentials issued yet."
      />
    </div>
  );
}
