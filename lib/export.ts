function echapper(valeur: string | number) {
  let texte = String(valeur ?? "");

  // Protection : Excel exécute une cellule qui commence par = + - @ comme une formule
  if (typeof valeur === "string" && /^[=+\-@]/.test(texte)) {
    texte = "'" + texte;
  }

  // Une cellule qui contient ; " ou un retour à la ligne doit être entourée de guillemets
  if (/[";\n\r]/.test(texte)) {
    texte = `"${texte.replace(/"/g, '""')}"`;
  }
  return texte;
}

export function telechargerCsv(
  nomFichier: string,
  entetes: string[],
  lignes: (string | number)[][],
) {
  const contenu = [entetes, ...lignes]
    .map((ligne) => ligne.map(echapper).join(";"))
    .join("\r\n");

  // Le \uFEFF au début permet à Excel de lire correctement les accents
  const blob = new Blob(["\uFEFF" + contenu], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  lien.click();
  URL.revokeObjectURL(url);
}
