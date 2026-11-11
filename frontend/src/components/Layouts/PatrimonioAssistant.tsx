"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, MessageCircleQuestion, Send, X } from "lucide-react";
import { getAuthUser } from "@/services/authRole";
import { askPatrimonio, type AssistantAnswer } from "@/services/patrimonioAssistantService";

type Message = { id: number; from: "user" | "assistant"; answer: AssistantAnswer };

function requestsDetails(value: string) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(cuales|cual|lista|listado|listalos|listalas|detalle|detalles|mostra|mostrame|mostralos|mostrar|ver|ids?|que bienes)\b/.test(normalized);
}

const suggestions = [
  "¿Cuántas sillas hay en el anexo Casa Central?",
  "¿Cuántos bienes faltantes hay?",
  "¿Qué movimientos hubo este mes?",
];

export default function PatrimonioAssistant() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [stage, setStage] = useState<"searching" | "writing" | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef(0);

  const close = useCallback(() => {
    sessionRef.current += 1;
    setOpen(false);
    setConfirmClose(false);
    setQuestion("");
    setMessages([]);
    setStage(null);
  }, []);

  const requestClose = useCallback(() => {
    if (messages.length > 0 || stage) setConfirmClose(true);
    else close();
  }, [messages.length, stage, close]);

  useEffect(() => {
    const { username, role } = getAuthUser();
    setEnabled(Boolean(username) && (role === "admin" || role === "superadmin"));
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (confirmClose) setConfirmClose(false);
        else requestClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, confirmClose, requestClose]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, stage]);

  const send = async (value: string) => {
    const clean = value.trim();
    if (!clean || stage) return;
    const session = sessionRef.current;
    setQuestion("");
    setMessages((current) => [...current, { id: Date.now(), from: "user", answer: { text: clean } }]);
    setStage("searching");
    try {
      const previous = [...messages].reverse().find((item) => item.from === "user")?.answer.text;
      const contextual = previous && /^(y\s+)?(cuales|cu[aá]les|list[aá]los|list[aá]las|mostr[aá]me|mostr[aá]los|dame el detalle|dame los detalles|el detalle|los detalles|en el anexo|en la subdependencia)/i.test(clean);
      const answer = await askPatrimonio(contextual ? `${previous} ${clean}` : clean);
      if (session !== sessionRef.current) return;
      setStage("writing");
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (session !== sessionRef.current) return;
      setMessages((current) => [...current, { id: Date.now() + 1, from: "assistant", answer: { text: answer.text, details: requestsDetails(clean) ? answer.details : undefined } }]);
    } catch (error) {
      if (session !== sessionRef.current) return;
      setMessages((current) => [...current, {
        id: Date.now() + 1,
        from: "assistant",
        answer: { text: error instanceof Error ? error.message : "No pude consultar los datos ahora. Intentá nuevamente." },
      }]);
    } finally {
      if (session === sessionRef.current) setStage(null);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send(question);
  };

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => { if (open) requestClose(); else setOpen(true); }}
        aria-expanded={open}
        aria-controls="patrimonio-assistant"
        title="¿Ayuda?"
        className="fixed bottom-[4.5rem] left-4 z-40 flex h-11 min-w-[104px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-cyan-700 px-3 text-white shadow-lg transition hover:bg-cyan-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500"
      >
        <MessageCircleQuestion className="h-5 w-5" />
        <span className="text-sm font-semibold">¿Ayuda?</span>
        <span className="sr-only">{open ? "Cerrar consulta patrimonial" : "Abrir consulta patrimonial"}</span>
      </button>
      {open && (
        <section id="patrimonio-assistant" aria-label="Consulta patrimonial" className="fixed bottom-32 left-3 z-40 flex max-h-[min(70dvh,560px)] w-[min(420px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-md border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Consulta patrimonial</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Datos actuales del sistema</p>
            </div>
            <button type="button" onClick={requestClose} title="Cerrar" aria-label="Cerrar" className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
          </header>
          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.length === 0 && <div className="space-y-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => void send(suggestion)} className="block w-full rounded-md border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:border-cyan-500 hover:bg-cyan-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{suggestion}</button>)}</div>}
            {messages.map((message) => <div key={message.id} className={`max-w-[95%] rounded-md px-3 py-2 text-sm ${message.from === "user" ? "ml-auto bg-cyan-700 text-white" : "border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"}`}>
              <p className="whitespace-pre-wrap break-words">{message.answer.text}</p>
              {message.answer.details && message.answer.details.length > 0 && <ul className="mt-2 divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-700 dark:border-slate-700">{message.answer.details.map((detail, index) => <li key={`${message.id}-${index}`} className="py-1.5 text-xs">{detail.href ? <Link href={detail.href} className="font-semibold text-cyan-800 underline hover:text-cyan-950 dark:text-cyan-300 dark:hover:text-cyan-100">{detail.label}</Link> : detail.label}</li>)}</ul>}
            </div>)}
            {stage && <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"><LoaderCircle className="h-4 w-4 animate-spin" /> {stage === "searching" ? "Buscando información..." : "Escribiendo..."}</div>}
          </div>
          <form onSubmit={submit} className="flex shrink-0 items-end gap-2 border-t border-slate-200 p-3 dark:border-slate-700">
            <textarea ref={inputRef} rows={2} maxLength={300} value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(question); } }} placeholder="Escribí tu consulta" aria-label="Pregunta patrimonial" className="min-h-10 min-w-0 flex-1 resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <button type="submit" disabled={Boolean(stage) || !question.trim()} title="Enviar pregunta" aria-label="Enviar pregunta" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-700 text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" /></button>
          </form>
        </section>
      )}
      {open && confirmClose && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4" role="presentation">
          <div role="alertdialog" aria-modal="true" aria-labelledby="assistant-close-title" aria-describedby="assistant-close-description" className="w-full max-w-sm rounded-md border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h2 id="assistant-close-title" className="text-base font-bold text-slate-900 dark:text-white">¿Cerrar el chat?</h2>
            <p id="assistant-close-description" className="mt-2 text-sm text-slate-600 dark:text-slate-300">Se borrarán las preguntas y respuestas de esta conversación.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" autoFocus onClick={() => setConfirmClose(false)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800">No, seguir</button>
              <button type="button" onClick={close} className="rounded-md bg-cyan-700 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800">Sí, borrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
