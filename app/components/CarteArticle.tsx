type Props = {
  nom: string;
  prix: number;
  stock: number;
  onAjouterAuPanier: () => void;
};

export default function CarteArticle({
  nom,
  prix,
  stock,
  onAjouterAuPanier,
}: Props) {
  return (
    <div className="card">
      <h2 className="font-bold">{nom}</h2>
      <p>{prix} FCFA</p>
      <p className={stock < 5 ? "text-red-500" : "text-green-600"}>
        Stock : {stock}
      </p>
      <button
        className="mt-2 w-full bg-black text-white rounded p-2"
        onClick={onAjouterAuPanier}
      >
        Ajouter au panier
      </button>
    </div>
  );
}
