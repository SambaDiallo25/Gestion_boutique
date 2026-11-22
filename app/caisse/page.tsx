"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { MODES_PAIEMENT, infoMode } from "../../lib/paiements";
import {
  CATEGORIES_DEPENSE,
  infoCategorie,
  type CategorieDepense,
} from "../../lib/depenses";

type Paiement = {
  id: number;
  vente_id: number;
  montant: number;
  mode_paiement: string;
  created_at: string;
  ventes: { client_nom: string } | null;
};
type Depense = {
  id: number;
  libelle: string;
  montant: number;
  categorie: string;
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
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [libelle, setLibelle] = useState("");
  const [montant, setMontant] = useState("");
  const [categorie, setCategorie] = useState<CategorieDepense>("charge");

  useEffect(() => {
    async function charger() {
      const debut = new Date(`${jour}T00:00:00`);
      const fin = new Date(debut);
      fin.setDate(fin.getDate() + 1);

      const [rp, rd] = await Promise.all([
        supabase
          .from("paiements")
          .select("*, ventes(client_nom)")
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

      const erreurBase = rp.error ?? rd.error;
      if (erreurBase) {
        setErreur(erreurBase.message);
      } else {
        setErreur("");
        setPaiements(rp.data ?? []);
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
      .insert({
        libelle: libelle.trim(),
        montant: Math.floor(Number(montant)),
        categorie,
      })
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
    setCategorie("charge");
    setErreur("");
  }

  async function basculerCategorie(d: Depense) {
    const nouvelle = d.categorie === "charge" ? "achat_stock" : "charge";
    const { error } = await supabase
      .from("depenses")
      .update({ categorie: nouvelle })
      .eq("id", d.id);

    if (error) {
      setErreur(error.message);
      return;
    }
    setDepenses(
      depenses.map((x) => (x.id === d.id ? { ...x, categorie: nouvelle } : x)),
    );
  }

  const totalEntrees = paiements.reduce((somme, p) => somme + p.montant, 0);
  const totalSorties = depenses.reduce((somme, d) => somme + d.montant, 0);
  const charges = depenses
    .filter((d) => d.categorie === "charge")
    .reduce((somme, d) => somme + d.montant, 0);
  const achats = totalSorties - charges;
  const solde = totalEntrees - totalSorties;

  const parMode = MODES_PAIEMENT.map((m) => {
    const total = paiements
      .filter((p) => p.mode_paiement === m.valeur)
      .reduce((somme, p) => somme + p.montant, 0);
    const pourcentage =
      totalEntrees > 0 ? Math.round((total / totalEntrees) * 100) : 0;
    return { ...m, total, pourcentage };
  });
  const especes = parMode.find((m) => m.valeur === "especes")?.total ?? 0;
  const especesEnCaisse = especes - totalSorties;

  return (
    <main className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-gray-500">Encaissé</p>
          <p className="text-base sm:text-xl lg:text-2xl font-bold text-green-600">
            {format(totalEntrees)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Sorties</p>
          <p className="text-base sm:text-xl lg:text-2xl font-bold text-red-500">
            {format(totalSorties)}
          </p>
          <p className="text-xs text-gray-500">
            Charges : {format(charges)} · Achats : {format(achats)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Solde</p>
          <p
            className={
              solde < 0
                ? "text-base sm:text-xl lg:text-2xl font-bold text-red-500"
                : "text-base sm:text-xl lg:text-2xl font-bold"
            }
          >
            {format(solde)}
          </p>
        </div>
      </div>

      <h2 className="font-bold mb-2">Encaissements par mode de paiement</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {parMode.map((m) => (
          <div key={m.valeur} className="card">
            <div className="flex items-center justify-between">
              <span className={`text-xs rounded px-2 py-1 ${m.badge}`}>
                {m.label}
              </span>
              <span className="text-sm text-gray-500">{m.pourcentage} %</span>
            </div>
            <p className="font-bold mt-2">{format(m.total)}</p>
            <div className="bg-slate-100 rounded h-2 mt-2">
              <div
                className="bg-emerald-500 h-2 rounded"
                style={{ width: `${m.pourcentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="card mb-8 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-bold">Espèces en caisse</p>
          <p className="text-sm text-gray-500">
            Espèces encaissées moins les dépenses du jour
          </p>
        </div>
        <p
          className={
            especesEnCaisse < 0
              ? "text-xl font-bold text-red-500"
              : "text-xl font-bold"
          }
        >
          {format(especesEnCaisse)}
        </p>
      </div>

      <div className="card mb-8">
        <h2 className="font-bold mb-2">Nouvelle dépense</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="border rounded p-2 flex-1 min-w-40"
            placeholder="Ex : Transport, achat de riz..."
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
          />
          <input
            className="border rounded p-2 w-36"
            type="number"
            placeholder="Montant"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
          />
          <select
            className="border rounded p-2"
            value={categorie}
            onChange={(e) => setCategorie(e.target.value as CategorieDepense)}
          >
            {CATEGORIES_DEPENSE.map((c) => (
              <option key={c.valeur} value={c.valeur}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            className="bg-black text-white rounded px-4"
            onClick={ajouterDepense}
          >
            Ajouter
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Charge : loyer, transport, électricité, salaire... · Achat de
          marchandises : réapprovisionnement du stock (non retranché du
          bénéfice).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-bold mb-2">
            Encaissements du jour ({paiements.length})
          </h2>
          {paiements.length === 0 && (
            <p className="text-gray-500 text-sm">
              Aucun encaissement ce jour-là.
            </p>
          )}
          {paiements.map((p) => (
            <div
              key={p.id}
              className="flex justify-between gap-2 border-b py-2"
            >
              <span>
                #{p.vente_id} · {p.ventes?.client_nom ?? "Client"}{" "}
                <span className="text-sm text-gray-500">
                  {heure(p.created_at)}
                </span>{" "}
                <span
                  className={`text-xs rounded px-2 py-1 ${infoMode(p.mode_paiement).badge}`}
                >
                  {infoMode(p.mode_paiement).label}
                </span>
              </span>
              <span className="text-green-600 whitespace-nowrap">
                + {format(p.montant)}
              </span>
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
            <div
              key={d.id}
              className="flex justify-between gap-2 border-b py-2"
            >
              <span>
                {d.libelle}{" "}
                <span className="text-sm text-gray-500">
                  {heure(d.created_at)}
                </span>{" "}
                <button
                  type="button"
                  title="Cliquer pour changer le type"
                  className={`text-xs rounded px-2 py-1 ${infoCategorie(d.categorie).badge}`}
                  onClick={() => basculerCategorie(d)}
                >
                  {infoCategorie(d.categorie).label}
                </button>
              </span>
              <span className="text-red-500 whitespace-nowrap">
                − {format(d.montant)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
