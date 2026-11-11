"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  Inbox,
  Loader2,
  MapPin,
  MessageSquareText,
  RefreshCw,
  Save,
  Search,
  UserRound,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { Wrapper } from "@/components";
import {
  actualizarConsultaPublica,
  listarConsultasPublicas,
  type ConsultaPublica,
  type ConsultaPublicaEstado,
  type ConsultaPublicaResumen,
} from "@/services/consultasPublicasService";

const EMPTY_SUMMARY: ConsultaPublicaResumen = {
  pendiente: 0,
  en_revision: 0,
  resuelta: 0,
  total: 0,
};

const STATUS_META: Record<ConsultaPublicaEstado, { label: string; classes: string }> = {
  pendiente: {
    label: "Pendiente",
    classes: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100",
  },
  en_revision: {
    label: "En revision",
    classes: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
  },
  resuelta: {
    label: "Resuelta",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
  },
};

const FILTERS: Array<{ value: "todas" | ConsultaPublicaEstado; label: string }> = [
  { value: "todas", label: "Todas" },
  { value: "pendiente", label: "Pendientes" },
  { value: "en_revision", label: "En revision" },
  { value: "resuelta", label: "Resueltas" },
];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function safeHttpUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function StatusBadge({ status }: { status: ConsultaPublicaEstado }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-black uppercase ${meta.classes}`}>
      {meta.label}
    </span>
  );
}

export default function ConsultasPublicasPage() {
  const [items, setItems] = useState<ConsultaPublica[]>([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"todas" | ConsultaPublicaEstado>("todas");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId]
  );
  const selectedPageUrl = safeHttpUrl(selected?.pagina_origen);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listarConsultasPublicas({
        estado: filter === "todas" ? undefined : filter,
        q: search,
      });
      setItems(data.consultas);
      setSummary(data.resumen);
      setSelectedId((current) =>
        data.consultas.some((item) => item.id === current)
          ? current
          : data.consultas[0]?.id ?? null
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar las consultas.");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const timer = window.setTimeout(load, search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  useEffect(() => setNote(selected?.nota_interna ?? ""), [selected?.id, selected?.nota_interna]);

  const update = async (status: ConsultaPublicaEstado) => {
    if (!selected || saving) return;
    try {
      setSaving(true);
      const updated = await actualizarConsultaPublica(selected.id, {
        estado: status,
        nota_interna: note.trim(),
      });
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
      window.dispatchEvent(new Event("consultas-publicas:updated"));
      toast.success(status === "resuelta" ? "Consulta resuelta." : "Seguimiento guardado.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la consulta.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Wrapper>
      <Toaster position="top-center" />
      <main className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-cyan-700 dark:text-cyan-300">Atencion al publico</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Consultas recibidas</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Mensajes enviados desde el asistente de los inventarios publicos.</p>
          </div>
          <button type="button" onClick={load} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:border-cyan-500 hover:text-cyan-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </button>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["total", "Total", summary.total, Inbox],
            ["pendiente", "Pendientes", summary.pendiente, MessageSquareText],
            ["en_revision", "En revision", summary.en_revision, Clock3],
            ["resuelta", "Resueltas", summary.resuelta, CheckCircle2],
          ].map(([key, label, value, Icon]) => {
            const MetricIcon = Icon as typeof Inbox;
            return (
              <button key={String(key)} type="button" onClick={() => setFilter(key === "total" ? "todas" : key as ConsultaPublicaEstado)} className="flex min-h-24 items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-cyan-500 dark:border-slate-800 dark:bg-slate-950">
                <span><span className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{String(label)}</span><span className="mt-1 block text-2xl font-black text-slate-950 dark:text-white">{String(value)}</span></span>
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-200"><MetricIcon className="h-5 w-5" /></span>
              </button>
            );
          })}
        </section>

        <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`h-9 rounded-md px-3 text-xs font-black ${filter === item.value ? "bg-cyan-700 text-white" : "border border-slate-300 text-slate-600 hover:border-cyan-500 dark:border-slate-700 dark:text-slate-300"}`}>{item.label}</button>)}
            </div>
            <label className="relative block w-full lg:max-w-md">
              <span className="sr-only">Buscar consultas</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por persona, anexo, oficina o consulta" className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 outline-none focus:border-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
            </label>
          </div>

          <div className="grid min-h-[34rem] lg:grid-cols-[minmax(19rem,0.8fr)_minmax(0,1.5fr)]">
            <aside className="border-b border-slate-200 dark:border-slate-800 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between px-4 py-3"><h2 className="text-sm font-black text-slate-950 dark:text-white">Bandeja</h2><span className="text-xs font-bold text-slate-500">{items.length} resultados</span></div>
              <div className="max-h-[30rem] overflow-y-auto border-t border-slate-200 dark:border-slate-800 lg:max-h-[42rem]">
                {loading && !items.length ? <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm font-bold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Cargando...</div> : items.length ? items.map((item) => (
                  <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`block w-full border-b border-slate-200 px-4 py-4 text-left dark:border-slate-800 ${selected?.id === item.id ? "bg-cyan-50 dark:bg-cyan-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-900"}`}>
                    <div className="flex items-start justify-between gap-3"><p className="line-clamp-1 text-sm font-black text-slate-950 dark:text-white">{item.nombre_apellido}</p><StatusBadge status={item.estado} /></div>
                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-slate-300">{item.consulta}</p>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500"><span className="truncate">{item.anexo} - {item.oficina}</span><span className="shrink-0">#{item.id}</span></div>
                  </button>
                )) : <div className="px-5 py-16 text-center"><Inbox className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">No hay consultas para este filtro</p></div>}
              </div>
            </aside>

            <div className="min-w-0 p-4 sm:p-6">
              {selected ? <article>
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={selected.estado} /><span className="text-xs font-bold text-slate-500">Caso #{selected.id}</span></div><h2 className="mt-3 break-words text-xl font-black text-slate-950 dark:text-white">{selected.nombre_apellido}</h2><p className="mt-1 text-xs font-semibold text-slate-500">Recibida el {formatDate(selected.fecha_creacion)}</p></div>
                  {selectedPageUrl && <a href={selectedPageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:border-cyan-500 hover:text-cyan-700 dark:border-slate-700 dark:text-slate-200">Ver pagina publica <ExternalLink className="h-4 w-4" /></a>}
                </div>
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"><dt className="flex items-center gap-2 text-xs font-black uppercase text-slate-500"><UserRound className="h-4 w-4" /> Persona</dt><dd className="mt-2 break-words text-sm font-bold text-slate-950 dark:text-white">{selected.nombre_apellido}</dd></div>
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"><dt className="flex items-center gap-2 text-xs font-black uppercase text-slate-500"><MapPin className="h-4 w-4" /> Ubicacion</dt><dd className="mt-2 break-words text-sm font-bold text-slate-950 dark:text-white">{selected.anexo} - {selected.oficina}</dd></div>
                </dl>
                <section className="mt-5 border-y border-slate-200 py-5 dark:border-slate-800"><h3 className="text-xs font-black uppercase text-slate-500">Consulta</h3><p className="mt-3 whitespace-pre-wrap break-words text-base leading-7 text-slate-800 dark:text-slate-100">{selected.consulta}</p></section>
                <label className="mt-5 block text-xs font-black uppercase text-slate-600 dark:text-slate-300">Nota interna<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={2000} placeholder="Registra aqui el seguimiento realizado por el equipo." className="mt-2 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-medium normal-case text-slate-950 outline-none focus:border-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
                {selected.atendido_por && <p className="mt-2 text-xs font-semibold text-slate-500">Ultima gestion: {selected.atendido_por} - {formatDate(selected.fecha_actualizacion)}</p>}
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" onClick={() => update(selected.estado)} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold text-slate-700 hover:border-cyan-500 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"><Save className="h-4 w-4" /> Guardar nota</button>
                  <button type="button" onClick={() => update("en_revision")} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-amber-500 px-3 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-60"><Clock3 className="h-4 w-4" /> Tomar caso</button>
                  <button type="button" onClick={() => update("resuelta")} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-60"><CheckCircle2 className="h-4 w-4" /> Marcar resuelta</button>
                  {selected.estado !== "pendiente" && <button type="button" onClick={() => update("pendiente")} disabled={saving} className="h-10 rounded-md border border-red-200 px-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-200">Volver a pendiente</button>}
                </div>
              </article> : <div className="flex min-h-[24rem] flex-col items-center justify-center text-center"><MessageSquareText className="h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">Selecciona una consulta para ver el detalle</p></div>}
            </div>
          </div>
        </section>
      </main>
    </Wrapper>
  );
}
