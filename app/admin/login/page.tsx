import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { APP_NAME, SLOGAN } from "@/lib/constants";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Connexion administrateur", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { error } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center bg-navy px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="card p-7">
          <div className="mb-5 flex justify-center">
            <Logo size={56} />
          </div>
          <p className="text-center text-xs font-bold tracking-[0.2em] text-ink-soft">{APP_NAME}</p>
          <h1 className="mt-1 text-center text-xl font-extrabold text-navy">Espace administrateur</h1>
          {error === "forbidden" && (
            <p className="mt-4 rounded-lg bg-epik-red-50 p-3 text-sm text-epik-red">Accès réservé aux administrateurs.</p>
          )}
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-sm font-semibold text-white/70">{SLOGAN}</p>
      </div>
    </main>
  );
}
