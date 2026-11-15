"use client";

import { useState } from "react";

export type LignePanier = {
  articleId: number;
  nom: string;
  prix: number;
  quantite: number;
};

type Props = {
  lignes: LignePanier[];
  onChangerQuantite: (nom: string, delta: number) => void;
  onValider: (client: string, total: number) => void;
};

export default function Panier({
  lignes,
  onChangerQuantite,
  onValider,
}: Props) {
  const [client, setClient] = useState("");
  const [erreur, setErreur] = useState("");

  const total = lignes.reduce((somme, l) => somme + l.prix * l.quantite, 0);

  function valider() {
    if (lignes.length === 0) {
      setErreur("Le panier est vide.");
      return;
    }
    if (client.trim() === "") {
      setErreur("Entre le nom du client.");
      return;
    }
    onValider(client.trim(), total);
    setClient("");
    setErreur("");
  }

  return (
    <div className="border rounded-lg p-4 shadow">
      <h2 className="font-bold mb-3">Panier</h2>

      {lignes.length === 0 && (
        <p className="text-gray-500 text-sm">Panier vide.</p>
      )}

      {lignes.map((l) => (
        <div key={l.nom} className="flex items-center gap-2 mb-2">
          <div className="flex-1">
            <p>{l.nom}</p>
            <p className="text-sm text-gray-500">{l.prix * l.quantite} FCFA</p>
          </div>
          <button
            className="border rounded w-8 h-8"
            onClick={() => onChangerQuantite(l.nom, -1)}
          >
            −
          </button>
          <span className="w-6 text-center">{l.quantite}</span>
          <button
            className="border rounded w-8 h-8"
            onClick={() => onChangerQuantite(l.nom, 1)}
          >
            +
          </button>
        </div>
      ))}

      <p className="font-bold text-xl border-t pt-3 mt-3">
        Total : {total} FCFA
      </p>

      <input
        className="border rounded p-2 w-full mt-3"
        placeholder="Nom du client"
        value={client}
        onChange={(e) => setClient(e.target.value)}
      />
      {erreur && <p className="text-red-500 text-sm mt-1">{erreur}</p>}
      <button
        className="mt-3 w-full bg-black text-white rounded p-2"
        onClick={valider}
      >
        Valider la vente
      </button>
    </div>
  );
}
