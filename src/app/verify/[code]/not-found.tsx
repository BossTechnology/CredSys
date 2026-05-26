import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function VerifyNotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <nav className="h-12 flex items-center px-7 border-b border-cs-800">
        <Link href="/" className="text-sm font-bold tracking-tight">
          StartupBoss.org
        </Link>
        <span className="text-[8px] font-mono text-cs-600 uppercase tracking-widest border-l border-cs-700 pl-4 ml-4">
          Public Credential Verification
        </span>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-7 text-center">
        <div className="max-w-[480px]">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="w-1 h-6 bg-cs-red inline-block" />
            <span className="text-[8px] font-mono text-cs-red uppercase tracking-widest">
              Not Verified
            </span>
          </div>

          <h1 className="text-3xl font-bold mb-3">⚠ Credential Not Found</h1>
          <p className="text-cs-400 text-[10px] font-mono mb-8">
            We could not find an active credential matching this ID. The credential may have been
            revoked, expired, or the ID may have been mistyped.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Link href="/">
              <Button variant="outline" className="border-cs-700 text-cs-300 hover:border-white hover:text-white bg-transparent">
                Verify Another
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="accent">Get Accredited</Button>
            </Link>
          </div>
        </div>
      </main>

      <div className="text-center py-3 text-[7px] font-mono text-cs-700 border-t border-cs-800">
        boss.technology · chass1s.com · startupboss.org
      </div>
    </div>
  );
}
