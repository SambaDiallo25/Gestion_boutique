"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { envoyerParWhatsApp } from "../../lib/whatsapp";
import { infoMode, type ModePaiement } from "../../lib/paiements";
import CarteArticle from "../components/CarteArticle";
import Panier, { type LignePanier } from "../components/Panier";
import type { DonneesFacture } from "../components/FactureDocument";
import Link from "next/link";
type Article = {
  id: number;
  nom: string;
  prix: number;
  prix_achat: number;
  stock: number;
};

export default function PageVentes() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreurBase, setErreurBase] = useState("");
  const [alerte, setAlerte] = useState("");
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

  function ajouterAuPanier(article: Article) {
    const existe = panier.find((l) => l.articleId === article.id);
    const dejaDansPanier = existe ? existe.quantite : 0;

    if (dejaDansPanier >= article.stock) {
      setAlerte(
        `Stock insuffisant : il ne reste que ${article.stock} « ${article.nom} ».`,
      );
      return;
    }

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
          stock: article.stock,
        },
      ]);
    }
    setAlerte(
      article.prix_achat > 0 && article.prix < article.prix_achat
        ? `Attention : « ${article.nom} » se vend moins cher qu'il ne coûte (perte de ${article.prix_achat - article.prix} FCFA par unité).`
        : "",
    );
    setMessage("");
    setDerniereVente(null);
  }

  function changerQuantite(nom: string, delta: number) {
    const ligne = panier.find((l) => l.nom === nom);
    if (!ligne) return;

    if (delta > 0 && ligne.quantite + delta > ligne.stock) {
      setAlerte(
        `Stock insuffisant : il ne reste que ${ligne.stock} « ${nom} ».`,
      );
      return;
    }

    setAlerte("");
    setPanier(
      panier
        .map((l) =>
          l.nom === nom ? { ...l, quantite: l.quantite + delta } : l,
        )
        .filter((l) => l.quantite > 0),
    );
  }

  async function validerVente(
    client: string,
    total: number,
    mode: ModePaiement,
    montantPaye: number,
  ) {
    setErreurBase("");
    setAlerte("");

    // 1. Relire le stock réel dans la base avant de vendre
    const ids = panier.map((l) => l.articleId);
    const { data: stocksData, error: errStock } = await supabase
      .from("articles")
      .select("id, nom, stock, prix_achat")
      .in("id", ids);

    if (errStock) {
      setErreurBase(errStock.message);
      return;
    }
    const stocks = stocksData ?? [];

    const insuffisants = panier.filter((l) => {
      const reel = stocks.find((s) => s.id === l.articleId);
      return !reel || reel.stock < l.quantite;
    });

    if (insuffisants.length > 0) {
      const { data: frais } = await supabase
        .from("articles")
        .select("*")
        .order("id");
      if (frais) setArticles(frais);

      setPanier([]);
      setAlerte(
        `Stock insuffisant pour : ${insuffisants.map((l) => l.nom).join(", ")}. ` +
          "Le stock a été actualisé, refais ton panier.",
      );
      return;
    }

    // 2. Enregistrer la vente
    const { data: vente, error } = await supabase
      .from("ventes")
      .insert({ client_nom: client, total, mode_paiement: mode })
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
      cout_unitaire: stocks.find((s) => s.id === l.articleId)?.prix_achat ?? 0,
    }));
    const { error: errLignes } = await supabase
      .from("lignes_vente")
      .insert(lignes);

    if (errLignes) {
      setErreurBase(errLignes.message);
      return;
    }

    // 3. Enregistrer le paiement (s'il y a eu un versement)
    if (montantPaye > 0) {
      const { error: errPaiement } = await supabase.from("paiements").insert({
        vente_id: vente.id,
        montant: montantPaye,
        mode_paiement: mode,
      });

      if (errPaiement) {
        setErreurBase(errPaiement.message);
        return;
      }
    }

    // 4. Diminuer le stock à partir du stock réel
    for (const l of panier) {
      const reel = stocks.find((s) => s.id === l.articleId);
      if (!reel) continue;
      await supabase
        .from("articles")
        .update({ stock: Math.max(0, reel.stock - l.quantite) })
        .eq("id", l.articleId);
    }

    setArticles(
      articles.map((a) => {
        const ligne = panier.find((l) => l.articleId === a.id);
        if (!ligne) return a;
        const reel = stocks.find((s) => s.id === a.id);
        return {
          ...a,
          stock: Math.max(0, (reel ? reel.stock : a.stock) - ligne.quantite),
        };
      }),
    );

    const reste = total - montantPaye;

    setDerniereVente({
      boutique: nomBoutique,
      numero: vente.id,
      client,
      date: new Date(vente.created_at).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      }),
      total,
      modePaiement: montantPaye > 0 ? infoMode(mode).label : undefined,
      paye: montantPaye,
      reste,
      lignes: panier.map((l) => ({
        nom: l.nom,
        prix: l.prix,
        quantite: l.quantite,
      })),
    });
    setMessage(
      `Vente n°${vente.id} enregistrée pour ${client} : ${total} FCFA` +
        (reste > 0
          ? ` — reste à payer : ${reste} FCFA`
          : ` (${infoMode(mode).label})`),
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
    <main className="p-4 md:p-8">
      {message && (
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <p className="text-green-600 font-bold">{message}</p>
          {derniereVente && (
            <>
              <button
                className="bg-black text-white rounded px-3 py-2"
                onClick={telechargerFacture}
                disabled={generation}
              >
                {generation ? "Génération..." : "Télécharger la facture PDF"}
              </button>
              <button
                className="bg-emerald-600 text-white rounded px-3 py-2"
                onClick={() => envoyerParWhatsApp(derniereVente)}
              >
                Envoyer par WhatsApp
              </button>
            </>
          )}
        </div>
      )}
      {alerte && (
        <p className="bg-orange-100 text-orange-800 rounded-lg p-3 mb-4">
          {alerte}
        </p>
      )}
      {erreurBase && <p className="text-red-500 mb-4">Erreur : {erreurBase}</p>}
      {chargement && (
        <p className="text-gray-500 mb-4">Chargement des articles...</p>
      )}
      {!chargement && articles.length === 0 && (
        <div className="card mb-4 text-center">
          <p className="font-medium">Aucun article en vente.</p>
          <p className="text-sm text-gray-500 mb-3">
            Ajoute tes articles dans la page Articles, avec leur prix dachat et
            leur stock.
          </p>
          <Link
            href="/articles"
            className="bg-black text-white rounded px-4 py-2 text-sm inline-block"
          >
            Aller aux articles
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
          {articles.map((a) => (
            <CarteArticle
              key={a.id}
              nom={a.nom}
              prix={a.prix}
              stock={a.stock}
              quantiteDansPanier={
                panier.find((l) => l.articleId === a.id)?.quantite ?? 0
              }
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
