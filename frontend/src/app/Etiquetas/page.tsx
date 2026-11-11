"use client";

import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eraser,
  Layers3,
  LoaderCircle,
  ListPlus,
  MapPin,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { Wrapper } from "@/components";
import {
  buscarMobiliario,
  obtenerAnexos,
  obtenerSubdependenciasPorAnexo,
  type AnexoOption,
  type BuscadorItem,
  type SubdependenciaOption,
} from "@/services/buscadorService";

const PER_PAGE = 12;
const QUEUE_STORAGE_KEY = "patrimonio.etiquetas.cadena";
const QUEUE_TRANSFER_KEY = "patrimonio.etiquetas.cadena_pendiente";
const SETTINGS_STORAGE_KEY = "patrimonio.etiquetas.configuracion";

type LabelModel = "clasica" | "institucional" | "compacta" | "qr";
type LabelTone = "blanca" | "negra";

type LabelQueueItem = {
  id: string;
  descripcion: string;
};

type BatchExportState = {
  requestId: string;
  index: number;
  images: string[];
};

const LABEL_MODELS: Array<{ id: LabelModel; label: string }> = [
  { id: "clasica", label: "Clásica" },
  { id: "institucional", label: "Institucional" },
  { id: "compacta", label: "Compacta" },
  { id: "qr", label: "QR" },
];

function defaultTone(model: LabelModel): LabelTone {
  return model === "clasica" || model === "qr" ? "negra" : "blanca";
}

function loadPng(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

async function downloadPngChain(
  dataUrls: string[],
  model: LabelModel,
  tone: LabelTone
) {
  const images = await Promise.all(dataUrls.map(loadPng));
  const sourceWidth = images.reduce(
    (totalWidth, image) => totalWidth + image.naturalWidth,
    0
  );
  const sourceHeight = Math.max(...images.map((image) => image.naturalHeight));
  const outputScale = Math.min(1, 30_000 / sourceWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * outputScale));
  canvas.height = Math.max(1, Math.round(sourceHeight * outputScale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas_unavailable");
  context.imageSmoothingEnabled = outputScale < 1;
  context.imageSmoothingQuality = "high";

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  let offsetX = 0;
  images.forEach((image) => {
    const width = Math.round(image.naturalWidth * outputScale);
    const height = Math.round(image.naturalHeight * outputScale);
    const offsetY = Math.round((canvas.height - height) / 2);
    context.drawImage(image, offsetX, offsetY, width, height);
    offsetX += width;
  });

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `cadena-etiquetas-${model}-${tone}-${dataUrls.length}.png`;
  link.click();
}

function EtiquetasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("bien") ?? "";
  const [query, setQuery] = useState(selectedId);
  const [searchField, setSearchField] = useState<"todo" | "id" | "descripcion">(
    selectedId ? "id" : "todo"
  );
  const [anexoId, setAnexoId] = useState("");
  const [subdependenciaId, setSubdependenciaId] = useState("");
  const [anexos, setAnexos] = useState<AnexoOption[]>([]);
  const [subdependencias, setSubdependencias] = useState<SubdependenciaOption[]>([]);
  const [items, setItems] = useState<BuscadorItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [queue, setQueue] = useState<LabelQueueItem[]>([]);
  const [queueReady, setQueueReady] = useState(false);
  const [labelModel, setLabelModel] = useState<LabelModel>("clasica");
  const [labelTone, setLabelTone] = useState<LabelTone>("negra");
  const [batchExport, setBatchExport] = useState<BatchExportState | null>(null);

  const selectedItem = items.find(
    (item) => String(item.id_mobiliario) === selectedId
  );
  const selectedIsQueued = queue.some((item) => item.id === selectedId);
  const queueIndex = queue.findIndex((item) => item.id === selectedId);

  useEffect(() => {
    try {
      const transferredQueue = JSON.parse(
        sessionStorage.getItem(QUEUE_TRANSFER_KEY) || "[]"
      );
      const savedQueue = Array.isArray(transferredQueue) && transferredQueue.length
        ? transferredQueue
        : JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) || "[]");
      if (Array.isArray(savedQueue)) {
        setQueue(
          savedQueue.filter(
            (item): item is LabelQueueItem =>
              typeof item?.id === "string" && typeof item?.descripcion === "string"
          )
        );
      }
      sessionStorage.removeItem(QUEUE_TRANSFER_KEY);

      const savedSettings = JSON.parse(
        localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}"
      );
      if (LABEL_MODELS.some((model) => model.id === savedSettings.modelo)) {
        setLabelModel(savedSettings.modelo);
      }
      if (savedSettings.tono === "blanca" || savedSettings.tono === "negra") {
        setLabelTone(savedSettings.tono);
      }
    } catch {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } finally {
      setQueueReady(true);
    }
  }, []);

  useEffect(() => {
    if (!queueReady) return;
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ modelo: labelModel, tono: labelTone })
    );
  }, [labelModel, labelTone, queue, queueReady]);

  useEffect(() => {
    if (!batchExport) return;

    const handleBatchMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as {
        type?: string;
        requestId?: string;
        id?: string;
        dataUrl?: string;
      };
      if (data.requestId !== batchExport.requestId) return;
      const currentItem = queue[batchExport.index];
      if (!currentItem || data.id !== currentItem.id) return;

      if (data.type === "patrimonio:etiqueta-png-error" || !data.dataUrl) {
        setBatchExport(null);
        toast.error(`No se pudo generar la etiqueta ID ${currentItem.id}`);
        return;
      }
      if (data.type !== "patrimonio:etiqueta-png") return;

      const nextImages = [...batchExport.images, data.dataUrl];
      if (batchExport.index >= queue.length - 1) {
        setBatchExport(null);
        void downloadPngChain(nextImages, labelModel, labelTone)
          .then(() => toast.success("Cadena descargada en PNG"))
          .catch(() => toast.error("No se pudo unir la cadena de etiquetas"));
        return;
      }

      setBatchExport({
        ...batchExport,
        index: batchExport.index + 1,
        images: nextImages,
      });
    };

    window.addEventListener("message", handleBatchMessage);
    const timeoutId = window.setTimeout(() => {
      const currentItem = queue[batchExport.index];
      setBatchExport(null);
      toast.error(
        currentItem
          ? `La etiqueta ID ${currentItem.id} demoró demasiado`
          : "La cadena no pudo completarse"
      );
    }, 30_000);

    return () => {
      window.removeEventListener("message", handleBatchMessage);
      window.clearTimeout(timeoutId);
    };
  }, [batchExport, labelModel, labelTone, queue]);

  useEffect(() => {
    obtenerAnexos().then(setAnexos).catch(() => toast.error("No se pudieron cargar los anexos"));
  }, []);

  useEffect(() => {
    if (!anexoId) {
      setSubdependencias([]);
      setSubdependenciaId("");
      return;
    }
    obtenerSubdependenciasPorAnexo(Number(anexoId))
      .then((data) => {
        setSubdependencias(data);
        setSubdependenciaId("");
      })
      .catch(() => toast.error("No se pudieron cargar las subdependencias"));
  }, [anexoId]);

  const runSearch = useCallback(async (nextPage: number) => {
    try {
      setLoading(true);
      const data = await buscarMobiliario({
        q: query.trim() || undefined,
        search_field: searchField,
        anexo_id: anexoId ? Number(anexoId) : undefined,
        subdependencia_id: subdependenciaId ? Number(subdependenciaId) : undefined,
        page: nextPage,
        per_page: PER_PAGE,
        order_by: /^\d+$/.test(query.trim()) ? "id" : "fecha_actualizacion",
        order_dir: "desc",
      });
      setItems(data.items);
      setTotal(data.meta.total);
      setPage(data.meta.page);
      setPages(Math.max(data.meta.pages, 1));
    } catch {
      toast.error("No se pudieron buscar los bienes");
    } finally {
      setLoading(false);
    }
  }, [anexoId, query, searchField, subdependenciaId]);

  useEffect(() => {
    const timer = window.setTimeout(() => runSearch(1), 350);
    return () => window.clearTimeout(timer);
  }, [runSearch]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    runSearch(1);
  };

  const selectItem = (id: string) => {
    router.replace(`/Etiquetas?bien=${encodeURIComponent(id)}`, { scroll: false });
  };

  const addSelectedToQueue = () => {
    if (!selectedId || selectedIsQueued) return;

    const descripcion =
      selectedItem?.descripcion?.trim() || `Bien ID ${selectedId}`;
    setQueue((current) => [...current, { id: selectedId, descripcion }]);
    toast.success(`ID ${selectedId} agregado a la cadena`);
  };

  const removeFromQueue = (id: string) => {
    setQueue((current) => current.filter((item) => item.id !== id));
    toast.success(`ID ${id} quitado de la cadena`);
  };

  const clearQueue = () => {
    setQueue([]);
    toast.success("Cadena de etiquetas vaciada");
  };

  const startBatchExport = () => {
    if (queue.length === 0 || batchExport) return;
    const requestId =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    setBatchExport({ requestId, index: 0, images: [] });
  };

  const changeModel = (model: LabelModel) => {
    setLabelModel(model);
    setLabelTone(defaultTone(model));
  };

  const goToQueueItem = (index: number) => {
    const target = queue[index];
    if (!target) return;
    setQuery(target.id);
    setSearchField("id");
    selectItem(target.id);
  };

  const resetFilters = () => {
    setQuery("");
    setSearchField("todo");
    setAnexoId("");
    setSubdependenciaId("");
  };

  const labelEditorSrc = selectedId
    ? `/etiqueta/${encodeURIComponent(selectedId)}?modelo=${labelModel}&tono=${labelTone}&embedded=1`
    : "";

  return (
    <Wrapper>
      <Toaster />
      <main className="min-h-screen bg-slate-100 px-3 py-5 dark:bg-slate-900 sm:px-5">
        <div className="mx-auto max-w-[1500px]">
          <header className="border-b border-slate-300 pb-5 dark:border-slate-700">
            <p className="text-xs font-black uppercase text-cyan-700 dark:text-cyan-300">Impresión patrimonial</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Etiquetas de bienes</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Busca el bien y prepara su etiqueta sin salir de esta pantalla.</p>
          </header>

          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-950 lg:grid-cols-2 xl:grid-cols-[150px_minmax(240px,1fr)_220px] 2xl:grid-cols-[160px_minmax(260px,1fr)_230px_260px_auto]">
            <label className="grid gap-1 text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
              Buscar por
              <span className="relative block">
                <select value={searchField} onChange={(event) => setSearchField(event.target.value as typeof searchField)} className="h-11 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 pr-10 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                  <option value="todo">Todo</option>
                  <option value="id">ID</option>
                  <option value="descripcion">Descripción avanzada</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </span>
            </label>

            <label className="grid gap-1 text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
              ID o descripción del bien
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej.: 5202, impresora, escritorio" className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
              </span>
            </label>

            <label className="grid gap-1 text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
              Anexo
              <span className="relative block">
                <select value={anexoId} onChange={(event) => setAnexoId(event.target.value)} className="h-11 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 pr-10 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                  <option value="">Todos los anexos</option>
                  {anexos.map((anexo) => <option key={anexo.id} value={anexo.id}>{anexo.nombre}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </span>
            </label>

            <label className="grid gap-1 text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
              Subdependencia
              <span className="relative block">
                <select value={subdependenciaId} onChange={(event) => setSubdependenciaId(event.target.value)} disabled={!anexoId} className="h-11 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 pr-10 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-cyan-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                  <option value="">Todas</option>
                  {subdependencias.map((subdependencia) => <option key={subdependencia.id} value={subdependencia.id}>{subdependencia.nombre}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </span>
            </label>

            <div className="flex items-end gap-2">
              <button type="submit" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-cyan-600 px-4 text-sm font-black text-slate-950 transition hover:bg-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"><Search className="h-4 w-4" /> Buscar</button>
              <button type="button" onClick={resetFilters} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:border-cyan-500 hover:text-cyan-700 dark:border-slate-700 dark:text-slate-300" title="Limpiar filtros" aria-label="Limpiar filtros"><Eraser className="h-4 w-4" /></button>
            </div>
          </form>

          <section className="mt-5 border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 px-4 py-3 dark:border-slate-700">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">
                  <ListPlus className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-black text-slate-950 dark:text-white">Cadena de etiquetas</h2>
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {queue.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Descarga cada PNG por separado o toda la cadena en una sola imagen.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={addSelectedToQueue}
                  disabled={!selectedId || selectedIsQueued || Boolean(batchExport)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan-600 px-4 text-sm font-black text-slate-950 transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                >
                  <ListPlus className="h-4 w-4" />
                  {selectedIsQueued ? "Ya agregado" : selectedId ? `Agregar ID ${selectedId}` : "Selecciona un bien"}
                </button>
                {queue.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={startBatchExport}
                      disabled={Boolean(batchExport)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-70"
                    >
                      {batchExport ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      {batchExport
                        ? `Generando ${batchExport.index + 1}/${queue.length}`
                        : "Descargar cadena"}
                    </button>
                    <button
                      type="button"
                      onClick={clearQueue}
                      disabled={Boolean(batchExport)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:border-rose-500 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                      title="Vaciar cadena"
                      aria-label="Vaciar cadena"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <div className="min-w-0">
                <p className="mb-2 text-xs font-black uppercase text-slate-600 dark:text-slate-300">Bienes seleccionados</p>
                {queue.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {queue.map((item, index) => {
                      const active = item.id === selectedId;
                      return (
                        <div
                          key={item.id}
                          className={`flex min-w-[220px] max-w-[290px] items-stretch border transition ${
                            active
                              ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30"
                              : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => goToQueueItem(index)}
                            className="min-w-0 flex-1 px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400"
                          >
                            <span className="block text-xs font-black text-cyan-700 dark:text-cyan-300">{String(index + 1).padStart(2, "0")} · ID {item.id}</span>
                            <span className="mt-1 block truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{item.descripcion}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromQueue(item.id)}
                            disabled={Boolean(batchExport)}
                            className="flex w-10 shrink-0 items-center justify-center border-l border-slate-200 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:hover:bg-rose-950/30"
                            title={`Quitar ID ${item.id}`}
                            aria-label={`Quitar ID ${item.id} de la cadena`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-14 items-center border border-dashed border-slate-300 px-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Selecciona un bien de los resultados y agrégalo a la cadena.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <p className="mb-2 text-xs font-black uppercase text-slate-600 dark:text-slate-300">Modelo</p>
                  <div className="flex flex-wrap gap-1 rounded-md bg-slate-100 p-1 dark:bg-slate-900">
                    {LABEL_MODELS.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => changeModel(model.id)}
                        disabled={Boolean(batchExport)}
                        className={`h-9 rounded px-3 text-sm font-bold transition ${
                          labelModel === model.id
                            ? "bg-cyan-600 text-slate-950"
                            : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        {model.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-black uppercase text-slate-600 dark:text-slate-300">Fondo</p>
                  <div className="flex rounded-md border border-slate-300 p-1 dark:border-slate-700">
                    {(["blanca", "negra"] as LabelTone[]).map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => setLabelTone(tone)}
                        disabled={Boolean(batchExport)}
                        className={`inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-bold capitalize transition ${
                          labelTone === tone
                            ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-950"
                            : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        <span className={`h-3 w-3 rounded-full border ${tone === "blanca" ? "border-slate-400 bg-white" : "border-slate-700 bg-black"}`} />
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[410px_minmax(0,1fr)]">
            <section className="min-w-0 border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">
              <div className="flex h-14 items-center justify-between border-b border-slate-300 px-4 dark:border-slate-700">
                <div><h2 className="font-black text-slate-950 dark:text-white">Bienes encontrados</h2><p className="text-xs text-slate-500 dark:text-slate-400">{total} resultados</p></div>
                {loading && <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300">Buscando...</span>}
              </div>

              <div className="max-h-[680px] space-y-2 overflow-y-auto p-3">
                {!loading && items.length === 0 && <div className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No hay bienes para los filtros elegidos.</div>}
                {items.map((item) => {
                  const active = selectedId === String(item.id_mobiliario);
                  return (
                    <button key={item.id_mobiliario} type="button" onClick={() => selectItem(String(item.id_mobiliario))} className={`w-full border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${active ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30" : "border-slate-200 bg-slate-50 hover:border-cyan-400 dark:border-slate-800 dark:bg-slate-900"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-2 text-sm font-black text-slate-950 dark:text-white">{item.descripcion || "Bien sin descripción"}</p>
                        <span className="shrink-0 rounded bg-slate-900 px-2 py-1 text-xs font-black text-white dark:bg-cyan-500 dark:text-slate-950">ID {item.id_mobiliario}</span>
                      </div>
                      <p className="mt-3 flex items-center gap-2 truncate text-xs font-semibold text-slate-600 dark:text-slate-300"><MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-600" />{item.anexo || "Sin anexo"}</p>
                      <p className="mt-1 flex items-center gap-2 truncate text-xs text-slate-500 dark:text-slate-400"><Layers3 className="h-3.5 w-3.5 shrink-0" />{item.subdependencia || "Sin subdependencia"}</p>
                    </button>
                  );
                })}
              </div>

              <div className="flex h-14 items-center justify-between border-t border-slate-300 px-3 dark:border-slate-700">
                <button type="button" disabled={page <= 1 || loading} onClick={() => runSearch(page - 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 disabled:opacity-40 dark:border-slate-700" aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Página {page} de {pages}</span>
                <button type="button" disabled={page >= pages || loading} onClick={() => runSearch(page + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 disabled:opacity-40 dark:border-slate-700" aria-label="Página siguiente"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </section>

            <section className="min-w-0 border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">
              <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-slate-300 px-4 py-2 dark:border-slate-700">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200"><Tag className="h-5 w-5" /></span>
                  <div><h2 className="font-black text-slate-950 dark:text-white">Preparar etiqueta</h2><p className="text-xs text-slate-500 dark:text-slate-400">{selectedId ? `Bien ID ${selectedId}` : "Selecciona un bien de la lista"}</p></div>
                </div>

                {queueIndex >= 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => goToQueueItem(queueIndex - 1)}
                      disabled={queueIndex <= 0}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 disabled:opacity-35 dark:border-slate-700 dark:text-slate-200"
                      aria-label="Etiqueta anterior de la cadena"
                      title="Etiqueta anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="min-w-14 text-center text-xs font-black text-slate-600 dark:text-slate-300">{queueIndex + 1} de {queue.length}</span>
                    <button
                      type="button"
                      onClick={() => goToQueueItem(queueIndex + 1)}
                      disabled={queueIndex >= queue.length - 1}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 disabled:opacity-35 dark:border-slate-700 dark:text-slate-200"
                      aria-label="Etiqueta siguiente de la cadena"
                      title="Etiqueta siguiente"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {selectedId ? (
                <iframe key={`${selectedId}-${labelModel}-${labelTone}`} src={labelEditorSrc} title={`Editor de etiqueta del bien ${selectedId}`} className="h-[680px] w-full bg-slate-100" />
              ) : (
                <div className="flex h-[680px] items-center justify-center p-8 text-center"><div><Tag className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" /><p className="mt-3 font-bold text-slate-700 dark:text-slate-200">Todavía no elegiste un bien</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Usa los filtros o el buscador y abre la etiqueta desde el resultado.</p></div></div>
              )}
            </section>
          </div>
          {batchExport && queue[batchExport.index] && (
            <div className="pointer-events-none fixed left-[-12000px] top-0 h-[760px] w-[1200px] overflow-hidden opacity-0" aria-hidden="true">
              <iframe
                key={`${batchExport.requestId}-${batchExport.index}`}
                src={`/etiqueta/${encodeURIComponent(queue[batchExport.index].id)}?modelo=${labelModel}&tono=${labelTone}&embedded=1&batch=${encodeURIComponent(batchExport.requestId)}`}
                title="Generador de cadena de etiquetas"
                className="h-full w-full bg-white"
              />
            </div>
          )}
        </div>
      </main>
    </Wrapper>
  );
}

export default function EtiquetasPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-100 dark:bg-slate-900" />}><EtiquetasContent /></Suspense>;
}
