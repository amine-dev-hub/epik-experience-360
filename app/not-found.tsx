import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SLOGAN } from "@/lib/constants";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="card max-w-md p-8 text-center">
        <div className="mb-4 flex justify-center">
          <Logo size={56} />
        </div>
        <p className="text-6xl font-extrabold text-navy">404</p>
        <h1 className="mt-2 text-xl font-bold text-ink">Page introuvable</h1>
        <p className="mt-2 text-ink-soft">
          Cette page n&apos;existe pas ou l&apos;événement n&apos;est plus disponible. Vérifiez le lien ou scannez à nouveau le QR code.
        </p>
        <Link href="/" className="btn-primary mt-6">
          Retour à l&apos;accueil
        </Link>
        <p className="mt-6 text-sm font-semibold text-epik-red">{SLOGAN}</p>
      </div>
    </main>
  );
}
