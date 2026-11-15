type Props = {
  nom: string;
  prix: number;
  stock: number;
  quantiteDansPanier?: number;
  onAjouterAuPanier: () => void;
};

export default function CarteArticle({
  nom,
  prix,
  stock,
  quantiteDansPanier = 0,
  onAjouterAuPanier,
}: Props) {
  const disponible = stock - quantiteDansPanier;
  const rupture = stock <= 0;
  const limiteAtteinte = !rupture && disponible <= 0;

  return (
    <div className={`card ${rupture ? "opacity-60" : ""}`}>
      <h2 className="font-bold">{nom}</h2>
      <p>{prix} FCFA</p>
      <p className={stock < 5 ? "text-red-500" : "text-green-600"}>
        {rupture ? "Rupture de stock" : `Stock : ${stock}`}
      </p>
      {quantiteDansPanier > 0 && (
        <p className="text-sm text-slate-500">
          Dans le panier : {quantiteDansPanier}
        </p>
      )}
      <button
        className="mt-2 w-full bg-black text-white rounded p-2 disabled:bg-slate-300 disabled:text-slate-500"
        disabled={disponible <= 0}
        onClick={onAjouterAuPanier}
      >
        {rupture
          ? "Indisponible"
          : limiteAtteinte
            ? "Stock atteint"
            : "Ajouter au panier"}
      </button>
    </div>
  );
}
