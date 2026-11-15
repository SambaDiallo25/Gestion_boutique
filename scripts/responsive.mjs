import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// [texte à chercher, texte de remplacement]
const remplacements = [
  // Marges plus petites sur téléphone
  ['className="p-8', 'className="p-4 md:p-8'],

  // Les grilles s'empilent sur téléphone
  ["grid grid-cols-4 gap-4", "grid grid-cols-2 lg:grid-cols-4 gap-4"],
  ["grid grid-cols-3 gap-4", "grid grid-cols-1 sm:grid-cols-3 gap-4"],
  ["grid grid-cols-3 gap-6", "grid grid-cols-1 lg:grid-cols-3 gap-6"],
  [
    "grid grid-cols-2 gap-4 content-start",
    "grid grid-cols-1 sm:grid-cols-2 gap-4 content-start",
  ],
  ["grid grid-cols-2 gap-6", "grid grid-cols-1 md:grid-cols-2 gap-6"],
  ["col-span-2", "lg:col-span-2"],

  // Les lignes avec boutons passent à la ligne si elles manquent de place
  [
    "flex items-center justify-between gap-4",
    "flex flex-wrap items-center justify-between gap-3",
  ],
  ['"flex items-center gap-3"', '"flex flex-wrap items-center gap-3"'],
  ['"flex gap-2"', '"flex flex-wrap gap-2"'],
  [
    "flex items-center justify-between mb-6",
    "flex flex-wrap items-center justify-between gap-3 mb-6",
  ],
  ["flex items-center gap-4 mb-4", "flex flex-wrap items-center gap-4 mb-4"],
  ["mb-4 flex items-center gap-4", "mb-4 flex flex-wrap items-center gap-4"],
  [
    "flex items-baseline justify-between mb-6",
    "flex flex-wrap items-baseline justify-between gap-2 mb-6",
  ],
  [
    "flex items-baseline justify-between mb-2",
    "flex flex-wrap items-baseline justify-between gap-1 mb-2",
  ],
  [
    "flex items-baseline justify-between mb-3",
    "flex flex-wrap items-baseline justify-between gap-1 mb-3",
  ],

  // Les gros montants des cartes sont plus petits sur téléphone
  [
    "text-2xl font-bold text-",
    "text-base sm:text-xl lg:text-2xl font-bold text-",
  ],
  ['text-2xl font-bold">{', 'text-base sm:text-xl lg:text-2xl font-bold">{'],
  [': "text-2xl font-bold"', ': "text-base sm:text-xl lg:text-2xl font-bold"'],

  // Graphique : axe vertical compact (1800k au lieu de 1 800 000)
  ["width={95}", "width={50}"],
  [
    'tickFormatter={(n: number) => n.toLocaleString("fr-FR")}',
    'tickFormatter={(n: number) => (n >= 1000 ? Math.round(n / 1000) + "k" : String(n))}',
  ],

  // Le tableau des articles défile sur le côté s'il est trop large
  [
    '<table className="w-full text-left">',
    '<div className="overflow-x-auto"><table className="w-full text-left min-w-[560px]">',
  ],
  ["</table>", "</table></div>"],

  // Carte de la page de connexion
  ["border rounded-lg p-6 shadow", "card"],
];

const fichiers = readdirSync("app", { recursive: true }).filter((f) =>
  String(f).endsWith(".tsx"),
);

let modifies = 0;

for (const f of fichiers) {
  const chemin = join("app", String(f));
  const avant = readFileSync(chemin, "utf8");
  let texte = avant;

  for (const [cherche, remplace] of remplacements) {
    if (texte.includes(remplace)) continue; // déjà appliqué : on ne le refait pas
    texte = texte.split(cherche).join(remplace);
  }

  if (texte !== avant) {
    writeFileSync(chemin, texte);
    console.log("modifié :", chemin);
    modifies++;
  }
}

console.log(`${modifies} fichier(s) modifié(s)`);
