"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { relancerParWhatsApp } from "../../lib/whatsapp";

type Vente = {
  id: number;
  client_nom: string;
  total: number;
  created_at: string;
  paiements: { montant: number }[];
};

type Client = {
  cle: string;
  nom: string;
  achats: number;
  total: number;
  dette: number;
  derniere: string;
  ventes: Vente[];
};

const SEUIL_FIDELE = 3;

function format(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function cleClient(nom: string) {
  return nom
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resteVente(v: Vente) {
  const paye = v.paiements.reduce((somme, p) => somme + p.montant, 0);
  return Math.max(0, v.total - paye);
}

function dateHeure(dateIso: string) {
  return new Date(dateIso).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function PageClients() {
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [nomBoutique, setNomBoutique] = useState("Ma Boutique");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [seulementDebiteurs, setSeulementDebiteurs] = useState(false);
  const [ouvert, setOuvert] = useState<string | null>(null);

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase
        .from("ventes")
        .select("id, client_nom, total, created_at, paiements(montant)")
        .order("created_at", { ascending: false })
        .limit(1000);

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

  const clients: Client[] = Object.values(
    ventes.reduce<Record<string, Client>>((groupes, v) => {
      const cle = cleClient(v.client_nom);
      if (!groupes[cle]) {
        groupes[cle] = {
          cle,
          nom: v.client_nom.trim(),
          achats: 0,
          total: 0,
          dette: 0,
          derniere: v.created_at,
          ventes: [],
        };
      }
      const groupe = groupes[cle];
      groupe.achats += 1;
      groupe.total += v.total;
      groupe.dette += resteVente(v);
      groupe.ventes.push(v);
      if (new Date(v.created_at) > new Date(groupe.derniere)) {
        groupe.derniere = v.created_at;
      }
      return groupes;
    }, {}),
  ).sort((a, b) => b.total - a.total);

  const affiches = clients
    .filter((c) => c.cle.includes(cleClient(recherche)))
    .filter((c) => !seulementDebiteurs || c.dette > 0)
    .sort((a, b) =>
      seulementDebiteurs ? b.dette - a.dette : b.total - a.total,
    );

  const meilleur = clients[0];
  const chiffreAffaires = ventes.reduce((somme, v) => somme + v.total, 0);
  const panierMoyen =
    ventes.length > 0 ? Math.round(chiffreAffaires / ventes.length) : 0;
  const totalDettes = clients.reduce((somme, c) => somme + c.dette, 0);
  const nbDebiteurs = clients.filter((c) => c.dette > 0).length;

  return (
    <main className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">Clients</h1>

      {erreur && <p className="text-red-500 mb-4">Erreur : {erreur}</p>}
      {chargement && <p className="text-gray-500 mb-4">Chargement...</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-gray-500">Clients</p>
          <p className="text-base sm:text-xl lg:text-2xl font-bold">
            {clients.length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Meilleur client</p>
          <p className="text-base sm:text-xl lg:text-2xl font-bold">
            {meilleur ? meilleur.nom : "-"}
          </p>
          {meilleur && (
            <p className="text-xs text-gray-500">{format(meilleur.total)}</p>
          )}
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Panier moyen</p>
          <p className="text-base sm:text-xl lg:text-2xl font-bold">
            {format(panierMoyen)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Dettes clients</p>
          <p
            className={
              totalDettes > 0
                ? "text-base sm:text-xl lg:text-2xl font-bold text-orange-600"
                : "text-base sm:text-xl lg:text-2xl font-bold"
            }
          >
            {format(totalDettes)}
          </p>
          <p className="text-xs text-gray-500">
            {nbDebiteurs} client(s) concerné(s)
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <input
          className="border rounded p-2 w-full max-w-sm"
          placeholder="Rechercher un client..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={seulementDebiteurs}
            onChange={(e) => setSeulementDebiteurs(e.target.checked)}
          />
          Seulement ceux qui doivent
        </label>
      </div>

      {!chargement && affiches.length === 0 && (
        <p className="text-gray-500">Aucun client trouvé.</p>
      )}

      {affiches.map((c, index) => (
        <div key={c.cle} className="card mb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold">
                {index + 1}. {c.nom}{" "}
                {c.achats >= SEUIL_FIDELE && (
                  <span className="text-xs bg-green-100 text-green-700 rounded px-2 py-1 ml-1">
                    Fidèle
                  </span>
                )}
                {c.dette > 0 && (
                  <span className="text-xs bg-orange-100 text-orange-700 rounded px-2 py-1 ml-1">
                    Doit {format(c.dette)}
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-500">
                {c.achats} achat(s) · dernière visite le {dateHeure(c.derniere)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-bold">{format(c.total)}</p>
              {c.dette > 0 && (
                <button
                  className="bg-emerald-600 text-white rounded px-3 py-1"
                  onClick={() =>
                    relancerParWhatsApp(nomBoutique, c.nom, c.dette)
                  }
                >
                  Relancer
                </button>
              )}
              <button
                className="border rounded px-3 py-1"
                onClick={() => setOuvert(ouvert === c.cle ? null : c.cle)}
              >
                {ouvert === c.cle ? "Masquer" : "Détails"}
              </button>
            </div>
          </div>

          {ouvert === c.cle && (
            <div className="mt-3 border-t pt-3">
              {c.ventes.map((v) => (
                <div
                  key={v.id}
                  className="flex justify-between gap-2 text-sm py-1"
                >
                  <span>
                    Vente n°{v.id} · {dateHeure(v.created_at)}
                  </span>
                  <span>
                    {format(v.total)}
                    {resteVente(v) > 0 && (
                      <span className="text-orange-600 font-medium">
                        {" "}
                        (reste {format(resteVente(v))})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
