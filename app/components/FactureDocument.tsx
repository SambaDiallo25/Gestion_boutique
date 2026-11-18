import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export type LigneFacture = { nom: string; prix: number; quantite: number };

export type DonneesFacture = {
  boutique: string;
  numero: number;
  client: string;
  date: string;
  total: number;
  modePaiement?: string;
  paye?: number;
  reste?: number;
  lignes: LigneFacture[];
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  entete: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  boutique: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  titreFacture: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  infos: { marginBottom: 20 },
  ligne: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#dddddd",
    paddingVertical: 6,
  },
  gras: { fontFamily: "Helvetica-Bold" },
  colNom: { width: "40%" },
  colPrix: { width: "25%", textAlign: "right" },
  colQte: { width: "10%", textAlign: "right" },
  colTotal: { width: "25%", textAlign: "right" },
  total: {
    marginTop: 20,
    textAlign: "right",
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  pied: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 10,
    color: "#888888",
  },
});

function format(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
}

export default function FactureDocument({
  donnees,
}: {
  donnees: DonneesFacture;
}) {
  const numero = `F-${String(donnees.numero).padStart(4, "0")}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.entete}>
          <Text style={styles.boutique}>{donnees.boutique}</Text>
          <View>
            <Text style={styles.titreFacture}>FACTURE {numero}</Text>
            <Text style={{ textAlign: "right" }}>Date : {donnees.date}</Text>
          </View>
        </View>

        <View style={styles.infos}>
          <Text>Client : {donnees.client}</Text>
          {donnees.modePaiement && (
            <Text>Paiement : {donnees.modePaiement}</Text>
          )}
        </View>

        <View style={[styles.ligne, styles.gras]}>
          <Text style={styles.colNom}>Article</Text>
          <Text style={styles.colPrix}>Prix unit.</Text>
          <Text style={styles.colQte}>Qté</Text>
          <Text style={styles.colTotal}>Total</Text>
        </View>

        {donnees.lignes.map((l, i) => (
          <View key={i} style={styles.ligne}>
            <Text style={styles.colNom}>{l.nom}</Text>
            <Text style={styles.colPrix}>{format(l.prix)}</Text>
            <Text style={styles.colQte}>{l.quantite}</Text>
            <Text style={styles.colTotal}>{format(l.prix * l.quantite)}</Text>
          </View>
        ))}

        <Text style={styles.total}>TOTAL : {format(donnees.total)}</Text>

        {donnees.paye !== undefined && donnees.reste !== undefined && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ textAlign: "right" }}>
              Déjà payé : {format(donnees.paye)}
            </Text>
            {donnees.reste > 0 ? (
              <Text
                style={{
                  textAlign: "right",
                  fontFamily: "Helvetica-Bold",
                  color: "#c2410c",
                }}
              >
                Reste à payer : {format(donnees.reste)}
              </Text>
            ) : (
              <Text
                style={{
                  textAlign: "right",
                  fontFamily: "Helvetica-Bold",
                  color: "#15803d",
                }}
              >
                PAYÉ
              </Text>
            )}
          </View>
        )}

        <Text style={styles.pied}>Merci pour votre achat !</Text>
      </Page>
    </Document>
  );
}
