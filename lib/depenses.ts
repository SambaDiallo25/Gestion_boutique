export const CATEGORIES_DEPENSE = [
  { valeur: "charge", label: "Charge", badge: "bg-slate-100 text-slate-700" },
  {
    valeur: "achat_stock",
    label: "Achat de marchandises",
    badge: "bg-sky-100 text-sky-700",
  },
] as const;

export type CategorieDepense = (typeof CATEGORIES_DEPENSE)[number]["valeur"];

export function infoCategorie(valeur: string) {
  return (
    CATEGORIES_DEPENSE.find((c) => c.valeur === valeur) ?? CATEGORIES_DEPENSE[0]
  );
}
