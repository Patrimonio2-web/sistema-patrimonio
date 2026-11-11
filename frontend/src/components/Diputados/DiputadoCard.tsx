import Image from "next/image";
import { AlarmClock, ArrowUpRight, Building2, MapPin } from "lucide-react";
import { parseMandato } from "@/lib/mandato";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DiputadoCardProps {
  nombre: string;
  departamento: string;
  partido: string;
  foto?: string;
  mandato: string;
  bloque?: string;
  anexo?: string;
  direccion?: string;
}

export default function DiputadoCard({
  nombre,
  departamento,
  partido,
  foto,
  mandato,
  bloque,
  anexo,
  direccion,
}: DiputadoCardProps) {
  const { daysLeft, status, endDate, progress } = parseMandato(mandato);

  const badgeClass =
    status === "expired"
      ? "bg-red-600 text-white"
      : status === "danger"
      ? "bg-red-500 text-white"
      : status === "warning"
      ? "bg-amber-500 text-white"
      : "bg-transparent text-transparent";

  const showBadge = status !== "ok";
  const statusLabel =
    status === "expired"
      ? "Vencido"
      : status === "danger"
        ? `${daysLeft} días`
        : status === "warning"
          ? `${daysLeft} días`
          : "Vigente";
  const endFmt = endDate.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const progressColor =
    progress < 50
      ? "bg-green-500"
      : progress < 80
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <article className="group relative flex h-[400px] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-950/80 dark:hover:border-cyan-700">
      {showBadge && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ${badgeClass}`}
              >
                <AlarmClock className="h-3.5 w-3.5" />
                {statusLabel}
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              <p>Fin: {endFmt}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <div className="mx-auto mt-2 h-24 w-24 overflow-hidden rounded-2xl bg-slate-200 ring-4 ring-slate-100 dark:bg-slate-800 dark:ring-slate-900">
        {foto && (
          <Image
            src={foto}
            alt={`Foto de ${nombre}`}
            width={112}
            height={112}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="mt-4 flex flex-1 flex-col text-center">
        <h2 className="text-sm font-bold leading-5 text-slate-950 dark:text-white">
          {nombre}
        </h2>
        <p className="mt-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
          {departamento}
        </p>
        <p className="mt-1 line-clamp-2 min-h-8 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
          {partido}
        </p>

        <div className="mt-3 flex min-h-[50px] content-start flex-wrap justify-center gap-1.5">
          {bloque && (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {bloque}
            </span>
          )}
          {anexo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-bold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">
              <Building2 className="h-3 w-3" />
              {anexo}
            </span>
          )}
        </div>

        <div className="mt-2 min-h-8">
          {direccion && (
            <p className="flex items-start justify-center gap-1.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-cyan-600 dark:text-cyan-300" />
              <span className="line-clamp-2">{direccion}</span>
            </p>
          )}
        </div>

        <div className="mt-2 w-full">
          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <span>Mandato</span>
            <span>{mandato}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className={`h-2 ${progressColor} transition-all`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            {progress}% del mandato
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition group-hover:border-cyan-200 group-hover:text-cyan-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200 dark:group-hover:border-cyan-700 dark:group-hover:text-cyan-300">
        Ver perfil
        <ArrowUpRight className="h-3.5 w-3.5" />
      </div>
    </article>
  );
}
