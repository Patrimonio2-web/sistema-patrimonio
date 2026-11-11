"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wrapper } from "@/components";
import PatrimonioForm from "@/components/Forms/PatrimonioForm";
import { createMobiliario, obtenerMobiliarioPorId } from "@/services/mobiliarioService";
import { obtenerAnexos, obtenerSubdependencias } from "@/services/anexosService";
import { FormularioPatrimonio, PatrimonioCreatePayload, Anexo, Subdependencia } from "@/types/types";
import { toast, Toaster } from "react-hot-toast";
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

export default function CrearPatrimonioPage() {
  const [submitting, setSubmitting] = useState(false);
  const [loadingClone, setLoadingClone] = useState(false);
  const [cloneInitialData, setCloneInitialData] = useState<FormularioPatrimonio | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewer = isViewer();
  const cloneId = searchParams.get("clonar")?.trim() || "";
  const redirect = normalizeReturnPath(searchParams.get("redirect"));

  useEffect(() => {
    if (!cloneId || viewer) {
      setCloneInitialData(null);
      return;
    }

    let ignore = false;

    const fetchCloneData = async () => {
      setLoadingClone(true);
      try {
        const data = await obtenerMobiliarioPorId(cloneId);
        const anexos: Anexo[] = await obtenerAnexos();
        const dataWithExtras = data as typeof data & { id_anexo?: number | string | null };

        const anexoEncontrado = anexos.find((a) => a.nombre === data.anexo);
        const anexoId = dataWithExtras.id_anexo ?? anexoEncontrado?.id ?? "";

        let subdependenciaId = data.ubicacion_id ? String(data.ubicacion_id) : "";
        if (!subdependenciaId && anexoId) {
          const subs: Subdependencia[] = await obtenerSubdependencias(Number(anexoId));
          const sub = subs.find((s) => s.nombre === data.subdependencia);
          subdependenciaId = sub ? String(sub.id) : "";
        }

        const resolucion = parseResolucion(data.resolucion);
        const valorStr =
          data.valor !== undefined && data.valor !== null && !Number.isNaN(Number(data.valor))
            ? String(Number(data.valor))
            : "";

        if (ignore) return;

        setCloneInitialData({
          id: "",
          anexo: anexoId ? String(anexoId) : "",
          subdependencia: subdependenciaId,
          rubro: data.rubro || "",
          clase: data.clase || data.clase_bien || "",
          id_rubro: data.rubro_id || data.id_rubro,
          id_clase: data.clase_bien_id || data.id_clase,
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
      } catch (error) {
        console.error(error);
        toast.error("No se pudo cargar el mobiliario para duplicar.");
        setCloneInitialData(null);
      } finally {
        if (!ignore) setLoadingClone(false);
      }
    };

    fetchCloneData();

    return () => {
      ignore = true;
    };
  }, [cloneId, viewer]);

  // ⬇️ ahora devuelve Promise<boolean> para saber si fue exitoso
  const handleSubmit = async (form: FormularioPatrimonio): Promise<boolean> => {
    try {
      if (viewer) {
        toast.error("No autorizado: tu usuario es de solo lectura.");
        return false;
      }

      setSubmitting(true);

      if (!form.subdependencia || !form.id_rubro || !form.id_clase) {
        toast.error("Falta Anexo/Subdependencia o Rubro/Clase para guardar.");
        return false;
      }

      const payload: PatrimonioCreatePayload = {};

      if (form.id) payload.id = form.id;
      if (form.subdependencia) payload.ubicacion_id = Number(form.subdependencia);
      if (form.id_clase !== undefined) payload.clase_bien_id = form.id_clase;
      if (form.id_rubro !== undefined) payload.rubro_id = form.id_rubro;
      if (form.descripcion) payload.descripcion = form.descripcion;
      if (form.resolucionNumero) payload.resolucion_numero = form.resolucionNumero;
      if (form.resolucionTipo) payload.resolucion_tipo = form.resolucionTipo;
      if (form.fechaResolucion) payload.fecha_resolucion = form.fechaResolucion;
      if (form.estado) payload.estado_conservacion = form.estado;

      if (form.opciones.noDado) payload.no_dado = true;
      if (form.opciones.reparacion) payload.para_reparacion = true;
      if (form.opciones.paraBaja) payload.para_baja = true;
      if (form.opciones.faltante) payload.faltante = true;
      if (form.opciones.sobrante) payload.sobrante = true;
      if (form.opciones.etiqueta) payload.problema_etiqueta = true;

      if (form.comentarios) payload.comentarios = form.comentarios;
      if (form.vehiculo) payload.vehiculo = form.vehiculo;
      if (form.foto_url) payload.foto_url = form.foto_url;
      if (form.foto_url_2) payload.foto_url_2 = form.foto_url_2;

      if (form.valor) {
        const num = Number(
          form.valor.includes(",")
            ? form.valor.replace(/\./g, "").replace(/,/g, ".").replace(/\s+/g, "")
            : form.valor.replace(/\s+/g, "").trim()
        );
        if (Number.isNaN(num)) {
          toast.error("El valor ingresado no es válido.");
          return false;
        }
        payload.valor = num;
      }

      if (form.opciones.privado === true) payload.privado = true;

      const creado = await createMobiliario(payload);
      const createdId = String(creado.id_generado || creado.id || form.id || "");

      toast.success(
        cloneId
          ? "Copia creada correctamente. Podes guardar otra igual si lo necesitas."
          : "Registro creado correctamente."
      );
      if (!createdId) {
        toast.error("Se guardo, pero no se pudo abrir el detalle automaticamente.");
        return false;
      }

      router.push(
        `/patrimonio/guardado/${encodeURIComponent(createdId)}?accion=creado&volver=${encodeURIComponent(redirect)}`
      );

      return true; // ✅ éxito: se puede limpiar el formulario
    } catch (error) {
      const msg = (error as Error)?.message || "";
      toast.error(
        msg.includes("solo lectura")
          ? "No autorizado: tu usuario es de solo lectura."
          : msg || "Error al crear el mobiliario"
      );
      return false; // ❌ error: no limpiar
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Wrapper>
      <main className="min-h-screen px-4 py-8">
        <Toaster />

        <h1 className="text-2xl font-bold text-center mb-6 text-slate-950 dark:text-white">
          {cloneId ? "Duplicar mobiliario" : "Registrar nuevo mobiliario"}
        </h1>

        {cloneId && (
          <div className="mb-4 rounded-md border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-900 dark:border-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-100">
            Duplicando el mobiliario ID {cloneId}. El nuevo registro se guardara sin copiar el ID.
          </div>
        )}

        {viewer && (
          <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-200 px-4 py-3">
            Modo solo lectura: tu usuario no puede crear registros.
          </div>
        )}

        <div className="relative">
          {viewer && (
            <div
              className="absolute inset-0 z-10 bg-transparent cursor-not-allowed"
              aria-hidden="true"
              title="Solo lectura: no podés crear registros."
            />
          )}

          <PatrimonioForm
            modo="crear"
            initialData={cloneInitialData ?? undefined}
            onSubmit={handleSubmit}       // ahora espera boolean
            onCancel={() => router.push(redirect)}
            resetOnSuccess={!cloneId}
            loading={submitting || loadingClone}          // deshabilita botón mientras envía
          />
        </div>

        {!viewer && submitting && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Enviando...
          </p>
        )}
      </main>
    </Wrapper>
  );
}
