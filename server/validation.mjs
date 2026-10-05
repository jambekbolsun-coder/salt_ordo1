export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const OUTCOMES = [
  "new",
  "contacted",
  "interested",
  "sold",
  "declined",
  "no_response",
];
export const SOURCES = [
  "meta_ads",
  "website",
  "whatsapp",
  "instagram",
  "phone",
  "referral",
  "offline",
  "manual",
  "other",
];
export function text(value, max = 200, required = false) {
  if (value != null && typeof value !== "string")
    throw new HttpError(400, "Некорректное текстовое поле.");
  const result = (value || "").trim();
  if (result.length > max || (required && !result))
    throw new HttpError(
      400,
      `Проверьте обязательные поля и длину текста (до ${max}).`,
    );
  return result;
}
export function phone(value, optional = false) {
  const raw = text(value, 30);
  if (!raw && optional) return null;
  let digits = raw.replace(/[\s()+.-]/g, "");
  if (!/^\d+$/.test(digits))
    throw new HttpError(400, "Введите корректный телефон с кодом страны.");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("0"))
    digits = `996${digits.slice(1)}`;
  else if (digits.length === 9) digits = `996${digits}`;
  if (!/^[1-9]\d{7,14}$/.test(digits))
    throw new HttpError(400, "Введите корректный телефон с кодом страны.");
  return `+${digits}`;
}
export function uuid(value, optional = false) {
  if (!value && optional) return null;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value || "",
    )
  )
    throw new HttpError(400, "Некорректный идентификатор.");
  return value;
}
export function amount(value) {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(String(value)) || Number(value) <= 0)
    throw new HttpError(
      400,
      "Сумма должна быть положительным числом с точностью до тыйынов.",
    );
  return String(value);
}
export function clientInput(body) {
  const outcome = body.outcome || "new";
  const source = body.source || "manual";
  if (!OUTCOMES.includes(outcome) || !SOURCES.includes(source))
    throw new HttpError(400, "Неизвестный результат или источник.");
  return {
    full_name: text(body.full_name, 150, true),
    phone: phone(body.phone),
    whatsapp: phone(body.whatsapp, true),
    region: text(body.region, 100),
    source,
    campaign: text(body.campaign, 200),
    interest: text(body.interest, 200),
    responsible_id: uuid(body.responsible_id, true),
    outcome,
    note: text(body.note, 2000),
  };
}
export function filters(params) {
  const output = {};
  for (const key of [
    "q",
    "source",
    "campaign",
    "campaign_id", "adset_id", "ad_id", "utm_source",
    "wa_source",
    "region",
    "responsible_id",
    "outcome",
    "sale",
    "archived",
    "sort",
    "from",
    "to",
    "bucket",
  ]) {
    const value = params.get(key);
    if (value) output[key] = text(value, 200);
  }
  for (const key of ["from", "to"])
    if (
      output[key] &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(output[key]) ||
        !Number.isFinite(Date.parse(output[key])) || new Date(output[key]).toISOString().slice(0,10)!==output[key])
    )
      throw new HttpError(400, "Некорректная дата.");
  if (output.from && output.to && output.from > output.to)
    throw new HttpError(400, "Начальная дата позже конечной.");
  if (output.responsible_id) uuid(output.responsible_id);
  if (output.source && !SOURCES.includes(output.source))
    throw new HttpError(400, "Неизвестный источник.");
  if(output.wa_source&&!['all','meta_ads','website','whatsapp'].includes(output.wa_source))throw new HttpError(400,'Неизвестный источник WhatsApp.');
  if (output.outcome && !OUTCOMES.includes(output.outcome))
    throw new HttpError(400, "Неизвестный результат.");
  output.page = Math.max(1, Math.min(1000000, Number(params.get("page")) || 1));
  output.limit = Math.max(1, Math.min(100, Number(params.get("limit")) || 25));
  if (!Number.isInteger(output.page) || !Number.isInteger(output.limit))
    throw new HttpError(400, "Некорректная страница.");
  return output;
}
export function csv(rows, columns) {
  const cell = (value) => {
    let v = String(value ?? "");
    // Spreadsheet formula injection also applies to phone numbers beginning with +.
    if (/^[\s]*[=+\-@\t\r]/.test(v)) v = `'${v}`;
    return `"${v.replaceAll('"', '""')}"`;
  };
  return (
    "\uFEFF" +
    [
      columns.map((c) => cell(c[1])).join(";"),
      ...rows.map((row) => columns.map((c) => cell(row[c[0]])).join(";")),
    ].join("\r\n")
  );
}
export function attribution(input, marketing) {
  if (marketing !== true) return {};
  const result = {};
  for (const k of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "campaign_id",
    "adset_id",
    "ad_id",
    "campaign_name",
    "adset_name",
    "ad_name",
    "fbclid",
  ]) {
    if (input?.[k]) result[k] = text(input[k], 250);
  }
  if(input?.landing_page)try{const url=new URL(input.landing_page);if(["https:","http:"].includes(url.protocol))result.landing_page=(url.origin+url.pathname).slice(0,500)}catch{/* Invalid URL. */}
  if (input?.referrer) {
    try {
      const url = new URL(input.referrer);
      if (["https:", "http:"].includes(url.protocol))
        result.referrer = url.origin;
    } catch {
      /* Ignore malformed referrers. */
    }
  }
  return result;
}
