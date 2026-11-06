"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(6).max(200),
});

export interface LoginState {
  error?: string;
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  // Message volontairement générique : ne révèle pas si le compte existe.
  const generic = "Identifiants incorrects ou accès non autorisé.";
  if (!parsed.success) return { error: generic };

  const db = await createSessionClient();
  const { error } = await db.auth.signInWithPassword(parsed.data);
  if (error) return { error: generic };

  const { data: isAdmin } = await db.rpc("is_admin");
  if (isAdmin !== true) {
    await db.auth.signOut();
    return { error: generic };
  }
  redirect("/admin");
}

export async function signOut() {
  const db = await createSessionClient();
  await db.auth.signOut();
  redirect("/admin/login");
}
