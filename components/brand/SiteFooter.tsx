import Link from "next/link";
import { APP_NAME, ORG_NAME, SLOGAN } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-semibold text-navy">{APP_NAME}</span> · {ORG_NAME} · {SLOGAN}
        </p>
        <nav className="flex gap-4">
          <Link href="/confidentialite" className="hover:text-navy">
            Confidentialité
          </Link>
          <Link href="/admin" className="hover:text-navy">
            Espace organisateur
          </Link>
        </nav>
      </div>
    </footer>
  );
}
