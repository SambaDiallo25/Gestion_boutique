"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { DonneesClasseur } from "../../lib/excel";

type Props = Omit<DonneesClasseur, "boutique">;

export default function BoutonExcel({
  mois,
  libelleMois,
  ventes,
  paiements,
  depenses,
}: Props) {
  const [boutique, setBoutique] = useState("Ma Boutique");
  const [generation, setGeneration] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    async function charger() {
      const { data } = await supabase
        .from("boutiques")
        .select("nom")
        .maybeSingle();
      if (data) setBoutique(data.nom);
    }
    charger();
  }, []);

  async function telecharger() {
    setGeneration(true);
    setErreur("");
    try {
      const { genererClasseur } = await import("../../lib/excel");
      await genererClasseur({
        boutique,
        mois,
        libelleMois,
        ventes,
        paiements,
        depenses,
      });
    } catch {
      setErreur("Impossible de générer le fichier Excel.");
    } finally {
      setGeneration(false);
    }
  }

  return (
    <div className="card mb-6 border-emerald-200 bg-emerald-50">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-emerald-900">Rapport Excel complet</h2>
          <p className="text-sm text-emerald-800">
            Un classeur professionnel de {libelleMois} : tableau de bord,
            ventes, lignes de vente, paiements et dépenses, avec totaux et
            filtres.
          </p>
        </div>
        <button
          className="flex items-center gap-2 bg-emerald-600 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-60"
          onClick={telecharger}
          disabled={
            generation ||
            ventes.length + paiements.length + depenses.length === 0
          }
        >
          <FileSpreadsheet size={18} />
          {generation ? "Génération..." : "Télécharger (.xlsx)"}
        </button>
      </div>
      {erreur && <p className="text-red-500 text-sm mt-2">{erreur}</p>}
    </div>
  );
}
