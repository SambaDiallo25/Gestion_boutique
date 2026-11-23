"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function PageConnexion() {
  const router = useRouter();
  const [mode, setMode] = useState<"connexion" | "inscription">("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nomBoutique, setNomBoutique] = useState("");
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [peutRenvoyer, setPeutRenvoyer] = useState(false);

  async function valider() {
    setErreur("");
    setInfo("");
    setPeutRenvoyer(false);

    if (email.trim() === "" || motDePasse === "") {
      setErreur("Entre ton e-mail et ton mot de passe.");
      return;
    }
    if (mode === "inscription") {
      if (nomBoutique.trim() === "") {
        setErreur("Entre le nom de ta boutique.");
        return;
      }
      if (motDePasse.length < 8) {
        setErreur("Le mot de passe doit faire au moins 8 caractères.");
        return;
      }
    }

    setEnvoi(true);

    if (mode === "connexion") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: motDePasse,
      });
      if (error) {
        if (/not confirmed/i.test(error.message)) {
          setErreur(
            "Ton adresse e-mail n'est pas encore confirmée. Clique sur le lien reçu par e-mail.",
          );
          setPeutRenvoyer(true);
        } else {
          setErreur("E-mail ou mot de passe incorrect.");
        }
        setEnvoi(false);
        return;
      }
      router.push("/");
      return;
    }

    // Inscription : la boutique est créée automatiquement par la base
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: motDePasse,
      options: {
        data: { nom_boutique: nomBoutique.trim() },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setErreur(
        /rate limit/i.test(error.message)
          ? "Trop de tentatives. Réessaie dans quelques minutes."
          : error.message,
      );
      setEnvoi(false);
      return;
    }

    // Avec la confirmation d'e-mail, une adresse déjà utilisée renvoie un compte « vide »
    if (
      data.user &&
      data.user.identities &&
      data.user.identities.length === 0
    ) {
      setErreur("Cette adresse e-mail est déjà utilisée. Connecte-toi plutôt.");
      setEnvoi(false);
      return;
    }

    if (data.session) {
      router.push("/");
      return;
    }

    setInfo(
      `Compte créé ! Un e-mail de confirmation a été envoyé à ${email.trim()}. ` +
        "Clique sur le lien qu'il contient, puis connecte-toi.",
    );
    setPeutRenvoyer(true);
    setMode("connexion");
    setMotDePasse("");
    setEnvoi(false);
  }

  async function renvoyer() {
    setErreur("");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setErreur(
        /rate limit/i.test(error.message)
          ? "Trop de demandes. Réessaie dans quelques minutes."
          : error.message,
      );
      return;
    }
    setInfo(
      `E-mail renvoyé à ${email.trim()}. Pense à regarder dans les courriers indésirables.`,
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 to-slate-100">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-emerald-600 text-white rounded-2xl w-14 h-14 flex items-center justify-center shadow-lg mb-3">
            <Store size={28} />
          </div>
          <h1 className="text-2xl font-bold">Gestion de boutique</h1>
          <p className="text-slate-500 text-sm text-center">
            Ventes, factures et caisse au même endroit
          </p>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold mb-4">
            {mode === "connexion" ? "Connexion" : "Créer ma boutique"}
          </h2>

          {mode === "inscription" && (
            <input
              className="border rounded-lg px-3 py-2 w-full mb-3"
              placeholder="Nom de la boutique"
              value={nomBoutique}
              onChange={(e) => setNomBoutique(e.target.value)}
            />
          )}
          <input
            className="border rounded-lg px-3 py-2 w-full mb-3"
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="border rounded-lg px-3 py-2 w-full mb-1"
            type="password"
            placeholder={
              mode === "inscription"
                ? "Mot de passe (8 caractères minimum)"
                : "Mot de passe"
            }
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
          {mode === "connexion" && (
            <div className="text-right mb-3">
              <Link
                href="/mot-de-passe-oublie"
                className="text-xs text-emerald-700 underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
          )}
          {mode === "inscription" && <div className="mb-3" />}

          {info && (
            <p className="bg-emerald-50 text-emerald-800 text-sm rounded-lg p-3 mb-3">
              {info}
            </p>
          )}
          {erreur && (
            <p className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-3">
              {erreur}
            </p>
          )}
          {peutRenvoyer && (
            <button
              className="text-sm text-emerald-700 underline mb-3"
              onClick={renvoyer}
            >
              Renvoyer le-mail de confirmation
            </button>
          )}

          <button
            className="bg-emerald-600 text-white font-medium rounded-lg px-4 py-2 w-full"
            onClick={valider}
            disabled={envoi}
          >
            {envoi
              ? "Patiente..."
              : mode === "connexion"
                ? "Se connecter"
                : "Créer mon compte"}
          </button>

          <button
            className="text-sm text-emerald-700 underline mt-4 w-full"
            onClick={() => {
              setMode(mode === "connexion" ? "inscription" : "connexion");
              setErreur("");
              setInfo("");
              setPeutRenvoyer(false);
            }}
          >
            {mode === "connexion"
              ? "Pas encore de compte ? Créer ma boutique"
              : "J'ai déjà un compte"}
          </button>
        </div>
      </div>
    </main>
  );
}
