import ExcelJS from "exceljs";
import { MODES_PAIEMENT } from "./paiements";
import { infoCategorie } from "./depenses";

export type LigneVenteXls = {
  article_nom: string;
  prix: number;
  quantite: number;
  cout_unitaire: number;
};
export type VenteXls = {
  id: number;
  client_nom: string;
  total: number;
  created_at: string;
  lignes_vente: LigneVenteXls[];
  paiements: { montant: number }[];
};
export type PaiementXls = {
  id: number;
  vente_id: number;
  montant: number;
  mode_paiement: string;
  created_at: string;
  ventes: { client_nom: string } | null;
};
export type DepenseXls = {
  id: number;
  libelle: string;
  montant: number;
  categorie: string;
  created_at: string;
};
export type DonneesClasseur = {
  boutique: string;
  mois: string; // ex : "2026-11"
  libelleMois: string;
  ventes: VenteXls[];
  paiements: PaiementXls[];
  depenses: DepenseXls[];
};

// ---------- Styles ----------
const FCFA = '#,##0" FCFA";[Red]-#,##0" FCFA"';
const NOMBRE = "#,##0;[Red]-#,##0";
const DATE_HEURE = "dd/mm/yyyy hh:mm";
const DATE_JOUR = "dd/mm/yyyy";
const POURCENT = "0%";

const BORD: Partial<ExcelJS.Border> = {
  style: "thin",
  color: { argb: "FFE2E8F0" },
};
const CADRE: Partial<ExcelJS.Borders> = {
  top: BORD,
  left: BORD,
  bottom: BORD,
  right: BORD,
};

const FOND_MODE: Record<string, string> = {
  especes: "D1FAE5",
  wave: "E0F2FE",
  orange_money: "FFEDD5",
};

function fond(hex: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + hex } };
}

function argent(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
}

// Excel n'a pas de fuseau horaire : on convertit l'heure locale pour afficher la bonne heure
function enDateExcel(dateIso: string) {
  const d = new Date(dateIso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000);
}

function somme(nombres: number[]) {
  return nombres.reduce((total, n) => total + n, 0);
}

function lettre(colonne: number) {
  return String.fromCharCode(64 + colonne);
}

// ---------- Blocs de mise en page ----------
function bandeauTitre(
  ws: ExcelJS.Worksheet,
  colDebut: number,
  colFin: number,
  titre: string,
  sousTitre: string,
  couleur: string,
) {
  ws.getRow(1).height = 8;
  ws.mergeCells(2, colDebut, 2, colFin);
  ws.mergeCells(3, colDebut, 3, colFin);

  const t = ws.getCell(2, colDebut);
  t.value = titre;
  t.fill = fond(couleur);
  t.font = { size: 20, bold: true, color: { argb: "FFFFFFFF" } };
  t.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  const s = ws.getCell(3, colDebut);
  s.value = sousTitre;
  s.fill = fond(couleur);
  s.font = { size: 11, italic: true, color: { argb: "FFE2E8F0" } };
  s.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  ws.getRow(2).height = 36;
  ws.getRow(3).height = 22;
}

function bande(
  ws: ExcelJS.Worksheet,
  ligne: number,
  colDebut: number,
  colFin: number,
  texte: string,
  couleur: string,
) {
  ws.mergeCells(ligne, colDebut, ligne, colFin);
  const c = ws.getCell(ligne, colDebut);
  c.value = texte;
  c.fill = fond(couleur);
  c.font = { size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(ligne).height = 24;
}

function enteteTableau(
  ws: ExcelJS.Worksheet,
  ligne: number,
  colDebut: number,
  titres: string[],
  couleur: string,
) {
  titres.forEach((titre, i) => {
    const c = ws.getCell(ligne, colDebut + i);
    c.value = titre;
    c.fill = fond(couleur);
    c.font = { size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    c.border = CADRE;
  });
  ws.getRow(ligne).height = 26;
}

function ligneDonnees(
  ws: ExcelJS.Worksheet,
  ligne: number,
  colDebut: number,
  valeurs: ExcelJS.CellValue[],
  rang: number,
  teinte: string,
  formats: (string | undefined)[],
) {
  valeurs.forEach((valeur, i) => {
    const c = ws.getCell(ligne, colDebut + i);
    c.value = valeur;
    c.border = CADRE;
    c.font = { size: 11 };
    c.alignment = { vertical: "middle" };
    if (rang % 2 === 1) c.fill = fond(teinte);
    const format = formats[i];
    if (format) c.numFmt = format;
  });
  ws.getRow(ligne).height = 20;
}

function ligneTotal(
  ws: ExcelJS.Worksheet,
  ligne: number,
  colDebut: number,
  colFin: number,
  couleur: string,
) {
  for (let col = colDebut; col <= colFin; col++) {
    const c = ws.getCell(ligne, col);
    c.fill = fond(couleur);
    c.font = { size: 11, bold: true };
    c.border = {
      top: { style: "medium", color: { argb: "FF334155" } },
      bottom: BORD,
      left: BORD,
      right: BORD,
    };
  }
  ws.getRow(ligne).height = 22;
}

function carte(
  ws: ExcelJS.Worksheet,
  ligne: number,
  colDebut: number,
  label: string,
  valeur: number,
  sous: string,
  fondHex: string,
  texteHex: string,
) {
  for (let i = 0; i < 3; i++)
    ws.mergeCells(ligne + i, colDebut, ligne + i, colDebut + 1);
  ws.getRow(ligne).height = 22;
  ws.getRow(ligne + 1).height = 36;
  ws.getRow(ligne + 2).height = 20;

  const couleurTexte = { argb: "FF" + texteHex };

  const l = ws.getCell(ligne, colDebut);
  l.value = label;
  l.fill = fond(fondHex);
  l.font = { size: 10, bold: true, color: couleurTexte };
  l.alignment = { vertical: "bottom", horizontal: "left", indent: 1 };

  const v = ws.getCell(ligne + 1, colDebut);
  v.value = valeur;
  v.numFmt = FCFA;
  v.fill = fond(fondHex);
  v.font = { size: 18, bold: true, color: couleurTexte };
  v.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  const s = ws.getCell(ligne + 2, colDebut);
  s.value = sous;
  s.fill = fond(fondHex);
  s.font = { size: 9, italic: true, color: couleurTexte };
  s.alignment = { vertical: "top", horizontal: "left", indent: 1 };
}

type Colonne = { titre: string; largeur: number; format?: string };

function feuilleTableau(
  wb: ExcelJS.Workbook,
  nom: string,
  couleurOnglet: string,
  couleurEntete: string,
  teinte: string,
  sousTitre: string,
  colonnes: Colonne[],
  lignes: ExcelJS.CellValue[][],
  messageVide: string,
) {
  const ws = wb.addWorksheet(nom, {
    properties: { tabColor: { argb: "FF" + couleurOnglet } },
    views: [{ state: "frozen", ySplit: 5, showGridLines: false }],
  });
  ws.columns = colonnes.map((c) => ({ width: c.largeur }));

  bandeauTitre(ws, 1, colonnes.length, nom, sousTitre, "064E3B");
  enteteTableau(
    ws,
    5,
    1,
    colonnes.map((c) => c.titre),
    couleurEntete,
  );

  lignes.forEach((valeurs, i) => {
    ligneDonnees(
      ws,
      6 + i,
      1,
      valeurs,
      i,
      teinte,
      colonnes.map((c) => c.format),
    );
  });

  const fin = 5 + lignes.length;
  if (lignes.length === 0) {
    ws.getCell(6, 1).value = messageVide;
    ws.getCell(6, 1).font = { italic: true, color: { argb: "FF64748B" } };
  } else {
    ws.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: fin, column: colonnes.length },
    };
  }

  ws.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };

  return { ws, fin };
}

// ---------- Génération du classeur ----------
export async function genererClasseur(d: DonneesClasseur) {
  const wb = new ExcelJS.Workbook();
  wb.creator = d.boutique;
  wb.created = new Date();

  const maintenant = new Date().toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const sousTitre = `Rapport de ${d.libelleMois}  ·  généré le ${maintenant}`;

  // Calculs
  const payeVente = (v: VenteXls) => somme(v.paiements.map((p) => p.montant));
  const margeVente = (v: VenteXls) =>
    somme(v.lignes_vente.map((l) => (l.prix - l.cout_unitaire) * l.quantite));

  const ca = somme(d.ventes.map((v) => v.total));
  const encaisse = somme(d.paiements.map((p) => p.montant));
  const sorties = somme(d.depenses.map((x) => x.montant));
  const charges = somme(
    d.depenses.filter((x) => x.categorie === "charge").map((x) => x.montant),
  );
  const achats = sorties - charges;
  const margeBrute = somme(d.ventes.map(margeVente));
  const beneficeNet = margeBrute - charges;
  const tresorerie = encaisse - sorties;
  const resteMois = somme(
    d.ventes.map((v) => Math.max(0, v.total - payeVente(v))),
  );
  const tauxMarge = ca > 0 ? Math.round((margeBrute / ca) * 100) : 0;

  // =============== Feuille 1 : Tableau de bord ===============
  const wsD = wb.addWorksheet("Tableau de bord", {
    properties: { tabColor: { argb: "FF059669" } },
    views: [{ showGridLines: false }],
  });
  wsD.columns = [
    { width: 2 },
    ...Array.from({ length: 8 }, () => ({ width: 19 })),
    { width: 2 },
  ];
  bandeauTitre(wsD, 2, 9, d.boutique, sousTitre, "064E3B");
  wsD.getRow(4).height = 10;

  carte(
    wsD,
    5,
    2,
    "CHIFFRE D'AFFAIRES",
    ca,
    `${d.ventes.length} vente(s) ce mois`,
    "DBEAFE",
    "1E40AF",
  );
  carte(
    wsD,
    5,
    4,
    "ENCAISSÉ",
    encaisse,
    "Argent réellement reçu",
    "DCFCE7",
    "166534",
  );
  carte(
    wsD,
    5,
    6,
    "DÉPENSES",
    sorties,
    `dont achats de stock : ${argent(achats)}`,
    "FEE2E2",
    "991B1B",
  );
  carte(
    wsD,
    5,
    8,
    "TRÉSORERIE DU MOIS",
    tresorerie,
    "Encaissé − dépenses",
    "E2E8F0",
    "0F172A",
  );

  wsD.getRow(8).height = 10;

  carte(
    wsD,
    9,
    2,
    "MARGE BRUTE",
    margeBrute,
    `Taux de marge : ${tauxMarge} %`,
    "D1FAE5",
    "065F46",
  );
  carte(
    wsD,
    9,
    4,
    "CHARGES",
    charges,
    "Loyer, transport, électricité...",
    "FFEDD5",
    "9A3412",
  );
  carte(
    wsD,
    9,
    6,
    "BÉNÉFICE NET",
    beneficeNet,
    "Marge brute − charges",
    "047857",
    "FFFFFF",
  );
  carte(
    wsD,
    9,
    8,
    "RESTE À ENCAISSER",
    resteMois,
    "Ventes à crédit du mois",
    "FEF3C7",
    "92400E",
  );

  wsD.getRow(12).height = 12;

  // Encaissements par mode de paiement (colonnes B à D)
  bande(wsD, 13, 2, 4, "Encaissements par mode de paiement", "2563EB");
  enteteTableau(wsD, 14, 2, ["Mode", "Montant (FCFA)", "Part"], "3B82F6");
  const premiereLigneModes = 15;
  const derniereLigneModes = premiereLigneModes + MODES_PAIEMENT.length - 1;
  const ligneTotalModes = derniereLigneModes + 1;
  MODES_PAIEMENT.forEach((m, i) => {
    const r = premiereLigneModes + i;
    const montant = somme(
      d.paiements
        .filter((p) => p.mode_paiement === m.valeur)
        .map((p) => p.montant),
    );
    ligneDonnees(
      wsD,
      r,
      2,
      [
        m.label,
        montant,
        {
          formula: `IF(C$${ligneTotalModes}=0,0,C${r}/C$${ligneTotalModes})`,
          result: encaisse > 0 ? montant / encaisse : 0,
        },
      ],
      i,
      "EFF6FF",
      [undefined, NOMBRE, POURCENT],
    );
    wsD.getCell(r, 2).fill = fond(FOND_MODE[m.valeur] ?? "FFFFFF");
    wsD.getCell(r, 2).font = { size: 11, bold: true };
  });
  ligneTotal(wsD, ligneTotalModes, 2, 4, "DBEAFE");
  wsD.getCell(ligneTotalModes, 2).value = "TOTAL";
  wsD.getCell(ligneTotalModes, 3).value = {
    formula: `SUM(C${premiereLigneModes}:C${derniereLigneModes})`,
    result: encaisse,
  };
  wsD.getCell(ligneTotalModes, 3).numFmt = NOMBRE;
  wsD.getCell(ligneTotalModes, 4).value = {
    formula: `SUM(D${premiereLigneModes}:D${derniereLigneModes})`,
    result: encaisse > 0 ? 1 : 0,
  };
  wsD.getCell(ligneTotalModes, 4).numFmt = POURCENT;

  // Articles qui rapportent le plus (colonnes F à I)
  const parArticle: Record<
    string,
    { nom: string; quantite: number; montant: number; marge: number }
  > = {};
  d.ventes
    .flatMap((v) => v.lignes_vente)
    .forEach((l) => {
      const a = (parArticle[l.article_nom] ??= {
        nom: l.article_nom,
        quantite: 0,
        montant: 0,
        marge: 0,
      });
      a.quantite += l.quantite;
      a.montant += l.prix * l.quantite;
      a.marge += (l.prix - l.cout_unitaire) * l.quantite;
    });
  const topArticles = Object.values(parArticle)
    .sort((a, b) => b.marge - a.marge)
    .slice(0, 5);

  bande(wsD, 13, 6, 9, "Articles qui rapportent le plus", "EA580C");
  enteteTableau(
    wsD,
    14,
    6,
    ["Article", "Qté", "Ventes (FCFA)", "Marge (FCFA)"],
    "F97316",
  );
  if (topArticles.length === 0) {
    wsD.getCell(15, 6).value = "Aucune vente ce mois-ci.";
    wsD.getCell(15, 6).font = { italic: true, color: { argb: "FF64748B" } };
  }
  topArticles.forEach((a, i) => {
    ligneDonnees(
      wsD,
      15 + i,
      6,
      [a.nom, a.quantite, a.montant, a.marge],
      i,
      "FFF7ED",
      [undefined, "0", NOMBRE, NOMBRE],
    );
  });

  // Dépenses par type (colonnes F à I)
  bande(wsD, 21, 6, 9, "Dépenses par type", "DC2626");
  enteteTableau(
    wsD,
    22,
    6,
    ["Type", "Nombre", "Montant (FCFA)", "Part"],
    "EF4444",
  );
  const types = ["charge", "achat_stock"];
  types.forEach((type, i) => {
    const r = 23 + i;
    const liste = d.depenses.filter((x) => x.categorie === type);
    const montant = somme(liste.map((x) => x.montant));
    ligneDonnees(
      wsD,
      r,
      6,
      [
        infoCategorie(type).label,
        liste.length,
        montant,
        {
          formula: `IF(H$25=0,0,H${r}/H$25)`,
          result: sorties > 0 ? montant / sorties : 0,
        },
      ],
      i,
      "FEF2F2",
      [undefined, "0", NOMBRE, POURCENT],
    );
  });
  ligneTotal(wsD, 25, 6, 9, "FEE2E2");
  wsD.getCell(25, 6).value = "TOTAL";
  wsD.getCell(25, 7).value = {
    formula: "SUM(G23:G24)",
    result: d.depenses.length,
  };
  wsD.getCell(25, 8).value = { formula: "SUM(H23:H24)", result: sorties };
  wsD.getCell(25, 8).numFmt = NOMBRE;
  wsD.getCell(25, 9).value = {
    formula: "SUM(I23:I24)",
    result: sorties > 0 ? 1 : 0,
  };
  wsD.getCell(25, 9).numFmt = POURCENT;

  // Ventes par jour (colonnes B à D)
  const [annee, numeroMois] = d.mois.split("-").map(Number);
  const nbJours = new Date(annee, numeroMois, 0).getDate();
  bande(wsD, 21, 2, 4, "Ventes par jour", "059669");
  enteteTableau(
    wsD,
    22,
    2,
    ["Jour", "Ventes", "Chiffre d'affaires (FCFA)"],
    "10B981",
  );
  for (let i = 0; i < nbJours; i++) {
    const cle = `${d.mois}-${String(i + 1).padStart(2, "0")}`;
    const duJour = d.ventes.filter(
      (v) => new Date(v.created_at).toLocaleDateString("sv-SE") === cle,
    );
    ligneDonnees(
      wsD,
      23 + i,
      2,
      [
        new Date(Date.UTC(annee, numeroMois - 1, i + 1)),
        duJour.length,
        somme(duJour.map((v) => v.total)),
      ],
      i,
      "F0FDF4",
      [DATE_JOUR, "0", NOMBRE],
    );
    wsD.getCell(23 + i, 2).alignment = {
      horizontal: "left",
      vertical: "middle",
    };
  }
  const finJours = 22 + nbJours;
  ligneTotal(wsD, finJours + 1, 2, 4, "D1FAE5");
  wsD.getCell(finJours + 1, 2).value = "TOTAL";
  wsD.getCell(finJours + 1, 3).value = {
    formula: `SUM(C23:C${finJours})`,
    result: d.ventes.length,
  };
  wsD.getCell(finJours + 1, 4).value = {
    formula: `SUM(D23:D${finJours})`,
    result: ca,
  };
  wsD.getCell(finJours + 1, 4).numFmt = NOMBRE;

  wsD.pageSetup = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };

  // =============== Feuille 2 : Ventes ===============
  const { ws: wsV, fin: finV } = feuilleTableau(
    wb,
    "Ventes",
    "2563EB",
    "059669",
    "F0FDF4",
    sousTitre,
    [
      { titre: "N° vente", largeur: 10 },
      { titre: "Date", largeur: 18, format: DATE_HEURE },
      { titre: "Client", largeur: 22 },
      { titre: "Articles", largeur: 44 },
      { titre: "Total (FCFA)", largeur: 16, format: NOMBRE },
      { titre: "Payé (FCFA)", largeur: 16, format: NOMBRE },
      { titre: "Reste à payer (FCFA)", largeur: 18, format: NOMBRE },
      { titre: "Statut", largeur: 12 },
      { titre: "Marge brute (FCFA)", largeur: 18, format: NOMBRE },
    ],
    d.ventes.map((v, i) => {
      const r = 6 + i;
      const paye = payeVente(v);
      const reste = v.total - paye;
      const statut = reste <= 0 ? "Payé" : paye === 0 ? "Impayé" : "Partiel";
      return [
        v.id,
        enDateExcel(v.created_at),
        v.client_nom,
        v.lignes_vente
          .map((l) => `${l.article_nom} ×${l.quantite}`)
          .join("  ·  "),
        v.total,
        paye,
        { formula: `E${r}-F${r}`, result: reste },
        statut,
        margeVente(v),
      ];
    }),
    "Aucune vente ce mois-ci.",
  );
  d.ventes.forEach((v, i) => {
    const reste = v.total - payeVente(v);
    const paye = payeVente(v);
    const [fondHex, texteHex] =
      reste <= 0
        ? ["DCFCE7", "166534"]
        : paye === 0
          ? ["FEE2E2", "991B1B"]
          : ["FFEDD5", "9A3412"];
    const c = wsV.getCell(6 + i, 8);
    c.fill = fond(fondHex);
    c.font = { size: 11, bold: true, color: { argb: "FF" + texteHex } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  if (d.ventes.length > 0) {
    const t = finV + 2;
    ligneTotal(wsV, t, 1, 9, "D1FAE5");
    wsV.getCell(t, 3).value = "TOTAL";
    const totaux: [number, number][] = [
      [5, ca],
      [6, somme(d.ventes.map(payeVente))],
      [7, resteMois],
      [9, margeBrute],
    ];
    totaux.forEach(([col, valeur]) => {
      const c = wsV.getCell(t, col);
      c.value = {
        formula: `SUM(${lettre(col)}6:${lettre(col)}${finV})`,
        result: valeur,
      };
      c.numFmt = NOMBRE;
    });
  }

  // =============== Feuille 3 : Lignes de vente ===============
  const lignesDetail = d.ventes.flatMap((v) =>
    v.lignes_vente.map((l) => ({ v, l })),
  );
  const { ws: wsL, fin: finL } = feuilleTableau(
    wb,
    "Lignes de vente",
    "0D9488",
    "0D9488",
    "F0FDFA",
    sousTitre,
    [
      { titre: "N° vente", largeur: 10 },
      { titre: "Date", largeur: 18, format: DATE_HEURE },
      { titre: "Client", largeur: 22 },
      { titre: "Article", largeur: 28 },
      { titre: "Quantité", largeur: 11, format: "0" },
      { titre: "Prix unitaire (FCFA)", largeur: 18, format: NOMBRE },
      { titre: "Coût unitaire (FCFA)", largeur: 18, format: NOMBRE },
      { titre: "Total ligne (FCFA)", largeur: 18, format: NOMBRE },
      { titre: "Marge (FCFA)", largeur: 16, format: NOMBRE },
    ],
    lignesDetail.map(({ v, l }, i) => {
      const r = 6 + i;
      return [
        v.id,
        enDateExcel(v.created_at),
        v.client_nom,
        l.article_nom,
        l.quantite,
        l.prix,
        l.cout_unitaire,
        { formula: `E${r}*F${r}`, result: l.quantite * l.prix },
        {
          formula: `(F${r}-G${r})*E${r}`,
          result: (l.prix - l.cout_unitaire) * l.quantite,
        },
      ];
    }),
    "Aucune ligne de vente ce mois-ci.",
  );
  if (lignesDetail.length > 0) {
    const t = finL + 2;
    ligneTotal(wsL, t, 1, 9, "CCFBF1");
    wsL.getCell(t, 4).value = "TOTAL";
    const totaux: [number, number, string][] = [
      [5, somme(lignesDetail.map(({ l }) => l.quantite)), "0"],
      [8, somme(lignesDetail.map(({ l }) => l.quantite * l.prix)), NOMBRE],
      [
        9,
        somme(
          lignesDetail.map(({ l }) => (l.prix - l.cout_unitaire) * l.quantite),
        ),
        NOMBRE,
      ],
    ];
    totaux.forEach(([col, valeur, format]) => {
      const c = wsL.getCell(t, col);
      c.value = {
        formula: `SUM(${lettre(col)}6:${lettre(col)}${finL})`,
        result: valeur,
      };
      c.numFmt = format;
    });
  }

  // =============== Feuille 4 : Paiements ===============
  const { ws: wsP, fin: finP } = feuilleTableau(
    wb,
    "Paiements",
    "7C3AED",
    "2563EB",
    "EFF6FF",
    sousTitre,
    [
      { titre: "N° vente", largeur: 10 },
      { titre: "Date", largeur: 18, format: DATE_HEURE },
      { titre: "Client", largeur: 24 },
      { titre: "Mode de paiement", largeur: 20 },
      { titre: "Montant (FCFA)", largeur: 18, format: NOMBRE },
    ],
    d.paiements.map((p) => [
      p.vente_id,
      enDateExcel(p.created_at),
      p.ventes?.client_nom ?? "",
      MODES_PAIEMENT.find((m) => m.valeur === p.mode_paiement)?.label ??
        p.mode_paiement,
      p.montant,
    ]),
    "Aucun paiement ce mois-ci.",
  );
  d.paiements.forEach((p, i) => {
    const c = wsP.getCell(6 + i, 4);
    c.fill = fond(FOND_MODE[p.mode_paiement] ?? "FFFFFF");
    c.font = { size: 11, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  if (d.paiements.length > 0) {
    const t = finP + 2;
    ligneTotal(wsP, t, 1, 5, "DBEAFE");
    wsP.getCell(t, 4).value = "TOTAL";
    wsP.getCell(t, 5).value = { formula: `SUM(E6:E${finP})`, result: encaisse };
    wsP.getCell(t, 5).numFmt = NOMBRE;
    MODES_PAIEMENT.forEach((m, i) => {
      const r = t + 1 + i;
      const montant = somme(
        d.paiements
          .filter((p) => p.mode_paiement === m.valeur)
          .map((p) => p.montant),
      );
      wsP.getCell(r, 4).value = `dont ${m.label}`;
      wsP.getCell(r, 4).font = { italic: true, color: { argb: "FF475569" } };
      wsP.getCell(r, 4).alignment = { horizontal: "right" };
      wsP.getCell(r, 5).value = {
        formula: `SUMIF($D$6:$D$${finP},"${m.label}",$E$6:$E$${finP})`,
        result: montant,
      };
      wsP.getCell(r, 5).numFmt = NOMBRE;
    });
  }

  // =============== Feuille 5 : Dépenses ===============
  const { ws: wsE, fin: finE } = feuilleTableau(
    wb,
    "Dépenses",
    "EA580C",
    "EA580C",
    "FFF7ED",
    sousTitre,
    [
      { titre: "Date", largeur: 18, format: DATE_HEURE },
      { titre: "Libellé", largeur: 38 },
      { titre: "Type", largeur: 24 },
      { titre: "Montant (FCFA)", largeur: 18, format: NOMBRE },
    ],
    d.depenses.map((x) => [
      enDateExcel(x.created_at),
      x.libelle,
      infoCategorie(x.categorie).label,
      x.montant,
    ]),
    "Aucune dépense ce mois-ci.",
  );
  d.depenses.forEach((x, i) => {
    const c = wsE.getCell(6 + i, 3);
    c.fill = fond(x.categorie === "charge" ? "F1F5F9" : "E0F2FE");
    c.font = { size: 11, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  if (d.depenses.length > 0) {
    const t = finE + 2;
    ligneTotal(wsE, t, 1, 4, "FFEDD5");
    wsE.getCell(t, 3).value = "TOTAL";
    wsE.getCell(t, 4).value = { formula: `SUM(D6:D${finE})`, result: sorties };
    wsE.getCell(t, 4).numFmt = NOMBRE;
    [
      { label: infoCategorie("charge").label, montant: charges },
      { label: infoCategorie("achat_stock").label, montant: achats },
    ].forEach((ligne, i) => {
      const r = t + 1 + i;
      wsE.getCell(r, 3).value = `dont ${ligne.label}`;
      wsE.getCell(r, 3).font = { italic: true, color: { argb: "FF475569" } };
      wsE.getCell(r, 3).alignment = { horizontal: "right" };
      wsE.getCell(r, 4).value = {
        formula: `SUMIF($C$6:$C$${finE},"${ligne.label}",$D$6:$D$${finE})`,
        result: ligne.montant,
      };
      wsE.getCell(r, 4).numFmt = NOMBRE;
    });
  }

  // ---------- Téléchargement ----------
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `rapport-${d.mois}.xlsx`;
  lien.click();
  URL.revokeObjectURL(url);
}
