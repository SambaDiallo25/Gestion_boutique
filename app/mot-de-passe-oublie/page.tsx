"use client";

import { useState } from "react";
import Link from "next/link";
import { Store } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function PageMotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function envoyer() {
    setErreur("");
    if (email.trim() === "") {
      setErreur("Entre ton adresse e-mail.");
      return;
    }

    setEnvoi(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nouveau-mot-de-passe`,
    });
    setEnvoi(false);

    if (error) {
      setErreur(
        /rate limit/i.test(error.message)
          ? "Trop de demandes. Réessaie dans quelques minutes."
          : error.message,
      );
      return;
    }
    setEnvoye(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 to-slate-100">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-emerald-600 text-white rounded-2xl w-14 h-14 flex items-center justify-center shadow-lg mb-3">
            <Store size={28} />
          </div>
          <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
        </div>

        <div className="card">
          {envoye ? (
            <>
              <p className="bg-emerald-50 text-emerald-800 text-sm rounded-lg p-3 mb-4">
                Si un compte existe avec ladresse {email.trim()}, un e-mail
                vient dêtre envoyé avec un lien pour choisir un nouveau mot de
                passe. Pense à regarder dans les courriers indésirables.
              </p>
              <Link
                href="/connexion"
                className="block text-center text-sm text-emerald-700 underline"
              >
                Retour à la connexion
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-3">
                Entre ladresse e-mail de ton compte : tu recevras un lien pour
                choisir un nouveau mot de passe.
              </p>
              <input
                className="border rounded-lg px-3 py-2 w-full mb-3"
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {erreur && (
                <p className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-3">
                  {erreur}
                </p>
              )}
              <button
                className="bg-emerald-600 text-white font-medium rounded-lg px-4 py-2 w-full"
                onClick={envoyer}
                disabled={envoi}
              >
                {envoi ? "Envoi..." : "Envoyer le lien"}
              </button>
              <Link
                href="/connexion"
                className="block text-center text-sm text-emerald-700 underline mt-4"
              >
                Retour à la connexion
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
