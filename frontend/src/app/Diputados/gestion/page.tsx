"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Camera, CheckCircle2, Pencil, Plus, Save, Search, UserRound } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { Wrapper, diputadosData } from "@/components";
import { isAdmin } from "@/services/authRole";
import { obtenerAnexos, obtenerSubdependencias, type AnexoResponse, type SubdependenciaResponse } from "@/services/anexosService";
import { actualizarDiputado, crearDiputado, importarDiputadosIniciales, listarDiputados } from "@/services/diputadosService";
import { uploadMobiliarioImage } from "@/lib/imageUpload";
import type { Diputado } from "@/types/diputados";

const emptyForm = {
  nombre: "", departamento: "", partido: "", bloque: "", mandato: "2023 - 2027",
  foto_url: "", anexo_id: "", ubicacion_id: "", activo: true,
};
const inputClass = "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-cyan-400 dark:focus:ring-cyan-950";
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function GestionDiputadosPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [diputados, setDiputados] = useState<Diputado[]>([]);
  const [anexos, setAnexos] = useState<AnexoResponse[]>([]);
  const [subdependencias, setSubdependencias] = useState<SubdependenciaResponse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isAdmin()) { router.replace("/Diputados"); return; }
    setAuthorized(true);
    (async () => {
      try {
        const [annexRows, storedRows] = await Promise.all([obtenerAnexos(), listarDiputados(true)]);
        const rows = storedRows.length ? storedRows : await importarDiputadosIniciales(diputadosData);
        setAnexos(annexRows.sort((a, b) => a.id - b.id));
        setDiputados(rows);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo cargar la administración.");
      } finally { setLoading(false); }
    })();
  }, [router]);

  useEffect(() => {
    const anexoId = Number(form.anexo_id);
    if (!anexoId) { setSubdependencias([]); return; }
    obtenerSubdependencias(anexoId).then(setSubdependencias).catch(() => toast.error("No se pudieron cargar las subdependencias."));
  }, [form.anexo_id]);

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    return diputados.filter((item) => !term || normalize(`${item.nombre} ${item.departamento} ${item.subdependencia || ""}`).includes(term));
  }, [diputados, search]);

  const newRecord = () => { setSelectedId(null); setForm(emptyForm); };
  const selectRecord = (item: Diputado) => {
    setSelectedId(item.id ?? null);
    setForm({
      nombre: item.nombre, departamento: item.departamento, partido: item.partido,
      bloque: item.bloque || "", mandato: item.mandato, foto_url: item.foto_url || item.foto || "",
      anexo_id: item.anexo_id ? String(item.anexo_id) : "",
      ubicacion_id: item.ubicacion_id ? String(item.ubicacion_id) : "", activo: item.activo !== false,
    });
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    try {
      setSaving(true);
      const payload = {
        nombre: form.nombre.trim(), departamento: form.departamento.trim(), partido: form.partido.trim(),
        bloque: form.bloque.trim(), mandato: form.mandato.trim(), foto_url: form.foto_url.trim(),
        ubicacion_id: form.ubicacion_id ? Number(form.ubicacion_id) : null, activo: form.activo,
      };
      const saved = selectedId ? await actualizarDiputado(selectedId, payload) : await crearDiputado(payload);
      setDiputados((current) => {
        const next = selectedId ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved];
        return next.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      });
      selectRecord(saved);
      toast.success(selectedId ? "Diputado actualizado." : "Diputado agregado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally { setSaving(false); }
  };

  const uploadPhoto = async (file?: File) => {
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadMobiliarioImage(file);
      setForm((current) => ({ ...current, foto_url: url }));
      toast.success("Foto cargada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar la foto.");
    } finally { setUploading(false); }
  };

  if (!authorized) return null;
  return (
    <Wrapper>
      <Toaster position="top-center" />
      <main className="mx-auto w-full max-w-7xl px-2 pb-10 pt-2 sm:px-4">
        <header className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button type="button" onClick={() => router.push("/Diputados")} className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-cyan-700 dark:text-slate-300 dark:hover:text-cyan-300"><ArrowLeft className="h-4 w-4" /> Volver</button>
            <p className="text-xs font-black uppercase text-cyan-700 dark:text-cyan-300">Administración</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Diputados y oficinas</h1>
          </div>
          <button type="button" onClick={newRecord} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-black text-white hover:bg-cyan-800"><Plus className="h-4 w-4" /> Nuevo diputado</button>
        </header>

        <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="min-h-[34rem] border-slate-200 dark:border-slate-800 lg:border-r lg:pr-5">
            <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar diputado u oficina" className={`${inputClass} pl-10`} /></label>
            <div className="mt-3 max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {loading && <p className="py-8 text-center text-sm font-semibold text-slate-500">Cargando...</p>}
              {!loading && filtered.map((item) => (
                <button key={item.id || item.nombre} type="button" onClick={() => selectRecord(item)} className={`w-full rounded-md border p-3 text-left transition ${selectedId === item.id ? "border-cyan-500 bg-cyan-50 dark:border-cyan-700 dark:bg-cyan-950/30" : "border-slate-200 bg-white hover:border-cyan-300 dark:border-slate-800 dark:bg-slate-950"}`}>
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 text-sm font-black text-slate-950 dark:text-white">{item.nombre}</span>
                    {item.id && <span className="inline-flex shrink-0 items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"><CheckCircle2 className="h-3 w-3" /> Guardado</span>}
                  </span>
                  <span className="mt-2 flex items-center justify-between gap-3 border-t border-slate-200 pt-2 dark:border-slate-800">
                    <span className="min-w-0 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{item.subdependencia || "Sin oficina asignada"}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-cyan-700 dark:text-cyan-300"><Pencil className="h-3 w-3" />{selectedId === item.id ? "Editando" : "Editar"}</span>
                  </span>
                  {item.activo === false && <span className="mt-2 inline-block rounded bg-slate-200 px-2 py-1 text-[10px] font-black uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">Inactivo</span>}
                </button>
              ))}
            </div>
          </aside>

          <form onSubmit={save} className="min-w-0">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-md bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200"><UserRound className="h-5 w-5" /></span><div><h2 className="text-lg font-black text-slate-950 dark:text-white">{selectedId ? "Editar diputado" : "Nuevo diputado"}</h2><p className="text-xs text-slate-500 dark:text-slate-400">La oficina se vincula con Gestión de Anexos.</p></div></div>
              {selectedId && <span className="inline-flex h-9 items-center gap-2 self-start rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"><CheckCircle2 className="h-4 w-4" /> Registro guardado · ID {selectedId}</span>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre y apellido"><input required maxLength={160} className={inputClass} value={form.nombre} onChange={(e) => setForm((v) => ({ ...v, nombre: e.target.value }))} /></Field>
              <Field label="Departamento"><input required maxLength={120} className={inputClass} value={form.departamento} onChange={(e) => setForm((v) => ({ ...v, departamento: e.target.value }))} /></Field>
              <Field label="Partido o agrupación"><input required maxLength={200} className={inputClass} value={form.partido} onChange={(e) => setForm((v) => ({ ...v, partido: e.target.value }))} /></Field>
              <Field label="Bloque"><input maxLength={160} className={inputClass} value={form.bloque} onChange={(e) => setForm((v) => ({ ...v, bloque: e.target.value }))} /></Field>
              <Field label="Mandato"><input required pattern="\d{4}\s*-\s*\d{4}" placeholder="2023 - 2027" className={inputClass} value={form.mandato} onChange={(e) => setForm((v) => ({ ...v, mandato: e.target.value }))} /></Field>
              <Field label="Anexo"><select className={inputClass} value={form.anexo_id} onChange={(e) => setForm((v) => ({ ...v, anexo_id: e.target.value, ubicacion_id: "" }))}><option value="">Sin anexo asignado</option>{anexos.map((item) => <option key={item.id} value={item.id}>{item.id} - {item.nombre}</option>)}</select></Field>
              <Field label="Oficina / subdependencia"><select className={inputClass} disabled={!form.anexo_id} value={form.ubicacion_id} onChange={(e) => setForm((v) => ({ ...v, ubicacion_id: e.target.value }))}><option value="">Sin oficina asignada</option>{subdependencias.map((item) => <option key={item.id} value={item.id}>{item.id} - {item.nombre}</option>)}</select></Field>
              <Field label="URL de foto"><input className={inputClass} value={form.foto_url} onChange={(e) => setForm((v) => ({ ...v, foto_url: e.target.value }))} /></Field>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4 border-y border-slate-200 py-4 dark:border-slate-800">
              <div className="relative h-24 w-24 overflow-hidden rounded-md border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">{form.foto_url ? <Image src={form.foto_url} alt="Vista previa" fill unoptimized className="object-cover" /> : <UserRound className="absolute inset-0 m-auto h-8 w-8 text-slate-400" />}</div>
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold text-slate-700 hover:border-cyan-500 dark:border-slate-700 dark:text-slate-200"><Camera className="h-4 w-4" />{uploading ? "Cargando..." : "Cargar foto"}<input type="file" accept="image/*" disabled={uploading} className="sr-only" onChange={(e) => uploadPhoto(e.target.files?.[0])} /></label>
              <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200"><input type="checkbox" checked={form.activo} onChange={(e) => setForm((v) => ({ ...v, activo: e.target.checked }))} className="h-4 w-4 accent-cyan-700" /> Diputado activo</label>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400"><Building2 className="h-4 w-4" />{form.ubicacion_id ? `Oficina ID ${form.ubicacion_id}` : "Sin oficina vinculada"}</span><button type="submit" disabled={saving || uploading} className="inline-flex h-11 items-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "Guardando..." : selectedId ? "Guardar cambios" : "Guardar diputado"}</button></div>
          </form>
        </div>
      </main>
    </Wrapper>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300">{label}<span className="mt-1.5 block normal-case">{children}</span></label>;
}
