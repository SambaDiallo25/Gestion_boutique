"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Article = { id: number; nom: string; prix: number; stock: number };

const SEUIL_STOCK_BAS = 5;

function format(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

export default function PageArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");

  const [nom, setNom] = useState("");
  const [prix, setPrix] = useState("");
  const [stock, setStock] = useState("");

  const [enEdition, setEnEdition] = useState<number | null>(null);
  const [editNom, setEditNom] = useState("");
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
    if (Number(prix) <= 0) {
      setErreur("Entre un prix supérieur à 0.");
      return;
    }
    if (stock === "" || Number(stock) < 0) {
      setErreur("Entre un stock (0 ou plus).");
      return;
    }

    const { data, error } = await supabase
      .from("articles")
      .insert({ nom: nom.trim(), prix: Number(prix), stock: Number(stock) })
      .select()
      .single();

    if (error) {
      setErreur(error.message);
      return;
    }
    setArticles([...articles, data]);
    setNom("");
    setPrix("");
    setStock("");
    setErreur("");
  }

  function commencerEdition(a: Article) {
    setEnEdition(a.id);
    setEditNom(a.nom);
    setEditPrix(String(a.prix));
    setEditStock(String(a.stock));
    setErreur("");
  }

  async function enregistrer(id: number) {
    if (editNom.trim() === "") {
      setErreur("Le nom ne peut pas être vide.");
      return;
    }
    if (Number(editPrix) <= 0) {
      setErreur("Entre un prix supérieur à 0.");
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
        prix: Number(editPrix),
        stock: Number(editStock),
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

  return (
    <main className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">Articles</h1>

      {nbStockBas > 0 && (
        <p className="bg-orange-100 text-orange-800 rounded p-3 mb-4">
          Attention : {nbStockBas} article(s) en stock bas (moins de{" "}
          {SEUIL_STOCK_BAS}).
        </p>
      )}
      {erreur && <p className="text-red-500 mb-4">Erreur : {erreur}</p>}

      <div className="card mb-6">
        <h2 className="font-bold mb-2">Nouvel article</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="border rounded p-2 flex-1"
            placeholder="Nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
          <input
            className="border rounded p-2 w-36"
            type="number"
            placeholder="Prix (FCFA)"
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

      <div className="overflow-x-auto"><table className="w-full text-left min-w-[560px]">
        <thead>
          <tr className="border-b text-sm text-gray-500">
            <th className="py-2">Nom</th>
            <th>Prix</th>
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
                    value={editPrix}
                    onChange={(e) => setEditPrix(e.target.value)}
                  />
                </td>
                <td className="pr-2">
                  <input
                    className="border rounded p-1 w-20"
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                  />
                </td>
                <td className="text-right">
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
                <td>{format(a.prix)}</td>
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
                <td className="text-right">
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
      </table></div>
    </main>
  );
}
