"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { telechargerFacture } from "../../lib/facture";
import { envoyerParWhatsApp } from "../../lib/whatsapp";
import {
  MODES_PAIEMENT,
  infoMode,
  type ModePaiement,
} from "../../lib/paiements";
import type { DonneesFacture } from "../components/FactureDocument";

type LigneVente = {
  id: number;
  article_nom: string;
  prix: number;
  quantite: number;
};

type Paiement = {
  id: number;
  montant: number;
  mode_paiement: string;
  created_at: string;
};

type Vente = {
  id: number;
  client_nom: string;
  total: number;
  created_at: string;
  lignes_vente: LigneVente[];
  paiements: Paiement[];
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

function paye(v: Vente) {
  return v.paiements.reduce((somme, p) => somme + p.montant, 0);
}

function reste(v: Vente) {
  return v.total - paye(v);
}

function statut(v: Vente) {
  if (reste(v) <= 0)
    return { label: "Payé", classe: "bg-emerald-100 text-emerald-700" };
  if (paye(v) === 0)
    return { label: "Impayé", classe: "bg-red-100 text-red-600" };
  return { label: "Partiel", classe: "bg-orange-100 text-orange-700" };
}

export default function PageHistorique() {
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [nomBoutique, setNomBoutique] = useState("Ma Boutique");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("tous");
  const [ouverte, setOuverte] = useState<number | null>(null);
  const [generation, setGeneration] = useState<number | null>(null);

  const [encaissement, setEncaissement] = useState<number | null>(null);
  const [montantEnc, setMontantEnc] = useState("");
  const [modeEnc, setModeEnc] = useState<ModePaiement>("especes");

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase
        .from("ventes")
        .select("*, lignes_vente(*), paiements(*)")
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

  function donneesFacture(v: Vente): DonneesFacture {
    const modes = [
      ...new Set(v.paiements.map((p) => infoMode(p.mode_paiement).label)),
    ];
    const description =
      paye(v) === 0
        ? "Non payé (crédit)"
        : reste(v) > 0
          ? `${modes.join(", ")} (versé ${paye(v)} FCFA, reste ${reste(v)} FCFA)`
          : modes.join(", ");

    return {
      boutique: nomBoutique,
      numero: v.id,
      client: v.client_nom,
      date: dateHeure(v.created_at),
      total: v.total,
      modePaiement: description,
      lignes: v.lignes_vente.map((l) => ({
        nom: l.article_nom,
        prix: l.prix,
        quantite: l.quantite,
      })),
    };
  }

  async function telecharger(v: Vente) {
    setGeneration(v.id);
    try {
      await telechargerFacture(donneesFacture(v));
    } catch {
      setErreur("Impossible de générer la facture.");
    } finally {
      setGeneration(null);
    }
  }

  function ouvrirEncaissement(v: Vente) {
    setEncaissement(v.id);
    setMontantEnc(String(reste(v)));
    setModeEnc("especes");
    setErreur("");
  }

  async function encaisser(v: Vente) {
    const montant = Math.floor(Number(montantEnc));
    if (!montant || montant <= 0) {
      setErreur("Entre un montant supérieur à 0.");
      return;
    }
    if (montant > reste(v)) {
      setErreur(`Le montant dépasse le reste à payer (${reste(v)} FCFA).`);
      return;
    }

    const { data, error } = await supabase
      .from("paiements")
      .insert({ vente_id: v.id, montant, mode_paiement: modeEnc })
      .select()
      .single();

    if (error) {
      setErreur(error.message);
      return;
    }

    setVentes(
      ventes.map((x) =>
        x.id === v.id ? { ...x, paiements: [...x.paiements, data] } : x,
      ),
    );
    setEncaissement(null);
    setErreur("");
  }

  const affichees = ventes.filter((v) => {
    const correspond =
      v.client_nom.toLowerCase().includes(recherche.toLowerCase()) ||
      String(v.id) === recherche.trim();
    const aEncaisser = reste(v) > 0;
    const okFiltre =
      filtre === "tous" ||
      (filtre === "a_encaisser" && aEncaisser) ||
      (filtre === "payees" && !aEncaisser);
    return correspond && okFiltre;
  });

  const totalAffiche = affichees.reduce((somme, v) => somme + v.total, 0);
  const totalRestant = affichees.reduce(
    (somme, v) => somme + Math.max(0, reste(v)),
    0,
  );

  return (
    <main className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">Historique des ventes</h1>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <input
          className="border rounded p-2 w-full max-w-sm"
          placeholder="Rechercher par client ou n° de vente..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <select
          className="border rounded p-2"
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
        >
          <option value="tous">Toutes les ventes</option>
          <option value="a_encaisser">À encaisser (crédit)</option>
          <option value="payees">Payées</option>
        </select>
        <p className="text-gray-500">
          {affichees.length} vente(s) · {format(totalAffiche)}
          {totalRestant > 0 && (
            <span className="text-orange-600 font-medium">
              {" "}
              · à encaisser : {format(totalRestant)}
            </span>
          )}
        </p>
      </div>

      {erreur && <p className="text-red-500 mb-4">Erreur : {erreur}</p>}
      {chargement && <p className="text-gray-500">Chargement...</p>}
      {!chargement && affichees.length === 0 && (
        <p className="text-gray-500">Aucune vente trouvée.</p>
      )}

      {affichees.map((v) => {
        const s = statut(v);
        return (
          <div key={v.id} className="card mb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold">
                  Vente n°{v.id} · {v.client_nom}{" "}
                  <span
                    className={`text-xs rounded px-2 py-1 ml-1 ${s.classe}`}
                  >
                    {s.label}
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  {dateHeure(v.created_at)}
                </p>
                {reste(v) > 0 && (
                  <p className="text-sm text-orange-600 font-medium">
                    Reste à payer : {format(reste(v))}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-bold">{format(v.total)}</p>
                {reste(v) > 0 && (
                  <button
                    className="bg-orange-500 text-white rounded px-3 py-1"
                    onClick={() => ouvrirEncaissement(v)}
                  >
                    Encaisser
                  </button>
                )}
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
                <button
                  className="bg-emerald-600 text-white rounded px-3 py-1"
                  onClick={() => envoyerParWhatsApp(donneesFacture(v))}
                >
                  WhatsApp
                </button>
              </div>
            </div>

            {encaissement === v.id && (
              <div className="mt-3 border-t pt-3 flex flex-wrap items-center gap-2">
                <input
                  className="border rounded p-2 w-40"
                  type="number"
                  value={montantEnc}
                  onChange={(e) => setMontantEnc(e.target.value)}
                />
                <select
                  className="border rounded p-2"
                  value={modeEnc}
                  onChange={(e) => setModeEnc(e.target.value as ModePaiement)}
                >
                  {MODES_PAIEMENT.map((m) => (
                    <option key={m.valeur} value={m.valeur}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <button
                  className="bg-black text-white rounded px-3 py-2"
                  onClick={() => encaisser(v)}
                >
                  Enregistrer le paiement
                </button>
                <button
                  className="border rounded px-3 py-2"
                  onClick={() => setEncaissement(null)}
                >
                  Annuler
                </button>
              </div>
            )}

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

                <p className="font-bold text-sm mt-3 mb-1">Paiements</p>
                {v.paiements.length === 0 && (
                  <p className="text-sm text-gray-500">Aucun paiement reçu.</p>
                )}
                {v.paiements.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm py-1">
                    <span>
                      {dateHeure(p.created_at)} ·{" "}
                      <span
                        className={`text-xs rounded px-2 py-1 ${infoMode(p.mode_paiement).badge}`}
                      >
                        {infoMode(p.mode_paiement).label}
                      </span>
                    </span>
                    <span className="text-green-600">
                      + {format(p.montant)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </main>
  );
}
