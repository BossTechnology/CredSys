import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { VerifyCredentialSearch } from "@/components/VerifyCredentialSearch";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Nav */}
      <nav className="h-12 flex items-center px-7 border-b border-cs-800">
        <span className="text-sm font-bold tracking-tight">StartupBoss.org</span>
        <div className="flex-1" />
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-[8px] font-mono text-cs-400 uppercase tracking-widest hover:text-white">
            Sign In
          </Link>
          <Link href="/signup">
            <Button variant="accent" size="sm">Get Accredited</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-7 text-center">
        <div className="max-w-[640px]">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-8">
            <span className="w-1 h-6 bg-sb-default inline-block" />
            <span className="text-[8px] font-mono text-sb-text uppercase tracking-widest">
              CHASS1S Accreditation System
            </span>
          </div>

          <h1 className="text-[56px] font-bold leading-none tracking-tight mb-6">
            C R E D{" "}
            <span className="text-sb-default">S Y S</span>
          </h1>

          <p className="text-lg text-cs-400 mb-4 font-light">
            GetCRED. Build Trust. Become Unstoppable.
          </p>

          <p className="text-[11px] font-mono text-cs-600 max-w-[480px] mx-auto mb-10">
            StartupCred is the verified accreditation standard for early-stage startups.
            Prove your legitimacy. Unlock opportunities. Access competitions.
          </p>

          <div className="flex items-center justify-center gap-4 mb-12">
            <Link href="/signup">
              <Button variant="accent" size="lg">Apply for Accreditation</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="border-cs-700 text-cs-300 hover:border-white hover:text-white bg-transparent">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Verify credential search */}
          <div className="pt-8 border-t border-cs-800 max-w-md mx-auto">
            <div className="text-[8px] font-mono text-cs-600 uppercase tracking-widest mb-3">
              ◇ Verify a StartupCred Credential
            </div>
            <VerifyCredentialSearch />
          </div>
        </div>
      </main>

      {/* Stats footer strip */}
      <div className="border-t border-cs-800 px-7 py-4 flex items-center justify-center gap-12">
        {[
          { value: "87+", label: "Startups Accredited" },
          { value: "14", label: "Active Evaluators" },
          { value: "12", label: "Competitions" },
          { value: "100%", label: "Verified" },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <div className="text-2xl font-bold text-sb-default">{item.value}</div>
            <div className="text-[7px] font-mono text-cs-600 uppercase tracking-widest">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center py-3 text-[7px] font-mono text-cs-700">
        boss.technology · chass1s.com · startupboss.org
      </div>
    </div>
  );
}
