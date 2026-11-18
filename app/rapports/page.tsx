"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "../../lib/supabase";
import { MODES_PAIEMENT, infoMode } from "../../lib/paiements";
import { telechargerCsv } from "../../lib/export";

type LigneVente = { article_nom: string; prix: number; quantite: number };
type Vente = {
  id: number;
  client_nom: string;
  total: number;
  created_at: string;
  lignes_vente: LigneVente[];
  paiements: { montant: number }[];
};
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
  created_at: string;
};

function format(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function abreger(n: number) {
  if (n >= 1_000_000) return `${Number((n / 1_000_000).toFixed(1))}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function dateHeure(dateIso: string) {
  return new Date(dateIso).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function cleJour(dateIso: string) {
  return new Date(dateIso).toLocaleDateString("sv-SE");
}

export default function PageRapports() {
  const [mois, setMois] = useState(
    new Date().toLocaleDateString("sv-SE").slice(0, 7),
  );
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    async function charger() {
      if (!mois) return;

      const debut = new Date(`${mois}-01T00:00:00`);
      const fin = new Date(debut);
      fin.setMonth(fin.getMonth() + 1);
      const d = debut.toISOString();
      const f = fin.toISOString();

      const [rv, rp, rd] = await Promise.all([
        supabase
          .from("ventes")
          .select("*, lignes_vente(*), paiements(montant)")
          .gte("created_at", d)
          .lt("created_at", f)
          .order("created_at"),
        supabase
          .from("paiements")
          .select("*, ventes(client_nom)")
          .gte("created_at", d)
          .lt("created_at", f)
          .order("created_at"),
        supabase
          .from("depenses")
          .select("*")
          .gte("created_at", d)
          .lt("created_at", f)
          .order("created_at"),
      ]);

      const erreurBase = rv.error ?? rp.error ?? rd.error;
      if (erreurBase) {
        setErreur(erreurBase.message);
      } else {
        setErreur("");
        setVentes(rv.data ?? []);
        setPaiements(rp.data ?? []);
        setDepenses(rd.data ?? []);
      }
      setChargement(false);
    }
    charger();
  }, [mois]);

  // --- Valeurs calculées ---
  const chiffreAffaires = ventes.reduce((somme, v) => somme + v.total, 0);
  const encaisse = paiements.reduce((somme, p) => somme + p.montant, 0);
  const sorties = depenses.reduce((somme, d) => somme + d.montant, 0);
  const tresorerie = encaisse - sorties;

  const [annee, numeroMois] = mois.split("-").map(Number);
  const nbJours = new Date(annee, numeroMois, 0).getDate();
  const jours = Array.from({ length: nbJours }, (_, i) => {
    const cle = `${mois}-${String(i + 1).padStart(2, "0")}`;
    const total = ventes
      .filter((v) => cleJour(v.created_at) === cle)
      .reduce((somme, v) => somme + v.total, 0);
    return { jour: String(i + 1), total };
  });

  const parMode = MODES_PAIEMENT.map((m) => {
    const total = paiements
      .filter((p) => p.mode_paiement === m.valeur)
      .reduce((somme, p) => somme + p.montant, 0);
    const pourcentage = encaisse > 0 ? Math.round((total / encaisse) * 100) : 0;
    return { ...m, total, pourcentage };
  });

  const parArticle = ventes
    .flatMap((v) => v.lignes_vente)
    .reduce<Record<string, { nom: string; quantite: number; montant: number }>>(
      (acc, l) => {
        if (!acc[l.article_nom]) {
          acc[l.article_nom] = { nom: l.article_nom, quantite: 0, montant: 0 };
        }
        acc[l.article_nom].quantite += l.quantite;
        acc[l.article_nom].montant += l.prix * l.quantite;
        return acc;
      },
      {},
    );
  const topArticles = Object.values(parArticle)
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 5);
  const maxMontant = topArticles[0]?.montant ?? 1;

  const libelleMois = new Date(`${mois}-01T00:00:00`).toLocaleDateString(
    "fr-FR",
    {
      month: "long",
      year: "numeric",
    },
  );

  // --- Exports ---
  function payeVente(v: Vente) {
    return v.paiements.reduce((somme, p) => somme + p.montant, 0);
  }

  const payeMois = ventes.reduce((somme, v) => somme + payeVente(v), 0);
  const resteMois = ventes.reduce(
    (somme, v) => somme + Math.max(0, v.total - payeVente(v)),
    0,
  );

  function exporterVentes() {
    telechargerCsv(
      `ventes-${mois}.csv`,
      [
        "N° vente",
        "Date",
        "Client",
        "Total (FCFA)",
        "Payé à ce jour (FCFA)",
        "Reste à payer (FCFA)",
        "Articles",
      ],
      [
        ...ventes.map((v) => [
          v.id,
          dateHeure(v.created_at),
          v.client_nom,
          v.total,
          payeVente(v),
          Math.max(0, v.total - payeVente(v)),
          v.lignes_vente
            .map((l) => `${l.article_nom} x${l.quantite}`)
            .join(" | "),
        ]),
        [],
        ["", "", "TOTAL", chiffreAffaires, payeMois, resteMois, ""],
      ],
    );
  }

  function exporterPaiements() {
    telechargerCsv(
      `paiements-${mois}.csv`,
      ["N° vente", "Date", "Client", "Mode de paiement", "Montant (FCFA)"],
      [
        ...paiements.map((p) => [
          p.vente_id,
          dateHeure(p.created_at),
          p.ventes?.client_nom ?? "",
          infoMode(p.mode_paiement).label,
          p.montant,
        ]),
        [],
        ["", "", "", "TOTAL", encaisse],
        ...parMode.map((m) => ["", "", "", `dont ${m.label}`, m.total]),
      ],
    );
  }

  function exporterDepenses() {
    telechargerCsv(
      `depenses-${mois}.csv`,
      ["Date", "Libellé", "Montant (FCFA)"],
      [
        ...depenses.map((d) => [dateHeure(d.created_at), d.libelle, d.montant]),
        [],
        ["", "TOTAL", sorties],
      ],
    );
  }

  function exporterResume() {
    telechargerCsv(
      `resume-${mois}.csv`,
      ["Indicateur", "Valeur"],
      [
        ["Mois", libelleMois],
        ["Nombre de ventes", ventes.length],
        ["Chiffre d'affaires (FCFA)", chiffreAffaires],
        ["Encaissé (FCFA)", encaisse],
        ...parMode.map((m) => [`   dont ${m.label} (FCFA)`, m.total]),
        ["Dépenses (FCFA)", sorties],
        ["Trésorerie du mois (FCFA)", tresorerie],
        ["Reste à encaisser sur les ventes du mois (FCFA)", resteMois],
      ],
    );
  }

  return (
    <main className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Rapports</h1>
          <p className="text-gray-500 capitalize">{libelleMois}</p>
        </div>
        <label className="flex items-center gap-2">
          Mois :
          <input
            type="month"
            className="border rounded p-2"
            value={mois}
            onChange={(e) => setMois(e.target.value)}
          />
        </label>
      </div>

      {erreur && <p className="text-red-500 mb-4">Erreur : {erreur}</p>}
      {chargement && <p className="text-gray-500 mb-4">Chargement...</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-gray-500">Chiffre daffaires</p>
          <p className="text-base sm:text-xl lg:text-2xl font-bold">
            {format(chiffreAffaires)}
          </p>
          <p className="text-xs text-gray-500">{ventes.length} vente(s)</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Encaissé</p>
          <p className="text-base sm:text-xl lg:text-2xl font-bold text-green-600">
            {format(encaisse)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Dépenses</p>
          <p className="text-base sm:text-xl lg:text-2xl font-bold text-red-500">
            {format(sorties)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Trésorerie du mois</p>
          <p
            className={
              tresorerie < 0
                ? "text-base sm:text-xl lg:text-2xl font-bold text-red-500"
                : "text-base sm:text-xl lg:text-2xl font-bold"
            }
          >
            {format(tresorerie)}
          </p>
          <p className="text-xs text-gray-500">Encaissé − dépenses</p>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="font-bold mb-2">Ventes par jour</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={jours}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="jour" interval="preserveStartEnd" />
            <YAxis width={55} tickFormatter={abreger} />
            <Tooltip
              formatter={(valeur) => format(Number(valeur))}
              labelFormatter={(jour) => `Jour ${jour}`}
            />
            <Bar
              dataKey="total"
              name="Ventes"
              fill="#16a34a"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="font-bold mb-3">Encaissements par mode de paiement</h2>
          {parMode.map((m) => (
            <div key={m.valeur} className="mb-3">
              <div className="flex items-center justify-between text-sm">
                <span className={`text-xs rounded px-2 py-1 ${m.badge}`}>
                  {m.label}
                </span>
                <span>
                  {format(m.total)} · {m.pourcentage} %
                </span>
              </div>
              <div className="bg-slate-100 rounded h-2 mt-2">
                <div
                  className="bg-emerald-500 h-2 rounded"
                  style={{ width: `${m.pourcentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="font-bold mb-3">Articles qui rapportent le plus</h2>
          {topArticles.length === 0 && (
            <p className="text-sm text-gray-500">Aucune vente ce mois-ci.</p>
          )}
          {topArticles.map((a) => (
            <div key={a.nom} className="mb-3">
              <div className="flex justify-between text-sm">
                <span>
                  {a.nom} <span className="text-gray-500">× {a.quantite}</span>
                </span>
                <span className="font-bold">{format(a.montant)}</span>
              </div>
              <div className="bg-gray-100 rounded h-2 mt-1">
                <div
                  className="bg-green-500 h-2 rounded"
                  style={{ width: `${(a.montant / maxMontant) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold mb-1">Exporter pour Excel</h2>
        <p className="text-sm text-gray-500 mb-3">
          Fichiers du mois de {libelleMois}, à ouvrir directement dans Excel.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
            onClick={exporterVentes}
            disabled={ventes.length === 0}
          >
            Ventes ({ventes.length})
          </button>
          <button
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
            onClick={exporterPaiements}
            disabled={paiements.length === 0}
          >
            Paiements ({paiements.length})
          </button>
          <button
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
            onClick={exporterDepenses}
            disabled={depenses.length === 0}
          >
            Dépenses ({depenses.length})
          </button>
          <button
            className="bg-emerald-600 text-white rounded px-4 py-2"
            onClick={exporterResume}
          >
            Résumé du mois
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        La trésorerie nest pas le bénéfice : pour calculer une vraie marge, il
        faudrait enregistrer le prix dachat de chaque article.
      </p>
    </main>
  );
}
