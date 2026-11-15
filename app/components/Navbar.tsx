"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

const liens = [
  { href: "/", label: "Accueil" },
  { href: "/ventes", label: "Ventes" },
  { href: "/historique", label: "Historique" },
  { href: "/articles", label: "Articles" },
  { href: "/clients", label: "Clients" },
  { href: "/caisse", label: "Caisse" },
];

export default function Navbar() {
  const [nomBoutique, setNomBoutique] = useState("Ma Boutique");

  useEffect(() => {
    async function charger() {
      const { data } = await supabase
        .from("boutiques")
        .select("nom")
        .maybeSingle();
      if (data) setNomBoutique(data.nom);
    }
    charger();
  }, []);

  async function deconnecter() {
    await supabase.auth.signOut();
  }

  return (
    <nav className="flex items-center gap-6 border-b p-4">
      <span className="font-bold">{nomBoutique}</span>
      {liens.map((l) => (
        <Link key={l.href} href={l.href} className="hover:underline">
          {l.label}
        </Link>
      ))}
      <button
        className="ml-auto border rounded px-3 py-1"
        onClick={deconnecter}
      >
        Déconnexion
      </button>
    </nav>
  );
}
