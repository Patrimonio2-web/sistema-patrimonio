"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bot, CheckCircle2, ClipboardPenLine, MapPin, MessageCircleQuestion, Send, X } from "lucide-react";
import { enviarConsultaPublica } from "@/services/consultasPublicasService";

type HelpContext = {
  kind: "asset" | "inventory";
  itemId?: string | number | null;
  estado?: string | null;
  anexo?: string | null;
  subdependencia?: string | null;
  total?: number | null;
};

type Message = { id: number; role: "bot" | "user"; text: string; offerContact?: boolean };
type Answer = { text: string; offerContact?: boolean };

const OFFICE_ADDRESS = "Dirección de Patrimonio, Dalmacio Vélez 743, La Rioja";
const QUICK_QUESTIONS = ["¿Cómo informo un daño?", "¿Puedo trasladar un bien?", "¿Dónde encuentro el ID?", "La ubicación no coincide"];
const INITIAL_MESSAGE: Message = {
  id: 1,
  role: "bot",
  text: "¡Hola! Soy el asistente de Patrimonio. Puedo orientarte sobre bienes, daños, etiquetas, ubicación y traslados. ¿Qué necesitás consultar?",
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-AR").replace(/[!?.,;:]+/g, " ").replace(/\s+/g, " ").trim();
}

function unavailableAnswer(): Answer {
  return {
    text: "Esta consulta está fuera de lo que puedo responder automáticamente. Si querés, podés dejar un mensaje para que la Dirección de Patrimonio revise tu caso.",
    offerContact: true,
  };
}

function answerQuestion(question: string, context: HelpContext): Answer {
  const value = normalize(question);
  if (question.trim().length > 320) return unavailableAnswer();
  if (/^(ok|okay|dale|bien|bueno|listo|perfecto|entiendo|entendido|si|no|ah|aja|ayuda|necesito ayuda)$/.test(value)) {
    return { text: "Para poder ayudarte necesito una pregunta concreta. Por ejemplo: ¿cómo informo un daño?, ¿puedo trasladar este bien? o ¿dónde encuentro su ID?" };
  }
  if (/^(hola|buen dia|buenas|buenas tardes|buenas noches)$/.test(value)) {
    return { text: "¡Hola! Contame qué necesitás saber sobre el bien o el inventario. También podés elegir una de las preguntas sugeridas." };
  }
  if (/^(gracias|muchas gracias|genial)$/.test(value)) {
    return { text: "¡De nada! Si te quedó alguna duda, escribime una pregunta concreta y seguimos." };
  }
  if ((value.includes("donde") && (value.includes("patrimonio") || value.includes("direccion"))) || value.includes("domicilio")) {
    return { text: `La atención presencial se realiza en ${OFFICE_ADDRESS}.` };
  }
  if (value.includes("traslad") || value.includes("mover") || value.includes("cambiar de lugar")) {
    return { text: "No traslades el bien sin autorización. Informá primero a Patrimonio e indicá el ID, la ubicación actual y la ubicación de destino para registrar el movimiento." };
  }
  if (value.includes("etiqueta") || value.includes("codigo qr") || value === "qr" || value.includes("no se lee")) {
    return { text: "No retires ni reemplaces la etiqueta o el código QR. Si está dañado o ilegible, informá el ID del bien, su oficina y, si es posible, una foto cuando Patrimonio se comunique." };
  }
  if (value.includes("dan") || value.includes("roto") || value.includes("averia") || value.includes("repar")) {
    const id = context.itemId ? ` ${context.itemId}` : " patrimonial";
    return { text: `Informá el daño indicando el ID${id}, la oficina y qué problema presenta. No muevas ni intentes reparar el bien sin autorización de Patrimonio.` };
  }
  if (value.includes("falta") || value.includes("no esta") || value.includes("perdid") || value.includes("no encuentro")) {
    return { text: "Si el bien no está en la ubicación registrada, no modifiques el inventario. Informá de inmediato su ID, anexo y oficina a la Dirección de Patrimonio.", offerContact: true };
  }
  if (value.includes("alta") || value.includes("nuevo bien") || value.includes("incorpor") || value.includes("recibir un bien")) {
    return { text: "Antes de incorporar o recibir un bien nuevo, comunicá su procedencia y ubicación a Patrimonio para que sea registrado y etiquetado correctamente." };
  }
  if (value.includes("estado")) {
    if (context.kind === "asset" && context.estado?.trim()) return { text: `El estado registrado para este bien es: ${context.estado.trim()}. Si no coincide con su condición actual, informalo a Patrimonio.` };
    return { text: "El estado visible es el último registrado. Si no coincide con la realidad, enviá un mensaje indicando el ID y el estado correcto." };
  }
  if (value.includes("id") || value.includes("numero") || value.includes("identific")) {
    if (context.itemId) return { text: `El ID patrimonial de este bien es ${context.itemId}. También lo encontrás impreso en la etiqueta adherida físicamente al bien, generalmente junto al código QR. Incluilo siempre en tus consultas o avisos.` };
    return { text: "El ID patrimonial está impreso en la etiqueta adherida físicamente al bien, generalmente junto al código QR. Ese número identifica el elemento con precisión; no retires ni reemplaces la etiqueta." };
  }
  if (value.includes("ubicacion") || value.includes("anexo") || value.includes("sector") || value.includes("subdependencia") || value.includes("oficina")) {
    const location = [context.anexo, context.subdependencia].filter(Boolean).join(" - ");
    return location
      ? { text: `La ubicación registrada en el sistema es ${location}. Si el bien está físicamente en otro lugar, no lo traslades ni alteres su etiqueta: enviá un aviso a Patrimonio con el ID de la etiqueta y la oficina donde lo encontraste.`, offerContact: true }
      : { text: "La ubicación registrada se consulta en la información pública del bien. Si está físicamente en otra oficina, no lo traslades ni alteres su etiqueta: enviá un aviso a Patrimonio indicando el ID de la etiqueta, el anexo y la oficina donde lo encontraste.", offerContact: true };
  }
  if ((value.includes("cuantos") || value.includes("cantidad") || value.includes("total")) && context.kind === "inventory" && context.total != null) {
    return { text: `Este inventario público muestra ${context.total} ${context.total === 1 ? "bien" : "bienes"}.` };
  }
  if (value.includes("nuevo") || value.includes("bueno") || value.includes("regular") || value.includes("inutil") || value.includes("conservacion")) {
    return { text: "Nuevo, Bueno, Regular e Inútil describen el estado de conservación registrado. Si no coincide con la condición actual, informá el ID y el cambio observado para que Patrimonio lo verifique." };
  }
  if (value.includes("prest") || value.includes("llevar") || value.includes("retirar") || value.includes("sacar")) {
    return { text: "Un bien patrimonial no debe retirarse, prestarse ni cambiar de oficina sin autorización y registro previo de la Dirección de Patrimonio." };
  }
  if (value.includes("limpiar") || value.includes("mantenimiento") || value.includes("service") || value.includes("tecnico")) {
    return { text: "La limpieza o el mantenimiento no deben alterar la etiqueta patrimonial. Para una reparación o servicio técnico, informá primero el bien y su ID a Patrimonio." };
  }
  if (value.includes("duplic") || value.includes("equivocad")) {
    return { text: "No retires ni reemplaces la etiqueta. Informá el ID visible, la ubicación y el problema para que Patrimonio verifique si está duplicada o asignada por error.", offerContact: true };
  }
  if (value.includes("relevamiento") || value.includes("inventario")) {
    return { text: "El inventario público permite consultar los bienes registrados en cada ubicación. Durante un relevamiento, verificá el ID de la etiqueta y que el bien permanezca en la oficina indicada." };
  }
  if (value.includes("buscar") || value.includes("encontrar") || value.includes("consultar")) {
    return context.kind === "inventory"
      ? { text: "Usá el buscador de esta página. Podés escribir el ID, descripción, rubro, clase o estado del bien." }
      : { text: "En esta consulta pública podés ver el ID, la descripción, la ubicación registrada, el rubro, la clase, el estado y las fotografías del bien." };
  }
  if (value.includes("foto") || value.includes("imagen") || value.includes("zoom")) {
    return { text: "Tocá o hacé clic sobre la fotografía para ampliarla. Si falta o no corresponde al bien, podés avisarlo a Patrimonio.", offerContact: true };
  }
  return unavailableAnswer();
}

export default function PublicHelpBot({ context }: { context: HelpContext }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactError, setContactError] = useState("");
  const [sendingContact, setSendingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ nombre_apellido: "", anexo: context.anexo || "", oficina: context.subdependencia || "", consulta: "", website: "" });
  const nextId = useRef(2);
  const timerRef = useRef<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, typing, showContactForm]);

  const submit = (rawQuestion?: string) => {
    const question = (rawQuestion ?? input).trim();
    if (!question || typing) return;
    setMessages((current) => [...current, { id: nextId.current++, role: "user", text: question }]);
    setInput("");
    setTyping(true);
    const reply = answerQuestion(question, context);
    timerRef.current = window.setTimeout(() => {
      setMessages((current) => [...current, { id: nextId.current++, role: "bot", ...reply }]);
      if (reply.offerContact) setContactForm((current) => ({ ...current, consulta: question }));
      setTyping(false);
      timerRef.current = null;
    }, Math.min(1600, 600 + reply.text.length * 4));
  };

  const requestClose = () => open ? setShowCloseConfirm(true) : setOpen(true);
  const confirmClose = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setOpen(false);
    setTyping(false);
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setShowContactForm(false);
    setShowCloseConfirm(false);
    setContactError("");
    setContactForm({ nombre_apellido: "", anexo: context.anexo || "", oficina: context.subdependencia || "", consulta: "", website: "" });
    nextId.current = 2;
  };

  const submitContact = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sendingContact) return;
    if (contactForm.consulta.trim().length < 10) return setContactError("Contanos la consulta con un poco más de detalle.");
    try {
      setSendingContact(true);
      setContactError("");
      const result = await enviarConsultaPublica({
        ...contactForm,
        contexto: {
          kind: context.kind,
          itemId: context.itemId == null ? undefined : String(context.itemId),
          estado: context.estado || undefined,
          anexo: context.anexo || undefined,
          subdependencia: context.subdependencia || undefined,
          total: context.total == null ? undefined : String(context.total),
        },
        pagina_origen: window.location.href,
      });
      setShowContactForm(false);
      setMessages((current) => [...current, { id: nextId.current++, role: "bot", text: `${result.mensaje}. Tu número de seguimiento es #${result.id}. El equipo ya recibió la notificación.` }]);
    } catch (error) {
      setContactError(error instanceof Error ? error.message : "No se pudo enviar el mensaje.");
    } finally {
      setSendingContact(false);
    }
  };

  return (
    <>
      {open && (
        <section role="dialog" aria-modal="false" aria-label="Asistente de Patrimonio" className="fixed inset-x-2 bottom-20 z-50 flex h-[min(38rem,calc(100dvh-6rem))] flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-[25rem]">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-900 px-4 py-3 text-white dark:border-slate-700">
            <div className="flex min-w-0 items-center gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan-600"><Bot className="h-5 w-5" /></span><div className="min-w-0"><h2 className="truncate text-sm font-black">Asistente de Patrimonio</h2><p className="text-xs text-slate-300">Orientación y mensajes a Patrimonio</p></div></div>
            <button type="button" onClick={requestClose} title="Cerrar ayuda" aria-label="Cerrar ayuda" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>
          </header>

          {showContactForm ? (
            <form onSubmit={submitContact} className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-900">
              <button type="button" onClick={() => setShowContactForm(false)} className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-cyan-700 dark:text-cyan-300"><ArrowLeft className="h-4 w-4" /> Volver al chat</button>
              <div className="mb-4"><p className="text-xs font-bold uppercase text-cyan-700 dark:text-cyan-300">Mensaje directo</p><h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Contactar a Patrimonio</h3><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">Completá los datos para que el equipo pueda ubicar el caso y darle seguimiento.</p></div>
              <div className="space-y-3">
                {[["nombre_apellido", "Nombre y apellido", "Ej. Ana Pérez"], ["anexo", "Anexo", "Ej. Casa Central"], ["oficina", "Oficina", "Ej. Recepción"]].map(([key, label, placeholder]) => (
                  <label key={key} className="block text-xs font-bold text-slate-700 dark:text-slate-200">{label}<input required maxLength={key === "nombre_apellido" ? 120 : 160} value={contactForm[key as keyof typeof contactForm]} onChange={(event) => setContactForm((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none focus:border-cyan-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
                ))}
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">Consulta<textarea required minLength={10} maxLength={2000} rows={5} value={contactForm.consulta} onChange={(event) => setContactForm((current) => ({ ...current, consulta: event.target.value }))} placeholder="Describí qué necesitás consultar" className="mt-1.5 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none focus:border-cyan-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
                <label className="sr-only" aria-hidden="true">Sitio web<input tabIndex={-1} autoComplete="off" value={contactForm.website} onChange={(event) => setContactForm((current) => ({ ...current, website: event.target.value }))} /></label>
              </div>
              {contactError && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{contactError}</p>}
              <button type="submit" disabled={sendingContact} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-black text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"><Send className="h-4 w-4" />{sendingContact ? "Enviando..." : "Enviar a Patrimonio"}</button>
            </form>
          ) : (
            <>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3 dark:bg-slate-900">
                {messages.map((message) => <div key={message.id} className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}><p className={`max-w-[90%] rounded-md px-3 py-2 text-sm leading-5 ${message.role === "user" ? "bg-cyan-700 text-white" : "border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"}`}>{message.text}</p>{message.offerContact && <button type="button" onClick={() => setShowContactForm(true)} className="mt-2 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-xs font-black text-white hover:bg-emerald-800"><ClipboardPenLine className="h-4 w-4" /> Dejar mensaje a Patrimonio</button>}</div>)}
                {typing && <div className="flex justify-start" role="status" aria-live="polite"><span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">Escribiendo<span className="animate-pulse">...</span></span></div>}
                <div ref={endRef} />
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">{QUICK_QUESTIONS.map((question) => <button key={question} type="button" onClick={() => submit(question)} className="min-h-9 rounded-md border border-slate-300 px-2 py-1.5 text-left text-[11px] font-bold leading-4 text-slate-700 hover:border-cyan-500 hover:text-cyan-700 dark:border-slate-700 dark:text-slate-200">{question}</button>)}</div>
              <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="flex gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"><label className="sr-only" htmlFor="public-help-question">Escribí tu consulta</label><input id="public-help-question" value={input} onChange={(event) => setInput(event.target.value)} disabled={typing} maxLength={500} placeholder="Escribí una pregunta concreta" className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /><button type="submit" disabled={!input.trim() || typing} title="Enviar consulta" aria-label="Enviar consulta" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-700 text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"><Send className="h-4 w-4" /></button></form>
            </>
          )}
          <p className="flex items-center gap-1.5 border-t border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"><MapPin className="h-3.5 w-3.5 shrink-0" /> Atención presencial: Dalmacio Vélez 743</p>
        </section>
      )}

      <button type="button" onClick={requestClose} aria-expanded={open} className="fixed bottom-4 right-3 z-50 inline-flex h-12 items-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-black text-white shadow-lg shadow-cyan-950/30 transition hover:-translate-y-0.5 hover:bg-cyan-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700 sm:bottom-6 sm:right-6"><span className="relative flex h-5 w-5 items-center justify-center">{!open && <span className="absolute inset-0 animate-ping rounded-full bg-white/60 motion-reduce:animate-none" />}{open ? <X className="relative h-5 w-5" /> : <MessageCircleQuestion className="relative h-5 w-5" />}</span>{open ? "Cerrar" : "¿Necesitás ayuda?"}</button>

      {showCloseConfirm && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-4" role="dialog" aria-modal="true" aria-labelledby="close-chat-title"><div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-950"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200"><CheckCircle2 className="h-5 w-5" /></span><div><h2 id="close-chat-title" className="text-lg font-black text-slate-950 dark:text-white">¿Cerrar el chat?</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Al cerrar se borrará esta conversación. Si ya resolviste tus dudas, podés hacerlo tranquilo. Si enviaste un mensaje, la Dirección de Patrimonio ya recibió tu caso.</p></div></div><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setShowCloseConfirm(false)} className="h-11 rounded-md border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">Seguir conversando</button><button type="button" onClick={confirmClose} className="h-11 rounded-md bg-cyan-700 text-sm font-black text-white hover:bg-cyan-800">Cerrar y borrar</button></div></div></div>}
    </>
  );
}
