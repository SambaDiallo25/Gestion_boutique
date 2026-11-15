"use client";

import { useState } from "react";
import { MODES_PAIEMENT, type ModePaiement } from "../../lib/paiements";

export type LignePanier = {
  articleId: number;
  nom: string;
  prix: number;
  quantite: number;
  stock: number;
};

type Props = {
  lignes: LignePanier[];
  onChangerQuantite: (nom: string, delta: number) => void;
  onValider: (
    client: string,
    total: number,
    mode: ModePaiement,
    montantPaye: number,
  ) => void;
};

function format(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function classeChoix(actif: boolean) {
  return `rounded-lg border px-1 py-2 text-xs sm:text-sm font-medium ${
    actif
      ? "bg-emerald-600 text-white border-emerald-600"
      : "bg-white text-slate-700 hover:bg-slate-50"
  }`;
}

export default function Panier({
  lignes,
  onChangerQuantite,
  onValider,
}: Props) {
  const [client, setClient] = useState("");
  const [mode, setMode] = useState<ModePaiement>("especes");
  const [credit, setCredit] = useState(false);
  const [verse, setVerse] = useState("");
  const [erreur, setErreur] = useState("");

  const total = lignes.reduce((somme, l) => somme + l.prix * l.quantite, 0);
  const montantPaye = credit ? Math.floor(Number(verse) || 0) : total;
  const reste = total - montantPaye;

  function valider() {
    if (lignes.length === 0) {
      setErreur("Le panier est vide.");
      return;
    }
    if (client.trim() === "") {
      setErreur("Entre le nom du client.");
      return;
    }
    if (credit && (montantPaye < 0 || montantPaye > total)) {
      setErreur(`Le montant versé doit être entre 0 et ${total} FCFA.`);
      return;
    }
    onValider(client.trim(), total, mode, montantPaye);
    setClient("");
    setMode("especes");
    setCredit(false);
    setVerse("");
    setErreur("");
  }

  return (
    <div className="card">
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
            disabled={l.quantite >= l.stock}
          >
            +
          </button>
        </div>
      ))}

      <p className="font-bold text-xl border-t pt-3 mt-3">
        Total : {total} FCFA
      </p>

      <p className="text-sm text-gray-500 mt-3 mb-1">Paiement</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={classeChoix(!credit)}
          onClick={() => setCredit(false)}
        >
          Payé en totalité
        </button>
        <button
          type="button"
          className={classeChoix(credit)}
          onClick={() => setCredit(true)}
        >
          Crédit / partiel
        </button>
      </div>

      {credit && (
        <div className="mt-2">
          <input
            className="border rounded p-2 w-full"
            type="number"
            placeholder="Montant versé (0 si rien)"
            value={verse}
            onChange={(e) => setVerse(e.target.value)}
          />
          <p
            className={`text-sm mt-1 ${
              reste > 0 ? "text-orange-600 font-medium" : "text-slate-500"
            }`}
          >
            Reste à payer : {format(Math.max(0, reste))}
          </p>
        </div>
      )}

      {montantPaye > 0 && (
        <>
          <p className="text-sm text-gray-500 mt-3 mb-1">Mode de paiement</p>
          <div className="grid grid-cols-3 gap-2">
            {MODES_PAIEMENT.map((m) => (
              <button
                key={m.valeur}
                type="button"
                className={classeChoix(mode === m.valeur)}
                onClick={() => setMode(m.valeur)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </>
      )}

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
