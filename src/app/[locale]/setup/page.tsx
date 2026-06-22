import { createServiceClient } from "@/lib/supabase/service";
import { isValidLocale }        from "@/lib/i18n/types";
import { getDictionary }        from "@/lib/i18n/loader";
import { redirect }             from "next/navigation";
import Link                     from "next/link";
import { SetupForm }            from "./SetupForm";

interface SetupPageProps {
  params:       Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function SetupPage({ params, searchParams }: SetupPageProps) {
  const { locale }  = await params;
  const { token }   = await searchParams;

  if (!isValidLocale(locale)) redirect("/en");
  if (!token) redirect(`/${locale}/login`);

  const dict = await getDictionary(locale);
  const t    = dict.setup;

  const service = createServiceClient();
  const { data: tokenRow } = await service
    .from("account_setup_tokens")
    .select("email, role, used_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  // Token not found
  if (!tokenRow) {
    return <SetupError locale={locale} dict={dict} message={t.errorInvalid} />;
  }

  // Already used
  if (tokenRow.used_at) {
    return (
      <SetupError
        locale={locale}
        dict={dict}
        message={t.errorUsed}
        hint={t.errorUsedHint}
        loginLocale={locale}
      />
    );
  }

  // Expired
  if (new Date(tokenRow.expires_at) < new Date()) {
    return (
      <SetupError
        locale={locale}
        dict={dict}
        message={t.errorExpired}
        hint={t.errorExpiredHint}
      />
    );
  }

  return (
    <div className="min-h-screen bg-cs-50 flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">

        {/* Header */}
        <div className="mb-8">
          <Link href={`/${locale}`} className="text-sm font-bold tracking-tight text-black block mb-6">
            StartupBoss.org
          </Link>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-sb-default" />
            <span className="text-[14px] font-mono text-cs-400 uppercase tracking-widest">StartupBoss.org</span>
          </div>
          <div className="bg-black text-white px-4 py-2 mb-1 inline-block">
            <span className="text-[13px] font-mono uppercase tracking-widest">{t.activateAccount}</span>
          </div>
          <div className="h-0.5 bg-sb-default w-full" />
        </div>

        <p className="text-[14px] text-cs-500 mb-6">
          {t.welcome} <strong>{tokenRow.email}</strong>. {t.setPassword}
        </p>

        <SetupForm token={token} locale={locale} />

      </div>
    </div>
  );
}

// ─── Error state component ────────────────────────────────────────────────────

function SetupError({
  locale,
  dict,
  message,
  hint,
  loginLocale,
}: {
  locale:       string;
  dict:         { setup: { errorTitle: string; backHome: string }; nav: { login: string } };
  message:      string;
  hint?:        string;
  loginLocale?: string;
}) {
  return (
    <div className="min-h-screen bg-cs-50 flex items-center justify-center px-4">
      <div className="w-full max-w-[420px] text-center">
        <div className="w-8 h-8 bg-black mx-auto mb-6" />
        <h1 className="text-lg font-bold tracking-tight mb-2">{dict.setup.errorTitle}</h1>
        <p className="text-sm text-cs-500 mb-2">{message}</p>
        {hint && <p className="text-[14px] text-cs-400 mb-6">{hint}</p>}
        {loginLocale && (
          <Link
            href={`/${loginLocale}/login`}
            className="btn-primary btn-sm"
          >
            {dict.nav.login}
          </Link>
        )}
        {!loginLocale && (
          <Link
            href={`/${locale}`}
            className="text-[13px] font-mono text-cs-400 uppercase tracking-widest hover:text-black"
          >
            {dict.setup.backHome}
          </Link>
        )}
      </div>
    </div>
  );
}
