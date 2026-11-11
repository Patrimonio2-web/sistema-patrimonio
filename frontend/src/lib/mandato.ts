
export type MandatoInfo = {
  daysLeft: number;
  status: "ok" | "warning" | "danger" | "expired";
  endDate: Date;
  startDate: Date | null;
  progress: number;
};

export function parseMandato(mandato: string, cutoffMonth = 11, cutoffDay = 10): MandatoInfo {
  const m = mandato.match(/(\d{4})\s*-\s*(\d{4})/);
  if (!m) {
    return {
      daysLeft: Number.POSITIVE_INFINITY,
      status: "ok",
      endDate: new Date(2100, 0, 1),
      startDate: null,
      progress: 0,
    };
  }
  const startYear = Number(m[1]);
  const endYear = Number(m[2]);
  const startDate = new Date(startYear, 11, 10, 0, 0, 0);
  const endDate = new Date(endYear, cutoffMonth, cutoffDay, 23, 59, 59);

  const now = new Date();
  const daysLeft = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let status: MandatoInfo["status"] = "ok";
  if (daysLeft < 0) status = "expired";
  else if (daysLeft <= 30) status = "danger";
  else if (daysLeft <= 90) status = "warning";

  const span = endDate.getTime() - startDate.getTime();
  const done = Math.min(Math.max(now.getTime() - startDate.getTime(), 0), Math.max(span, 1));
  const progress = Math.round((done / Math.max(span, 1)) * 100);

  return { daysLeft, status, endDate, startDate, progress };
}
