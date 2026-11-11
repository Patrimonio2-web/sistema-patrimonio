type DateFormatMode = "auto" | "date" | "datetime";

const ARG_TIME_ZONE = "America/Argentina/Buenos_Aires";
const MONTHS_EN: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

function pad(value: string | number) {
  return String(value).padStart(2, "0");
}

function buildDate(
  day: string,
  month: string,
  year: string,
  hour?: string,
  minute?: string,
  mode: DateFormatMode = "auto"
) {
  const datePart = `${pad(day)}/${pad(month)}/${year}`;
  const hasTime = hour !== undefined && minute !== undefined;

  if (mode === "date" || !hasTime) return datePart;
  return `${datePart} ${pad(hour)}:${pad(minute)}`;
}

function formatRealDate(date: Date, mode: DateFormatMode) {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: ARG_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };

  if (mode !== "date") {
    options.hour = "2-digit";
    options.minute = "2-digit";
    options.hour12 = false;
  }

  return new Intl.DateTimeFormat("es-AR", options).format(date).replace(",", "");
}

export function formatMobiliarioDate(
  value?: string | number | Date | null,
  mode: DateFormatMode = "auto"
) {
  if (value === undefined || value === null || value === "") return "-";

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "-" : formatRealDate(value, mode);
  }

  const raw = String(value).trim();
  if (!raw) return "-";

  const httpDateMatch = raw.match(
    /^(?:[A-Za-z]{3},\s*)?(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})(?:\s+\d{2}:\d{2}:\d{2}\s+GMT)?$/
  );
  if (mode === "date" && httpDateMatch) {
    const [, day, monthName, year] = httpDateMatch;
    const month = MONTHS_EN[monthName.toLowerCase()];
    if (month) return buildDate(day, month, year, undefined, undefined, "date");
  }

  const slashMatch = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T,]+(\d{1,2}):(\d{2})(?::\d{2})?)?$/
  );
  if (slashMatch) {
    const [, day, month, year, hour, minute] = slashMatch;
    return buildDate(day, month, year, hour, minute, mode);
  }

  const isoMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s]+(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/
  );
  if (isoMatch) {
    const [, year, month, day, hour, minute, zone] = isoMatch;
    if (zone) {
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime())
        ? raw
        : formatRealDate(parsed, mode === "auto" ? "datetime" : mode);
    }

    return buildDate(day, month, year, hour, minute, mode);
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return formatRealDate(parsed, mode);
  }

  return raw;
}
