"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import Navbar from "./Navbar";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setPret(true);
    });

    const { data: abonnement } = supabase.auth.onAuthStateChange(
      (_evenement, nouvelleSession) => {
        setSession(nouvelleSession);
      },
    );

    return () => abonnement.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (pret && !session && pathname !== "/connexion") {
      router.replace("/connexion");
    }
  }, [pret, session, pathname, router]);

  if (!pret) return <p className="p-8 text-slate-500">Chargement...</p>;
  if (pathname === "/connexion") return <>{children}</>;
  if (!session) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Navbar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
