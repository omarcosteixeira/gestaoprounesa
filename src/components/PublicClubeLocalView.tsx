import React, { useState, useEffect } from "react";
import { ClubeLocalView } from "./ClubeLocalView";
import { ClubeParceiro, ClubeResgate } from "../types";
import { db, COLLECTIONS } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

interface Props {
  onToast: (msg: string, type?: "success" | "error") => void;
}

export function PublicClubeLocalView({ onToast }: Props) {
  const [parceiros, setParceiros] = useState<ClubeParceiro[]>([]);
  const [resgates, setResgates] = useState<ClubeResgate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubParceiros = onSnapshot(
      collection(db, COLLECTIONS.CLUBE_PARCEIROS),
      (snap) => {
        setParceiros(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClubeParceiro));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    const unsubResgates = onSnapshot(
      collection(db, COLLECTIONS.CLUBE_RESGATES),
      (snap) => {
        setResgates(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClubeResgate));
      },
      (err) => console.error(err)
    );

    return () => {
      unsubParceiros();
      unsubResgates();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 font-bold animate-pulse">Carregando Clube Local...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ClubeLocalView 
        parceiros={parceiros}
        resgates={resgates}
        profile={null}
        onToast={onToast}
      />
    </div>
  );
}
