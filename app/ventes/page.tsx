"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import CarteArticle from "../components/CarteArticle";
import FormulaireArticle from "../components/FormulaireArticle";
import Panier, { type LignePanier } from "../components/Panier";
import type { DonneesFacture } from "../components/FactureDocument";

type Article = { id: number; nom: string; prix: number; stock: number };

export default function PageVentes() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreurBase, setErreurBase] = useState("");
  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [message, setMessage] = useState("");
  const [derniereVente, setDerniereVente] = useState<DonneesFacture | null>(
    null,
  );
  const [generation, setGeneration] = useState(false);
  const [nomBoutique, setNomBoutique] = useState("Ma Boutique");

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("id");

      if (error) {
        setErreurBase(error.message);
      } else {
        setArticles(data ?? []);
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

  async function ajouterArticle(nom: string, prix: number) {
    const { data, error } = await supabase
      .from("articles")
      .insert({ nom, prix, stock: 10 })
      .select()
      .single();

    if (error) {
      setErreurBase(error.message);
      return;
    }
    setArticles([...articles, data]);
  }

  function ajouterAuPanier(article: Article) {
    const existe = panier.find((l) => l.articleId === article.id);
    if (existe) {
      setPanier(
        panier.map((l) =>
          l.articleId === article.id ? { ...l, quantite: l.quantite + 1 } : l,
        ),
      );
    } else {
      setPanier([
        ...panier,
        {
          articleId: article.id,
          nom: article.nom,
          prix: article.prix,
          quantite: 1,
        },
      ]);
    }
    setMessage("");
    setDerniereVente(null);
  }

  function changerQuantite(nom: string, delta: number) {
    setPanier(
      panier
        .map((l) =>
          l.nom === nom ? { ...l, quantite: l.quantite + delta } : l,
        )
        .filter((l) => l.quantite > 0),
    );
  }

  async function validerVente(client: string, total: number) {
    setErreurBase("");

    const { data: vente, error } = await supabase
      .from("ventes")
      .insert({ client_nom: client, total })
      .select()
      .single();

    if (error) {
      setErreurBase(error.message);
      return;
    }

    const lignes = panier.map((l) => ({
      vente_id: vente.id,
      article_nom: l.nom,
      prix: l.prix,
      quantite: l.quantite,
    }));
    const { error: errLignes } = await supabase
      .from("lignes_vente")
      .insert(lignes);

    if (errLignes) {
      setErreurBase(errLignes.message);
      return;
    }

    for (const l of panier) {
      const article = articles.find((a) => a.id === l.articleId);
      if (!article) continue;
      await supabase
        .from("articles")
        .update({ stock: Math.max(0, article.stock - l.quantite) })
        .eq("id", l.articleId);
    }

    setArticles(
      articles.map((a) => {
        const ligne = panier.find((l) => l.articleId === a.id);
        return ligne
          ? { ...a, stock: Math.max(0, a.stock - ligne.quantite) }
          : a;
      }),
    );

    setDerniereVente({
      boutique: nomBoutique,
      numero: vente.id,
      client,
      date: new Date(vente.created_at).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      }),
      total,
      lignes: panier.map((l) => ({
        nom: l.nom,
        prix: l.prix,
        quantite: l.quantite,
      })),
    });
    setMessage(
      `Vente n°${vente.id} enregistrée pour ${client} : ${total} FCFA`,
    );
    setPanier([]);
  }

  async function telechargerFacture() {
    if (!derniereVente) return;
    setGeneration(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { default: FactureDocument } =
        await import("../components/FactureDocument");
      const blob = await pdf(
        <FactureDocument donnees={derniereVente} />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `facture-${String(derniereVente.numero).padStart(4, "0")}.pdf`;
      lien.click();
      URL.revokeObjectURL(url);
    } catch {
      setErreurBase("Impossible de générer la facture.");
    } finally {
      setGeneration(false);
    }
  }

  return (
    <main className="p-8">
      <FormulaireArticle onAjouter={ajouterArticle} />

      {message && (
        <div className="mb-4 flex items-center gap-4">
          <p className="text-green-600 font-bold">{message}</p>
          {derniereVente && (
            <button
              className="bg-black text-white rounded px-3 py-2"
              onClick={telechargerFacture}
              disabled={generation}
            >
              {generation ? "Génération..." : "Télécharger la facture PDF"}
            </button>
          )}
        </div>
      )}
      {erreurBase && <p className="text-red-500 mb-4">Erreur : {erreurBase}</p>}
      {chargement && (
        <p className="text-gray-500 mb-4">Chargement des articles...</p>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 grid grid-cols-2 gap-4 content-start">
          {articles.map((a) => (
            <CarteArticle
              key={a.id}
              nom={a.nom}
              prix={a.prix}
              stock={a.stock}
              onAjouterAuPanier={() => ajouterAuPanier(a)}
            />
          ))}
        </div>
        <Panier
          lignes={panier}
          onChangerQuantite={changerQuantite}
          onValider={validerVente}
        />
      </div>
    </main>
  );
}
