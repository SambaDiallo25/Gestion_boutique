"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Vente = {
  id: number;
  client_nom: string;
  total: number;
  created_at: string;
};
type Depense = {
  id: number;
  libelle: string;
  montant: number;
  created_at: string;
};

function format(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function heure(dateIso: string) {
  return new Date(dateIso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PageCaisse() {
  const aujourdhui = new Date().toLocaleDateString("sv-SE");

  const [jour, setJour] = useState(aujourdhui);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [libelle, setLibelle] = useState("");
  const [montant, setMontant] = useState("");

  useEffect(() => {
    async function charger() {
      const debut = new Date(`${jour}T00:00:00`);
      const fin = new Date(debut);
      fin.setDate(fin.getDate() + 1);

      const [rv, rd] = await Promise.all([
        supabase
          .from("ventes")
          .select("*")
          .gte("created_at", debut.toISOString())
          .lt("created_at", fin.toISOString())
          .order("created_at", { ascending: false }),
        supabase
          .from("depenses")
          .select("*")
          .gte("created_at", debut.toISOString())
          .lt("created_at", fin.toISOString())
          .order("created_at", { ascending: false }),
      ]);

      const erreurBase = rv.error ?? rd.error;
      if (erreurBase) {
        setErreur(erreurBase.message);
      } else {
        setErreur("");
        setVentes(rv.data ?? []);
        setDepenses(rd.data ?? []);
      }
      setChargement(false);
    }
    charger();
  }, [jour]);

  async function ajouterDepense() {
    if (libelle.trim() === "") {
      setErreur("Entre un libellé pour la dépense.");
      return;
    }
    if (Number(montant) <= 0) {
      setErreur("Entre un montant supérieur à 0.");
      return;
    }

    const { data, error } = await supabase
      .from("depenses")
      .insert({ libelle: libelle.trim(), montant: Number(montant) })
      .select()
      .single();

    if (error) {
      setErreur(error.message);
      return;
    }

    if (jour === aujourdhui) {
      setDepenses([data, ...depenses]);
    } else {
      setJour(aujourdhui);
    }
    setLibelle("");
    setMontant("");
    setErreur("");
  }

  const totalEntrees = ventes.reduce((somme, v) => somme + v.total, 0);
  const totalSorties = depenses.reduce((somme, d) => somme + d.montant, 0);
  const solde = totalEntrees - totalSorties;

  return (
    <main className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Caisse</h1>
        <label className="flex items-center gap-2">
          Jour :
          <input
            type="date"
            className="border rounded p-2"
            value={jour}
            onChange={(e) => setJour(e.target.value)}
          />
        </label>
      </div>

      {erreur && <p className="text-red-500 mb-4">Erreur : {erreur}</p>}
      {chargement && <p className="text-gray-500 mb-4">Chargement...</p>}

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border rounded-lg p-4 shadow">
          <p className="text-sm text-gray-500">Entrées</p>
          <p className="text-2xl font-bold text-green-600">
            {format(totalEntrees)}
          </p>
        </div>
        <div className="border rounded-lg p-4 shadow">
          <p className="text-sm text-gray-500">Sorties</p>
          <p className="text-2xl font-bold text-red-500">
            {format(totalSorties)}
          </p>
        </div>
        <div className="border rounded-lg p-4 shadow">
          <p className="text-sm text-gray-500">Solde</p>
          <p
            className={
              solde < 0
                ? "text-2xl font-bold text-red-500"
                : "text-2xl font-bold"
            }
          >
            {format(solde)}
          </p>
        </div>
      </div>

      <div className="border rounded-lg p-4 shadow mb-8">
        <h2 className="font-bold mb-2">Nouvelle dépense</h2>
        <div className="flex gap-2">
          <input
            className="border rounded p-2 flex-1"
            placeholder="Ex : Transport, achat de stock..."
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
          />
          <input
            className="border rounded p-2 w-40"
            type="number"
            placeholder="Montant"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
          />
          <button
            className="bg-black text-white rounded px-4"
            onClick={ajouterDepense}
          >
            Ajouter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="font-bold mb-2">Ventes du jour ({ventes.length})</h2>
          {ventes.length === 0 && (
            <p className="text-gray-500 text-sm">Aucune vente ce jour-là.</p>
          )}
          {ventes.map((v) => (
            <div key={v.id} className="flex justify-between border-b py-2">
              <span>
                #{v.id} · {v.client_nom}{" "}
                <span className="text-sm text-gray-500">
                  {heure(v.created_at)}
                </span>
              </span>
              <span className="text-green-600">+ {format(v.total)}</span>
            </div>
          ))}
        </div>

        <div>
          <h2 className="font-bold mb-2">
            Dépenses du jour ({depenses.length})
          </h2>
          {depenses.length === 0 && (
            <p className="text-gray-500 text-sm">Aucune dépense ce jour-là.</p>
          )}
          {depenses.map((d) => (
            <div key={d.id} className="flex justify-between border-b py-2">
              <span>
                {d.libelle}{" "}
                <span className="text-sm text-gray-500">
                  {heure(d.created_at)}
                </span>
              </span>
              <span className="text-red-500">− {format(d.montant)}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
