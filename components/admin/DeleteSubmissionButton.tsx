"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteSubmission } from "@/app/admin/(protected)/submissions/actions";

/** Suppression d'une réponse (ex. demande de suppression d'un participant). */
export function DeleteSubmissionButton({ id, eventId }: { id: string; eventId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  if (!confirm) {
    return (
      <button className="btn-ghost btn-sm text-epik-red" onClick={() => setConfirm(true)}>
        <Trash2 className="size-3.5" /> Supprimer cette réponse
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2 text-sm">
      Supprimer définitivement ?
      <button className="btn-accent btn-sm" disabled={pending} onClick={() => start(() => deleteSubmission(id, eventId))}>Oui, supprimer</button>
      <button className="btn-ghost btn-sm" onClick={() => setConfirm(false)}>Annuler</button>
    </span>
  );
}
