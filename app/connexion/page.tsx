"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function PageConnexion() {
  const router = useRouter();
  const [mode, setMode] = useState<"connexion" | "inscription">("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nomBoutique, setNomBoutique] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function valider() {
    setErreur("");

    if (email.trim() === "" || motDePasse === "") {
      setErreur("Entre ton e-mail et ton mot de passe.");
      return;
    }
    if (mode === "inscription") {
      if (nomBoutique.trim() === "") {
        setErreur("Entre le nom de ta boutique.");
        return;
      }
      if (motDePasse.length < 6) {
        setErreur("Le mot de passe doit faire au moins 6 caractères.");
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
        setErreur("E-mail ou mot de passe incorrect.");
        setEnvoi(false);
        return;
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: motDePasse,
      });
      if (error) {
        setErreur(error.message);
        setEnvoi(false);
        return;
      }
      if (!data.session) {
        setErreur("Compte créé. Confirme ton e-mail, puis connecte-toi.");
        setEnvoi(false);
        return;
      }
      const { error: erreurBoutique } = await supabase
        .from("boutiques")
        .insert({ nom: nomBoutique.trim() });
      if (erreurBoutique) {
        setErreur(erreurBoutique.message);
        setEnvoi(false);
        return;
      }
    }

    router.push("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="card w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-4">
          {mode === "connexion" ? "Connexion" : "Créer ma boutique"}
        </h1>

        {mode === "inscription" && (
          <input
            className="border rounded p-2 w-full mb-2"
            placeholder="Nom de la boutique"
            value={nomBoutique}
            onChange={(e) => setNomBoutique(e.target.value)}
          />
        )}
        <input
          className="border rounded p-2 w-full mb-2"
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border rounded p-2 w-full mb-2"
          type="password"
          placeholder="Mot de passe"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
        />

        {erreur && <p className="text-red-500 text-sm mb-2">{erreur}</p>}

        <button
          className="bg-black text-white rounded p-2 w-full disabled:opacity-50"
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
          className="text-sm underline mt-4 w-full"
          onClick={() => {
            setMode(mode === "connexion" ? "inscription" : "connexion");
            setErreur("");
          }}
        >
          {mode === "connexion"
            ? "Pas encore de compte ? Créer ma boutique"
            : "J'ai déjà un compte"}
        </button>
      </div>
    </main>
  );
}
