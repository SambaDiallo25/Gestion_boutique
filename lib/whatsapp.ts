import type { DonneesFacture } from "../app/components/FactureDocument";

function format(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
}

function ouvrirWhatsApp(message: string) {
  const saisie = window.prompt(
    "Numéro WhatsApp du client (ex : 77 123 45 67).\nLaisse vide pour choisir le contact dans WhatsApp.",
  );
  if (saisie === null) return; // l'utilisateur a annulé

  let chiffres = saisie.replace(/\D/g, "");
  if (chiffres.length === 9) chiffres = "221" + chiffres; // numéro sénégalais sans indicatif

  const base = chiffres ? `https://wa.me/${chiffres}` : "https://wa.me/";
  window.open(`${base}?text=${encodeURIComponent(message)}`, "_blank");
}

export function messageFacture(d: DonneesFacture) {
  const numero = `F-${String(d.numero).padStart(4, "0")}`;
  const lignes = d.lignes
    .map((l) => `• ${l.nom} × ${l.quantite} : ${format(l.prix * l.quantite)}`)
    .join("\n");
  const paiement = d.modePaiement ? `Paiement : ${d.modePaiement}\n` : "";

  let solde = "";
  if (d.paye !== undefined && d.reste !== undefined) {
    solde =
      d.reste > 0
        ? `Déjà payé : ${format(d.paye)}\n*Reste à payer : ${format(d.reste)}*\n`
        : `*Payé en totalité*\n`;
  }

  return (
    `*${d.boutique}*\n` +
    `Facture ${numero} du ${d.date}\n` +
    `Client : ${d.client}\n` +
    paiement +
    `\n${lignes}\n\n` +
    `*Total : ${format(d.total)}*\n` +
    solde +
    `\nMerci pour votre achat !`
  );
}

export function envoyerParWhatsApp(d: DonneesFacture) {
  ouvrirWhatsApp(messageFacture(d));
}

export function relancerParWhatsApp(
  boutique: string,
  client: string,
  montant: number,
) {
  ouvrirWhatsApp(
    `Bonjour ${client},\n\n` +
      `Petit rappel de *${boutique}* : il vous reste *${format(montant)}* à régler.\n\n` +
      `Merci et bonne journée !`,
  );
}
