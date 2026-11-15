import type { DonneesFacture } from "../app/components/FactureDocument";

function format(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
}

export function messageFacture(d: DonneesFacture) {
  const numero = `F-${String(d.numero).padStart(4, "0")}`;
  const lignes = d.lignes
    .map((l) => `• ${l.nom} × ${l.quantite} : ${format(l.prix * l.quantite)}`)
    .join("\n");

  return (
    `*${d.boutique}*\n` +
    `Facture ${numero} du ${d.date}\n` +
    `Client : ${d.client}\n\n` +
    `${lignes}\n\n` +
    `*Total : ${format(d.total)}*\n\n` +
    `Merci pour votre achat !`
  );
}

export function envoyerParWhatsApp(d: DonneesFacture) {
  const saisie = window.prompt(
    "Numéro WhatsApp du client (ex : 77 123 45 67).\nLaisse vide pour choisir le contact dans WhatsApp.",
  );
  if (saisie === null) return; // l'utilisateur a annulé

  let chiffres = saisie.replace(/\D/g, "");
  if (chiffres.length === 9) chiffres = "221" + chiffres; // numéro sénégalais sans indicatif

  const base = chiffres ? `https://wa.me/${chiffres}` : "https://wa.me/";
  window.open(
    `${base}?text=${encodeURIComponent(messageFacture(d))}`,
    "_blank",
  );
}
