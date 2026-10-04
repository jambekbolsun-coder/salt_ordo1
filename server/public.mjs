import { HttpError, text, uuid, phone, attribution } from "./validation.mjs";
import { rpc } from "./supabase.mjs";
const operations = [
  "create_public_order",
  "create_public_lead",
  "start_public_quiz",
  "save_public_quiz_answer",
  "complete_public_quiz",
  "dismiss_public_quiz",
  "track_public_event",
];
export async function publicRequest(body) {
  if (!operations.includes(body.operation))
    throw new HttpError(404, "Запрос не найден.");
  const p = body.payload || {},
    c = body.consent,
    valid =
      c?.version === "2026-10-04.1" &&
      Number.isFinite(Date.parse(c.date)) &&
      Date.parse(c.date) <= Date.now() + 60000 &&
      Date.now() - Date.parse(c.date) < 180 * 86400000;
  const analytics = valid && c.analytics === true,
    marketing = valid && c.marketing === true;
  let data = {};
  if (["create_public_order", "create_public_lead"].includes(body.operation)) {
    data = {
      p_customer_name: text(p.p_customer_name, 100, true),
      p_phone: phone(p.p_phone),
    };
    if (data.p_customer_name.length < 2)
      throw new HttpError(400, "Введите имя.");
  } else {
    if (!analytics) return null;
    data = {
      p_visitor_id: uuid(p.p_visitor_id),
      p_session_id: uuid(p.p_session_id),
    };
  }
  switch (body.operation) {
    case "create_public_order":
      if (
        !Array.isArray(p.p_items) ||
        p.p_items.length < 1 ||
        p.p_items.length > 50
      )
        throw new HttpError(400, "Проверьте корзину.");
      Object.assign(data, {
        p_city: text(p.p_city, 100),
        p_delivery_method: text(p.p_delivery_method, 60),
        p_note: text(p.p_note, 2000),
        p_language: ["ru", "kg", "en"].includes(p.p_language)
          ? p.p_language
          : "ru",
        p_items: p.p_items.map((i) => {
          if (
            !Number.isInteger(i.quantity) ||
            i.quantity < 1 ||
            i.quantity > 99
          )
            throw new HttpError(400, "Проверьте количество.");
          return { product_id: uuid(i.product_id), quantity: i.quantity };
        }),
      });
      data.email=text(p.p_email,160);
      if(data.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))throw new HttpError(400,"Введите корректный email.");
      data.request_id=uuid(p.p_request_id);
      data.attribution=attribution(body.attribution,marketing);
      data.consent=valid?{version:c.version,date:c.date,analytics,marketing}:null;
      return rpc("salt_crm_public_order",{p_data:data});
    case "create_public_lead": {
      const email = text(p.p_email, 160);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new HttpError(400, "Введите корректный email.");
      return rpc("salt_crm_public_lead", {
        p_data: {
          ...data,
          source: [
            "product",
            "contact",
            "checkout",
            "quiz",
            "whatsapp",
          ].includes(p.p_source)
            ? p.p_source
            : "contact",
          email,
          message: text(p.p_message, 2000),
          product_id: uuid(p.p_product_id, true),
          attribution: attribution(body.attribution, marketing),
          consent: valid
            ? { version: c.version, date: c.date, analytics, marketing }
            : null,
        },
      });
    }
    case "start_public_quiz":
      data.p_language = ["ru", "kg", "en"].includes(p.p_language)
        ? p.p_language
        : "ru";
      break;
    case "save_public_quiz_answer":
      Object.assign(data, {
        p_quiz_session_id: uuid(p.p_quiz_session_id),
        p_question_key: text(p.p_question_key, 60, true),
        p_answer: text(p.p_answer, 300, true),
      });
      break;
    case "complete_public_quiz":
      Object.assign(data, {
        p_quiz_session_id: uuid(p.p_quiz_session_id),
        p_category_slugs: Array.isArray(p.p_category_slugs)
          ? p.p_category_slugs.slice(0, 20).map((s) => text(s, 100))
          : [],
      });
      break;
    case "dismiss_public_quiz":
      data.p_quiz_session_id = uuid(p.p_quiz_session_id);
      break;
    case "track_public_event":
      Object.assign(data, {
        p_event_type: text(p.p_event_type, 60, true),
        p_path: text(p.p_path, 500).split("?")[0],
        p_product_id: uuid(p.p_product_id, true),
        p_category_slug: text(p.p_category_slug, 100),
        p_metadata: {},
      });
      break;
  }
  return rpc(body.operation, data);
}
