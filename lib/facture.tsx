import type { DonneesFacture } from "../app/components/FactureDocument";

export async function telechargerFacture(donnees: DonneesFacture) {
  const { pdf } = await import("@react-pdf/renderer");
  const { default: FactureDocument } =
    await import("../app/components/FactureDocument");
  const blob = await pdf(<FactureDocument donnees={donnees} />).toBlob();

  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `facture-${String(donnees.numero).padStart(4, "0")}.pdf`;
  lien.click();
  URL.revokeObjectURL(url);
}
