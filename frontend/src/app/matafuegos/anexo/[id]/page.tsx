"use client";

import { useParams } from "next/navigation";
import MatafuegosPanel from "../../MatafuegosPanel";

export default function MatafuegosAnexoPage() {
  const params = useParams();
  const rawId = params?.id;
  const idAnexo = Number(Array.isArray(rawId) ? rawId[0] : rawId);

  return <MatafuegosPanel idAnexo={idAnexo} />;
}
