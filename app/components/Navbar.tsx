"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const liens = [
  { href: "/", label: "Accueil", icone: LayoutDashboard },
  { href: "/ventes", label: "Ventes", icone: ShoppingCart },
  { href: "/historique", label: "Historique", icone: History },
  { href: "/articles", label: "Articles", icone: Package },
  { href: "/clients", label: "Clients", icone: Users },
  { href: "/caisse", label: "Caisse", icone: Wallet },
  { href: "/rapports", label: "Rapports", icone: FileText },
];

export default function Navbar() {
  const pathname = usePathname();
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
    <aside className="bg-white border-b md:border-b-0 md:border-r md:w-64 md:shrink-0 md:h-screen md:sticky md:top-0 flex flex-col">
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="bg-emerald-600 text-white rounded-lg w-9 h-9 flex items-center justify-center shrink-0">
          <Store size={20} />
        </div>
        <div className="min-w-0">
          <p className="font-bold truncate">{nomBoutique}</p>
          <p className="text-xs text-slate-500">Gestion de boutique</p>
        </div>
      </div>

      <nav className="flex md:flex-col gap-1 px-3 pb-3 overflow-x-auto md:overflow-visible">
        {liens.map((l) => {
          const actif =
            l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          const Icone = l.icone;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${
                actif
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icone size={18} />
              {l.label}
            </Link>
          );
        })}

        <button
          onClick={deconnecter}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-slate-600 hover:bg-slate-100 md:mt-4"
        >
          <LogOut size={18} />
          Déconnexion
        </button>
      </nav>
    </aside>
  );
}
