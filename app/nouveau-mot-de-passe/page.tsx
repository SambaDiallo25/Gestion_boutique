"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function PageNouveauMotDePasse() {
  const router = useRouter();
  const [verifie, setVerifie] = useState(false);
  const [lienValide, setLienValide] = useState(false);
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [termine, setTermine] = useState(false);

  useEffect(() => {
    // Le lien de l'e-mail ouvre une session temporaire : on la détecte
    supabase.auth.getSession().then(({ data }) => {
      setLienValide(!!data.session);
      setVerifie(true);
    });

    const { data: abonnement } = supabase.auth.onAuthStateChange(
      (evenement, session) => {
        if (evenement === "PASSWORD_RECOVERY" || session) {
          setLienValide(true);
          setVerifie(true);
        }
      },
    );

    return () => abonnement.subscription.unsubscribe();
  }, []);

  async function enregistrer() {
    setErreur("");
    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne sont pas identiques.");
      return;
    }

    setEnvoi(true);
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setEnvoi(false);

    if (error) {
      setErreur(error.message);
      return;
    }
    setTermine(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 to-slate-100">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-emerald-600 text-white rounded-2xl w-14 h-14 flex items-center justify-center shadow-lg mb-3">
            <Store size={28} />
          </div>
          <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
        </div>

        <div className="card">
          {!verifie && (
            <p className="text-slate-500 text-sm">Vérification du lien...</p>
          )}

          {verifie && !lienValide && (
            <>
              <p className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">
                Ce lien est invalide ou a expiré. Demande un nouveau lien.
              </p>
              <Link
                href="/mot-de-passe-oublie"
                className="block text-center text-sm text-emerald-700 underline"
              >
                Demander un nouveau lien
              </Link>
            </>
          )}

          {verifie && lienValide && !termine && (
            <>
              <input
                className="border rounded-lg px-3 py-2 w-full mb-3"
                type="password"
                placeholder="Nouveau mot de passe (8 caractères minimum)"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />
              <input
                className="border rounded-lg px-3 py-2 w-full mb-3"
                type="password"
                placeholder="Confirme le mot de passe"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
              {erreur && (
                <p className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-3">
                  {erreur}
                </p>
              )}
              <button
                className="bg-emerald-600 text-white font-medium rounded-lg px-4 py-2 w-full"
                onClick={enregistrer}
                disabled={envoi}
              >
                {envoi ? "Enregistrement..." : "Enregistrer le mot de passe"}
              </button>
            </>
          )}

          {termine && (
            <>
              <p className="bg-emerald-50 text-emerald-800 text-sm rounded-lg p-3 mb-4">
                Ton mot de passe a été changé.
              </p>
              <button
                className="bg-emerald-600 text-white font-medium rounded-lg px-4 py-2 w-full"
                onClick={() => router.push("/")}
              >
                Aller à mon application
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
