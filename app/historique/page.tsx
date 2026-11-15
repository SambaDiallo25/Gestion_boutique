"use client";

import { useEffect, useState } from "react";
import { telechargerFacture } from "../../lib/facture";
import { supabase } from "../../lib/supabase";

type LigneVente = {
  id: number;
  article_nom: string;
  prix: number;
  quantite: number;
};

type Vente = {
  id: number;
  client_nom: string;
  total: number;
  created_at: string;
  lignes_vente: LigneVente[];
};

function format(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function dateHeure(dateIso: string) {
  return new Date(dateIso).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function PageHistorique() {
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [nomBoutique, setNomBoutique] = useState("Ma Boutique");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [ouverte, setOuverte] = useState<number | null>(null);
  const [generation, setGeneration] = useState<number | null>(null);

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase
        .from("ventes")
        .select("*, lignes_vente(*)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        setErreur(error.message);
      } else {
        setVentes(data ?? []);
      }

      const { data: boutique } = await supabase
        .from("boutiques")
        .select("nom")
        .maybeSingle();
      if (boutique) setNomBoutique(boutique.nom);

      setChargement(false);
    }
    charger();
  }, []);

  async function telecharger(v: Vente) {
    setGeneration(v.id);
    try {
      await telechargerFacture({
        boutique: nomBoutique,
        numero: v.id,
        client: v.client_nom,
        date: new Date(v.created_at).toLocaleString("fr-FR", {
          dateStyle: "short",
          timeStyle: "short",
        }),

        total: v.total,
        lignes: v.lignes_vente.map((l) => ({
          nom: l.article_nom,
          prix: l.prix,
          quantite: l.quantite,
        })),
      });
    } catch {
      setErreur("Impossible de générer la facture.");
    } finally {
      setGeneration(null);
    }
  }

  const affichees = ventes.filter(
    (v) =>
      v.client_nom.toLowerCase().includes(recherche.toLowerCase()) ||
      String(v.id) === recherche.trim(),
  );
  const totalAffiche = affichees.reduce((somme, v) => somme + v.total, 0);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Historique des ventes</h1>

      <div className="flex items-center gap-4 mb-4">
        <input
          className="border rounded p-2 w-full max-w-sm"
          placeholder="Rechercher par client ou n° de vente..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <p className="text-gray-500">
          {affichees.length} vente(s) · {format(totalAffiche)}
        </p>
      </div>

      {erreur && <p className="text-red-500 mb-4">Erreur : {erreur}</p>}
      {chargement && <p className="text-gray-500">Chargement...</p>}
      {!chargement && affichees.length === 0 && (
        <p className="text-gray-500">Aucune vente trouvée.</p>
      )}

      {affichees.map((v) => (
        <div key={v.id} className="card mb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-bold">
                Vente n°{v.id} · {v.client_nom}
              </p>
              <p className="text-sm text-gray-500">{dateHeure(v.created_at)}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-bold">{format(v.total)}</p>
              <button
                className="border rounded px-3 py-1"
                onClick={() => setOuverte(ouverte === v.id ? null : v.id)}
              >
                {ouverte === v.id ? "Masquer" : "Détails"}
              </button>
              <button
                className="bg-black text-white rounded px-3 py-1 disabled:opacity-50"
                onClick={() => telecharger(v)}
                disabled={generation === v.id}
              >
                {generation === v.id ? "Génération..." : "Facture PDF"}
              </button>
            </div>
          </div>

          {ouverte === v.id && (
            <div className="mt-3 border-t pt-3">
              {v.lignes_vente.length === 0 && (
                <p className="text-sm text-gray-500">
                  Aucun détail enregistré.
                </p>
              )}
              {v.lignes_vente.map((l) => (
                <div key={l.id} className="flex justify-between text-sm py-1">
                  <span>
                    {l.article_nom} × {l.quantite}
                  </span>
                  <span>{format(l.prix * l.quantite)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
