"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Article = {
  id: number;
  nom: string;
  prix: number;
  prix_achat: number;
  stock: number;
};

const SEUIL_STOCK_BAS = 5;

function format(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function marge(a: Article) {
  return a.prix - a.prix_achat;
}

function taux(a: Article) {
  return a.prix > 0 ? Math.round((marge(a) / a.prix) * 100) : 0;
}

export default function PageArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");

  const [nom, setNom] = useState("");
  const [prixAchat, setPrixAchat] = useState("");
  const [prix, setPrix] = useState("");
  const [stock, setStock] = useState("");

  const [enEdition, setEnEdition] = useState<number | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editPrixAchat, setEditPrixAchat] = useState("");
  const [editPrix, setEditPrix] = useState("");
  const [editStock, setEditStock] = useState("");

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("nom");

      if (error) {
        setErreur(error.message);
      } else {
        setArticles(data ?? []);
      }
      setChargement(false);
    }
    charger();
  }, []);

  async function ajouter() {
    if (nom.trim() === "") {
      setErreur("Entre le nom de l'article.");
      return;
    }
    if (prixAchat === "" || Number(prixAchat) < 0) {
      setErreur("Entre le prix d'achat (0 si tu ne le connais pas encore).");
      return;
    }
    if (Number(prix) <= 0) {
      setErreur("Entre un prix de vente supérieur à 0.");
      return;
    }
    if (stock === "" || Number(stock) < 0) {
      setErreur("Entre un stock (0 ou plus).");
      return;
    }

    const { data, error } = await supabase
      .from("articles")
      .insert({
        nom: nom.trim(),
        prix_achat: Math.floor(Number(prixAchat)),
        prix: Math.floor(Number(prix)),
        stock: Math.floor(Number(stock)),
      })
      .select()
      .single();

    if (error) {
      setErreur(error.message);
      return;
    }
    setArticles([...articles, data]);
    setNom("");
    setPrixAchat("");
    setPrix("");
    setStock("");
    setErreur("");
  }

  function commencerEdition(a: Article) {
    setEnEdition(a.id);
    setEditNom(a.nom);
    setEditPrixAchat(String(a.prix_achat));
    setEditPrix(String(a.prix));
    setEditStock(String(a.stock));
    setErreur("");
  }

  async function enregistrer(id: number) {
    if (editNom.trim() === "") {
      setErreur("Le nom ne peut pas être vide.");
      return;
    }
    if (editPrixAchat === "" || Number(editPrixAchat) < 0) {
      setErreur("Entre le prix d'achat (0 si inconnu).");
      return;
    }
    if (Number(editPrix) <= 0) {
      setErreur("Entre un prix de vente supérieur à 0.");
      return;
    }
    if (editStock === "" || Number(editStock) < 0) {
      setErreur("Entre un stock (0 ou plus).");
      return;
    }

    const { data, error } = await supabase
      .from("articles")
      .update({
        nom: editNom.trim(),
        prix_achat: Math.floor(Number(editPrixAchat)),
        prix: Math.floor(Number(editPrix)),
        stock: Math.floor(Number(editStock)),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      setErreur(error.message);
      return;
    }
    setArticles(articles.map((a) => (a.id === id ? data : a)));
    setEnEdition(null);
    setErreur("");
  }

  async function supprimer(a: Article) {
    if (!window.confirm(`Supprimer « ${a.nom} » ?`)) return;

    const { error } = await supabase.from("articles").delete().eq("id", a.id);
    if (error) {
      setErreur(error.message);
      return;
    }
    setArticles(articles.filter((x) => x.id !== a.id));
  }

  const affiches = articles.filter((a) =>
    a.nom.toLowerCase().includes(recherche.toLowerCase()),
  );
  const nbStockBas = articles.filter((a) => a.stock < SEUIL_STOCK_BAS).length;
  const sansPrixAchat = articles.filter((a) => a.prix_achat === 0).length;
  const aPerte = articles.filter((a) => a.prix_achat > a.prix).length;

  const valeurAchat = articles.reduce(
    (somme, a) => somme + a.stock * a.prix_achat,
    0,
  );
  const valeurVente = articles.reduce(
    (somme, a) => somme + a.stock * a.prix,
    0,
  );
  const margePotentielle = valeurVente - valeurAchat;

  return (
    <main className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">Articles</h1>

      {nbStockBas > 0 && (
        <p className="bg-orange-100 text-orange-800 rounded-lg p-3 mb-3">
          Attention : {nbStockBas} article(s) en stock bas (moins de{" "}
          {SEUIL_STOCK_BAS}).
        </p>
      )}
      {sansPrixAchat > 0 && (
        <p className="bg-sky-50 text-sky-800 rounded-lg p-3 mb-3">
          {sansPrixAchat} article(s) sans prix dachat : leur marge est
          surestimée. Clique sur « Modifier » pour le renseigner.
        </p>
      )}
      {aPerte > 0 && (
        <p className="bg-red-50 text-red-700 rounded-lg p-3 mb-3">
          {aPerte} article(s) se vendent moins cher quils ne coûtent : vérifie
          leurs prix.
        </p>
      )}
      {erreur && <p className="text-red-500 mb-4">Erreur : {erreur}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-500">
            Valeur du stock (au prix dachat)
          </p>
          <p className="text-base sm:text-xl lg:text-2xl font-bold">
            {format(valeurAchat)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Valeur de vente du stock</p>
          <p className="text-base sm:text-xl lg:text-2xl font-bold">
            {format(valeurVente)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Marge potentielle</p>
          <p
            className={
              margePotentielle < 0
                ? "text-base sm:text-xl lg:text-2xl font-bold text-red-500"
                : "text-base sm:text-xl lg:text-2xl font-bold text-green-600"
            }
          >
            {format(margePotentielle)}
          </p>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="font-bold mb-2">Nouvel article</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="border rounded p-2 flex-1 min-w-40"
            placeholder="Nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
          <input
            className="border rounded p-2 w-36"
            type="number"
            placeholder="Prix d'achat"
            value={prixAchat}
            onChange={(e) => setPrixAchat(e.target.value)}
          />
          <input
            className="border rounded p-2 w-36"
            type="number"
            placeholder="Prix de vente"
            value={prix}
            onChange={(e) => setPrix(e.target.value)}
          />
          <input
            className="border rounded p-2 w-28"
            type="number"
            placeholder="Stock"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
          <button
            className="bg-black text-white rounded px-4"
            onClick={ajouter}
          >
            Ajouter
          </button>
        </div>
      </div>

      <input
        className="border rounded p-2 w-full max-w-sm mb-4"
        placeholder="Rechercher un article..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />

      {chargement && <p className="text-gray-500">Chargement...</p>}
      {!chargement && affiches.length === 0 && (
        <p className="text-gray-500">Aucun article trouvé.</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[780px]">
          <thead>
            <tr className="border-b text-sm text-gray-500">
              <th className="py-2">Nom</th>
              <th>Prix dachat</th>
              <th>Prix de vente</th>
              <th>Marge</th>
              <th>Stock</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {affiches.map((a) =>
              enEdition === a.id ? (
                <tr key={a.id} className="border-b">
                  <td className="py-2 pr-2">
                    <input
                      className="border rounded p-1 w-full"
                      value={editNom}
                      onChange={(e) => setEditNom(e.target.value)}
                    />
                  </td>
                  <td className="pr-2">
                    <input
                      className="border rounded p-1 w-28"
                      type="number"
                      value={editPrixAchat}
                      onChange={(e) => setEditPrixAchat(e.target.value)}
                    />
                  </td>
                  <td className="pr-2">
                    <input
                      className="border rounded p-1 w-28"
                      type="number"
                      value={editPrix}
                      onChange={(e) => setEditPrix(e.target.value)}
                    />
                  </td>
                  <td className="text-sm text-gray-500">
                    {Number(editPrix) - Number(editPrixAchat)} FCFA
                  </td>
                  <td className="pr-2">
                    <input
                      className="border rounded p-1 w-20"
                      type="number"
                      value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                    />
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button
                      className="bg-black text-white rounded px-3 py-1 mr-2"
                      onClick={() => enregistrer(a.id)}
                    >
                      Enregistrer
                    </button>
                    <button
                      className="border rounded px-3 py-1"
                      onClick={() => setEnEdition(null)}
                    >
                      Annuler
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={a.id} className="border-b">
                  <td className="py-2">{a.nom}</td>
                  <td>
                    {a.prix_achat === 0 ? (
                      <span className="text-gray-400">-</span>
                    ) : (
                      format(a.prix_achat)
                    )}
                  </td>
                  <td>{format(a.prix)}</td>
                  <td>
                    {a.prix_achat === 0 ? (
                      <span className="text-sky-600 text-sm">À renseigner</span>
                    ) : (
                      <span
                        className={
                          marge(a) < 0
                            ? "text-red-500 font-bold"
                            : "text-green-600 font-medium"
                        }
                      >
                        {format(marge(a))} ({taux(a)} %)
                      </span>
                    )}
                  </td>
                  <td
                    className={
                      a.stock < SEUIL_STOCK_BAS
                        ? "text-red-500 font-bold"
                        : "text-green-600"
                    }
                  >
                    {a.stock}
                    {a.stock < SEUIL_STOCK_BAS && " (bas)"}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button
                      className="border rounded px-3 py-1 mr-2"
                      onClick={() => commencerEdition(a)}
                    >
                      Modifier
                    </button>
                    <button
                      className="border border-red-300 text-red-500 rounded px-3 py-1"
                      onClick={() => supprimer(a)}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
