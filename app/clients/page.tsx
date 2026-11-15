"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Vente = {
  id: number;
  client_nom: string;
  total: number;
  created_at: string;
};

type Client = {
  cle: string;
  nom: string;
  achats: number;
  total: number;
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

export default function PageClients() {
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [ouvert, setOuvert] = useState<string | null>(null);

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase
        .from("ventes")
        .select("id, client_nom, total, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) {
        setErreur(error.message);
      } else {
        setVentes(data ?? []);
      }
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
          derniere: v.created_at,
          ventes: [],
        };
      }
      const groupe = groupes[cle];
      groupe.achats += 1;
      groupe.total += v.total;
      groupe.ventes.push(v);
      if (new Date(v.created_at) > new Date(groupe.derniere)) {
        groupe.derniere = v.created_at;
      }
      return groupes;
    }, {}),
  ).sort((a, b) => b.total - a.total);

  const affiches = clients.filter((c) => c.cle.includes(cleClient(recherche)));
  const meilleur = clients[0];
  const chiffreAffaires = ventes.reduce((somme, v) => somme + v.total, 0);
  const panierMoyen =
    ventes.length > 0 ? Math.round(chiffreAffaires / ventes.length) : 0;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Clients</h1>

      {erreur && <p className="text-red-500 mb-4">Erreur : {erreur}</p>}
      {chargement && <p className="text-gray-500 mb-4">Chargement...</p>}

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border rounded-lg p-4 shadow">
          <p className="text-sm text-gray-500">Clients</p>
          <p className="text-2xl font-bold">{clients.length}</p>
        </div>
        <div className="border rounded-lg p-4 shadow">
          <p className="text-sm text-gray-500">Meilleur client</p>
          <p className="text-2xl font-bold">{meilleur ? meilleur.nom : "-"}</p>
          {meilleur && (
            <p className="text-sm text-gray-500">{format(meilleur.total)}</p>
          )}
        </div>
        <div className="border rounded-lg p-4 shadow">
          <p className="text-sm text-gray-500">Panier moyen</p>
          <p className="text-2xl font-bold">{format(panierMoyen)}</p>
        </div>
      </div>

      <input
        className="border rounded p-2 w-full max-w-sm mb-4"
        placeholder="Rechercher un client..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />

      {!chargement && affiches.length === 0 && (
        <p className="text-gray-500">Aucun client trouvé.</p>
      )}

      {affiches.map((c, index) => (
        <div key={c.cle} className="border rounded-lg p-4 shadow mb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-bold">
                {index + 1}. {c.nom}{" "}
                {c.achats >= SEUIL_FIDELE && (
                  <span className="text-xs bg-green-100 text-green-700 rounded px-2 py-1 ml-1">
                    Fidèle
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-500">
                {c.achats} achat(s) · dernière visite :{" "}
                {new Date(c.derniere).toLocaleString("fr-FR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-bold">{format(c.total)}</p>
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
                <div key={v.id} className="flex justify-between text-sm py-1">
                  <span>
                    Vente n°{v.id} ·{" "}
                    {new Date(v.created_at).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  <span>{format(v.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
