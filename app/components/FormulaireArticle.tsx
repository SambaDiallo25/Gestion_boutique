"use client";

import { useState } from "react";

type Props = {
  onAjouter: (nom: string, prix: number) => void;
};

export default function FormulaireArticle({ onAjouter }: Props) {
  const [nom, setNom] = useState("");
  const [prix, setPrix] = useState("");
  const [erreur, setErreur] = useState("");

  function valider() {
    if (nom.trim() === "") {
      setErreur("Entre un nom d'article.");
      return;
    }
    if (Number(prix) <= 0) {
      setErreur("Entre un prix supérieur à 0.");
      return;
    }
    onAjouter(nom.trim(), Number(prix));
    setNom("");
    setPrix("");
    setErreur("");
  }

  return (
    <div className="border rounded-lg p-4 shadow mb-6 max-w-sm">
      <h2 className="font-bold mb-2">Nouvel article</h2>
      <input
        className="border rounded p-2 w-full mb-2"
        placeholder="Nom de l'article"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
      />
      <input
        className="border rounded p-2 w-full mb-2"
        type="number"
        placeholder="Prix (FCFA)"
        value={prix}
        onChange={(e) => setPrix(e.target.value)}
      />
      {erreur && <p className="text-red-500 text-sm mb-2">{erreur}</p>}
      <button
        className="bg-black text-white rounded p-2 w-full"
        onClick={valider}
      >
        Ajouter Article
      </button>
    </div>
  );
}
