"use client";

import { BarChart3, CalendarDays, GitCompareArrows, LayoutDashboard, LogOut, Menu, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/admin/login/actions";
import { APP_NAME } from "@/lib/constants";

const LINKS = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/admin/events", label: "Événements", icon: CalendarDays },
  { href: "/admin/impact", label: "EPIK IMPACT AI", icon: BarChart3 },
  { href: "/admin/participants", label: "Participants", icon: Users },
  { href: "/admin/compare", label: "Comparaison", icon: GitCompareArrows },
];

export function AdminNav({ email }: { email: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(`${href}/`));

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between bg-navy px-4 py-3 text-white lg:hidden">
        <span className="text-sm font-extrabold tracking-wide">{APP_NAME}</span>
        <button type="button" onClick={() => setOpen(!open)} aria-label="Menu" className="rounded-lg p-2 hover:bg-white/10">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      <aside
        className={`${open ? "block" : "hidden"} bg-navy text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64 lg:shrink-0`}
      >
        <div className="flex h-full flex-col p-4">
          <div className="hidden px-2 pt-2 pb-6 lg:block">
            <p className="text-[11px] font-bold tracking-[0.2em] text-white/60">EPIK LEADERS</p>
            <p className="text-lg font-extrabold">{APP_NAME}</p>
          </div>
          <nav className="space-y-1">
            {LINKS.map(({ href, label, icon: Icon, exact }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  isActive(href, exact) ? "bg-white text-navy" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="size-4" /> {label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 border-t border-white/10 pt-4 lg:mt-auto">
            <p className="truncate px-3 text-xs text-white/60">{email}</p>
            <form action={signOut}>
              <button type="submit" className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10">
                <LogOut className="size-4" /> Déconnexion
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
