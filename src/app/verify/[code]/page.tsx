import { redirect } from "next/navigation";

/**
 * Legacy verification URL — redirect to the new canonical public credential page.
 * /verify/[code] → /startup/[code]
 */
export default async function LegacyVerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/startup/${code.toUpperCase()}`);
}
