import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      <div className="text-[8px] font-mono text-cs-600 uppercase tracking-widest mb-4">
        404 — Not Found
      </div>
      <div className="text-6xl font-bold tracking-tight mb-6">C R E D S Y S</div>
      <p className="text-cs-400 font-mono text-[9px] mb-8">
        This page does not exist.
      </p>
      <Link href="/">
        <Button variant="outline" className="border-cs-700 text-cs-300 bg-transparent">
          Return Home
        </Button>
      </Link>
    </div>
  );
}
