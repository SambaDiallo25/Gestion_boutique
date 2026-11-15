export const MODES_PAIEMENT = [
  {
    valeur: "especes",
    label: "Espèces",
    badge: "bg-emerald-100 text-emerald-700",
  },
  { valeur: "wave", label: "Wave", badge: "bg-sky-100 text-sky-700" },
  {
    valeur: "orange_money",
    label: "Orange Money",
    badge: "bg-orange-100 text-orange-700",
  },
] as const;

export type ModePaiement = (typeof MODES_PAIEMENT)[number]["valeur"];

export function infoMode(valeur: string) {
  return MODES_PAIEMENT.find((m) => m.valeur === valeur) ?? MODES_PAIEMENT[0];
}
