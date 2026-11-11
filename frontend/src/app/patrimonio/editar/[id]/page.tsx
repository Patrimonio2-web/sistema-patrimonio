// src/app/patrimonio/editar/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Wrapper } from "@/components";
import { toast, Toaster } from "react-hot-toast";
import { editarMobiliario, obtenerMobiliarioPorId } from "@/services/mobiliarioService";
import { obtenerAnexos, obtenerSubdependencias } from "@/services/anexosService";
import { obtenerClasesPorRubro } from "@/services/nomencladorService";
import { FormularioPatrimonio, Anexo, Subdependencia } from "@/types/types";
import PatrimonioForm from "@/components/Forms/PatrimonioForm";
import { isViewer } from "@/services/authRole";
import { normalizeReturnPath } from "@/lib/returnPath";

function normalizeResolucionTipo(value?: string | null) {
  const raw = (value ?? "").trim();
  const compact = raw.replace(/\./g, "").replace(/\s+/g, "").toUpperCase();

  if (compact === "PSA") return "PSA";
  if (compact === "SL") return "SL";
  if (compact === "PSL") return "PSL";
  if (compact === "DECRETO") return "Decreto";
  return raw;
}

function parseResolucion(value?: string | null) {
  const cleaned = (value ?? "")
    .replace(/Resol\s*N/i, "")
    .trim()
    .replace(/^[^0-9A-Za-z]+/, "")
    .trim();

  if (!cleaned) return { numero: "", tipo: "" };

  const [numero = "", ...tipoParts] = cleaned.split(/\s+/);
  return {
    numero,
    tipo: normalizeResolucionTipo(tipoParts.join(" ")),
  };
}

export default function EditarMobiliarioPage() {
  const [initialData, setInitialData] = useState<FormularioPatrimonio | null>(null);
  const [loading, setLoading] = useState(false);
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = params?.id?.toString();
  const redirect = normalizeReturnPath(searchParams.get("redirect"));

  useEffect(() => {
    if (isViewer()) {
      toast.error("No tenes permisos para acceder a esta seccion.");
      router.replace("/Home");
    }
  }, [router]);

  useEffect(() => {
    if (!id || isViewer()) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await obtenerMobiliarioPorId(id);

        // ---- Resolver anexo y subdependencia por nombre ----
        const anexos: Anexo[] = await obtenerAnexos();
        const anexoEncontrado = anexos.find((a) => a.nombre === data.anexo);

        let subdependenciaEncontradaId = "";
        if (anexoEncontrado) {
          const subdependencias: Subdependencia[] = await obtenerSubdependencias(anexoEncontrado.id);
          const subdepEncontrada = subdependencias.find((s) => s.nombre === data.subdependencia);
          subdependenciaEncontradaId = subdepEncontrada ? subdepEncontrada.id.toString() : "";
        }

        // ---- Resolver rubro / clase (texto + IDs) ----
        const rubroNombre: string = data.rubro || "";
        let idRubro: number | undefined = data.rubro_id || data.id_rubro || undefined;

        let claseNombre: string = data.clase || data.clase_bien || "";
        const idClase: number | undefined = data.clase_bien_id || data.id_clase || undefined;

        // Si no viene el nombre de la clase pero si rubro + id_clase, buscar descripcion
        if ((!claseNombre || claseNombre.trim() === "") && idRubro && idClase) {
          try {
            const clases = await obtenerClasesPorRubro(idRubro);
            const clase = clases.find((c) => c.id_clase === idClase);
            if (clase) {
              claseNombre = clase.descripcion;
              idRubro = clase.id_rubro;
            }
          } catch (e) {
            console.error("Error al cargar clases para rubro", idRubro, e);
          }
        }

        // ---- Resolver valor como string ----
        const valorStr =
          data.valor !== undefined && data.valor !== null && !Number.isNaN(Number(data.valor))
            ? String(Number(data.valor))
            : "";
        const resolucion = parseResolucion(data.resolucion);

        setInitialData({
          id: data.id,
          rubro: rubroNombre || "",
          clase: claseNombre || "",
          id_rubro: idRubro,
          id_clase: idClase,
          anexo: anexoEncontrado ? anexoEncontrado.id.toString() : "",
          subdependencia: subdependenciaEncontradaId,
          descripcion: data.descripcion || "",
          resolucionNumero: resolucion.numero,
          resolucionTipo: resolucion.tipo,
          fechaResolucion: data.fecha_resolucion || "",
          estado: data.estado_conservacion || "",
          comentarios: data.comentarios || "",
          vehiculo: data.vehiculo || "",
          foto_url: data.foto_url || "",
          foto_url_2: data.foto_url_2 || "",
          valor: valorStr,
          opciones: {
            noDado: !!data.no_dado,
            reparacion: !!data.para_reparacion,
            paraBaja: !!data.para_baja,
            faltante: !!data.faltante,
            sobrante: !!data.sobrante,
            etiqueta: !!data.problema_etiqueta,
            privado: !!data.privado,
          },
        });
      } catch (e) {
        console.error(e);
        toast.error("Error al cargar el mobiliario");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSubmit = async (form: FormularioPatrimonio): Promise<boolean> => {
    try {
      if (isViewer()) {
        toast.error("No autorizado: tu usuario es de solo lectura.");
        return false;
      }
      setLoading(true);

      const rawValor = form.valor?.trim() ?? "";
      const parsedValor =
        rawValor === ""
          ? null
          : Number(
              rawValor.includes(",")
                ? rawValor.replace(/\./g, "").replace(/,/g, ".").replace(/\s+/g, "")
                : rawValor.replace(/\s+/g, "")
            );

      if (!form.subdependencia || !form.id_rubro || !form.id_clase) {
        toast.error("Falta Anexo/Subdependencia o Rubro/Clase para guardar.");
        return false;
      }

      if (rawValor !== "" && Number.isNaN(parsedValor)) {
        toast.error("El valor ingresado no es válido.");
        return false;
      }

      await editarMobiliario(form.id, {
        ubicacion_id: form.subdependencia ? Number(form.subdependencia) : undefined,
        clase_bien_id: form.id_clase || undefined,
        rubro_id: form.id_rubro || undefined,
        descripcion: form.descripcion || undefined,
        resolucion_numero: form.resolucionNumero || undefined,
        resolucion_tipo: form.resolucionTipo || undefined,
        fecha_resolucion: form.fechaResolucion || undefined,
        estado_conservacion: form.estado || null,
        comentarios: form.comentarios?.trim() ?? "",
        vehiculo: form.vehiculo?.trim() || null,
        foto_url: form.foto_url || "",
        foto_url_2: form.foto_url_2 || "",
        no_dado: form.opciones.noDado,
        para_reparacion: form.opciones.reparacion,
        para_baja: form.opciones.paraBaja,
        faltante: form.opciones.faltante,
        sobrante: form.opciones.sobrante,
        problema_etiqueta: form.opciones.etiqueta,
        privado: form.opciones.privado,
        valor: parsedValor,
      });

      toast.success("Mobiliario actualizado correctamente");
      router.push(
        `/patrimonio/guardado/${encodeURIComponent(form.id)}?accion=editado&volver=${encodeURIComponent(redirect)}`
      );
      return true;
    } catch (e) {
      console.error(e);
      const msg = (e as Error)?.message || "";
      toast.error(
        msg.includes("solo lectura")
          ? "No autorizado: tu usuario es de solo lectura."
          : msg || "Error al guardar los cambios"
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  if (isViewer()) return null;

  return (
    <Wrapper>
      <main className="min-h-screen px-4 py-8">
        <Toaster />
        <h1 className="text-2xl font-bold text-center mb-6 text-slate-950 dark:text-white">Editar mobiliario</h1>
        {initialData && (
          <PatrimonioForm
            modo="editar"
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={() => router.push(redirect)}
            loading={loading}
          />
        )}
      </main>
    </Wrapper>
  );
}
