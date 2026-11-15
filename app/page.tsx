"use client";

import Link from "next/link";
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
import { supabase } from "../lib/supabase";

type LigneVente = { article_nom: string; quantite: number; prix: number };
type Vente = {
  id: number;
  total: number;
  created_at: string;
  lignes_vente: LigneVente[];
};
type Depense = { id: number; montant: number; created_at: string };
type ArticleBas = { id: number; nom: string; stock: number };

const SEUIL_STOCK_BAS = 5;

function format(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function cleJour(dateIso: string) {
  return new Date(dateIso).toLocaleDateString("sv-SE");
}

export default function Accueil() {
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [stockBas, setStockBas] = useState<ArticleBas[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    async function charger() {
      const debut = new Date();
      debut.setHours(0, 0, 0, 0);
      debut.setDate(debut.getDate() - 6);
      const debutIso = debut.toISOString();

      const [rv, rd, ra] = await Promise.all([
        supabase
          .from("ventes")
          .select(
            "id, total, created_at, lignes_vente(article_nom, quantite, prix)",
          )
          .gte("created_at", debutIso),
        supabase
          .from("depenses")
          .select("id, montant, created_at")
          .gte("created_at", debutIso),
        supabase
          .from("articles")
          .select("id, nom, stock")
          .lt("stock", SEUIL_STOCK_BAS)
          .order("stock"),
      ]);

      const erreurBase = rv.error ?? rd.error ?? ra.error;
      if (erreurBase) {
        setErreur(erreurBase.message);
      } else {
        setVentes(rv.data ?? []);
        setDepenses(rd.data ?? []);
        setStockBas(ra.data ?? []);
      }
      setChargement(false);
    }
    charger();
  }, []);

  // --- Valeurs calculées (aucun état supplémentaire) ---
  const aujourdhui = new Date().toLocaleDateString("sv-SE");

  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const cle = d.toLocaleDateString("sv-SE");
    const total = ventes
      .filter((v) => cleJour(v.created_at) === cle)
      .reduce((somme, v) => somme + v.total, 0);
    return {
      cle,
      jour: d.toLocaleDateString("fr-FR", { weekday: "short" }),
      total,
    };
  });

  const ventesJour = ventes.filter((v) => cleJour(v.created_at) === aujourdhui);
  const caJour = ventesJour.reduce((somme, v) => somme + v.total, 0);
  const caHier = jours[5].total;
  const depensesJour = depenses
    .filter((d) => cleJour(d.created_at) === aujourdhui)
    .reduce((somme, d) => somme + d.montant, 0);
  const soldeJour = caJour - depensesJour;
  const ca7Jours = jours.reduce((somme, j) => somme + j.total, 0);

  const parArticle = ventes
    .flatMap((v) => v.lignes_vente)
    .reduce<Record<string, { nom: string; quantite: number }>>((acc, l) => {
      if (!acc[l.article_nom]) {
        acc[l.article_nom] = { nom: l.article_nom, quantite: 0 };
      }
      acc[l.article_nom].quantite += l.quantite;
      return acc;
    }, {});
  const topArticles = Object.values(parArticle)
    .sort((a, b) => b.quantite - a.quantite)
    .slice(0, 5);
  const maxQuantite = topArticles[0]?.quantite ?? 1;

  const dateDuJour = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="p-8">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-gray-500 capitalize">{dateDuJour}</p>
      </div>

      {erreur && <p className="text-red-500 mb-4">Erreur : {erreur}</p>}
      {chargement && <p className="text-gray-500 mb-4">Chargement...</p>}

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-gray-500">Ventes du jour</p>
          <p className="text-2xl font-bold text-green-600">{format(caJour)}</p>
          <p className="text-xs text-gray-500">Hier : {format(caHier)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Nombre de ventes</p>
          <p className="text-2xl font-bold">{ventesJour.length}</p>
          <p className="text-xs text-gray-500">Aujourdhui</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Dépenses du jour</p>
          <p className="text-2xl font-bold text-red-500">
            {format(depensesJour)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Solde du jour</p>
          <p
            className={
              soldeJour < 0
                ? "text-2xl font-bold text-red-500"
                : "text-2xl font-bold"
            }
          >
            {format(soldeJour)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="font-bold">Ventes des 7 derniers jours</h2>
            <p className="text-sm text-gray-500">Total : {format(ca7Jours)}</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={jours}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="jour" />
              <YAxis
                width={95}
                tickFormatter={(n: number) => n.toLocaleString("fr-FR")}
              />
              <Tooltip formatter={(valeur) => format(Number(valeur))} />
              <Bar
                dataKey="total"
                name="Ventes"
                fill="#16a34a"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="font-bold mb-3">Articles les plus vendus</h2>
          {topArticles.length === 0 && (
            <p className="text-sm text-gray-500">
              Pas encore de ventes cette semaine.
            </p>
          )}
          {topArticles.map((a) => (
            <div key={a.nom} className="mb-3">
              <div className="flex justify-between text-sm">
                <span>{a.nom}</span>
                <span className="font-bold">{a.quantite}</span>
              </div>
              <div className="bg-gray-100 rounded h-2 mt-1">
                <div
                  className="bg-green-500 h-2 rounded"
                  style={{ width: `${(a.quantite / maxQuantite) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-bold">Stock bas ({stockBas.length})</h2>
          <Link href="/articles" className="text-sm underline">
            Gérer les articles
          </Link>
        </div>
        {stockBas.length === 0 && (
          <p className="text-sm text-green-600">
            Tous tes articles sont bien approvisionnés.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {stockBas.map((a) => (
            <span
              key={a.id}
              className="bg-red-50 text-red-600 rounded px-3 py-1 text-sm"
            >
              {a.nom} : {a.stock}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
