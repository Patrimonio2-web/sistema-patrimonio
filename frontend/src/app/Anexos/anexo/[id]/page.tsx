"use client";

import { useParams } from "next/navigation";
import AnexoDetallePage from "@/components/Anexos/AnexoDetallePage";

export default function GenericAnexoPage() {
  const params = useParams();
  const rawId = params?.id;
  const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);

  if (!Number.isSafeInteger(id) || id <= 0) return null;

  return <AnexoDetallePage anexoId={id} title={`Anexo ${id}`} />;
}
