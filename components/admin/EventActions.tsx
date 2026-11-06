"use client";

import { Archive, Copy, Eye, EyeOff, Loader2, Lock, LockOpen, Pencil, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  deleteEvent,
  duplicateEvent,
  setEventActive,
  setEventStatus,
} from "@/app/admin/(protected)/events/actions";
import type { EventStatus } from "@/types/domain";

export function EventActions({
  id,
  slug,
  status,
  isActive,
  compact,
}: {
  id: string;
  slug: string;
  status: EventStatus;
  isActive: boolean;
  compact?: boolean;
}) {
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleteError, setDeleteError] = useState(false);
  const cls = "btn-ghost btn-sm";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pending && <Loader2 className="size-4 animate-spin text-navy" />}
      <Link href={`/admin/events/${id}/edit`} className={cls}>
        <Pencil className="size-3.5" /> Modifier
      </Link>
      {status !== "published" ? (
        <button className={cls} disabled={pending} onClick={() => start(() => setEventStatus(id, "published"))}>
          <Send className="size-3.5" /> Publier
        </button>
      ) : (
        <button className={cls} disabled={pending} onClick={() => start(() => setEventStatus(id, "draft"))}>
          <EyeOff className="size-3.5" /> Dépublier
        </button>
      )}
      {status === "published" && (
        <button className={cls} disabled={pending} onClick={() => start(() => setEventActive(id, !isActive))}>
          {isActive ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
          {isActive ? "Fermer le formulaire" : "Ouvrir le formulaire"}
        </button>
      )}
      {status !== "archived" ? (
        <button className={cls} disabled={pending} onClick={() => start(() => setEventStatus(id, "archived"))}>
          <Archive className="size-3.5" /> Archiver
        </button>
      ) : (
        <button className={cls} disabled={pending} onClick={() => start(() => setEventStatus(id, "draft"))}>
          <Eye className="size-3.5" /> Désarchiver
        </button>
      )}
      <button className={cls} disabled={pending} onClick={() => start(() => duplicateEvent(id))}>
        <Copy className="size-3.5" /> Dupliquer
      </button>
      {!compact && (
        <button className={`${cls} text-epik-red`} disabled={pending} onClick={() => setConfirmDelete(true)}>
          <Trash2 className="size-3.5" /> Supprimer
        </button>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true">
          <div className="card w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-epik-red">Supprimer définitivement ?</h3>
            <p className="mt-2 text-sm text-ink-soft">
              L&apos;événement, ses critères, <strong>toutes les réponses des participants</strong> et les analyses seront
              supprimés. Cette action est irréversible. Pour conserver les données, préférez « Archiver ».
            </p>
            <label className="mt-4 block text-sm">
              Tapez <code className="rounded bg-surface px-1.5 py-0.5 font-mono">{slug}</code> pour confirmer :
              <input className="input mt-2" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
            </label>
            {deleteError && <p className="field-error">Le texte saisi ne correspond pas.</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>
                Annuler
              </button>
              <button
                className="btn-accent"
                disabled={typed.trim() !== slug || pending}
                onClick={() =>
                  start(async () => {
                    const res = await deleteEvent(id, typed);
                    if (res && !res.ok) setDeleteError(true);
                  })
                }
              >
                <Trash2 className="size-4" /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
