import {
  HttpError,
  text,
  uuid,
  amount,
  clientInput,
  filters,
  csv,
} from "../server/validation.mjs";
import {
  config as getConfig,
  upstream,
  rpc,
  crm,
} from "../server/supabase.mjs";
import {
  checkOrigin,
  ipKey,
  limit,
  session,
  createSession,
  cookie,
  hash,
  setCookie,
} from "../server/security.mjs";
import { publicRequest } from "../server/public.mjs";

export const config = { api: { bodyParser: false } };
export const maxDuration = 300;
async function read(req, max = 65536) {
  if(req.body!==undefined){
    const value=Buffer.isBuffer(req.body)?req.body:Buffer.from(typeof req.body==="string"?req.body:JSON.stringify(req.body));
    if(value.length>max)throw new HttpError(413,"Слишком большой запрос.");
    return value;
  }
  const parts = [];
  let size = 0;
  for await (const part of req) {
    size += part.length;
    if (size > max) throw new HttpError(413, "Слишком большой запрос.");
    parts.push(part);
  }
  return Buffer.concat(parts);
}
const columns = [
  ["full_name", "ФИО"],
  ["phone", "Телефон"],
  ["whatsapp", "WhatsApp"],
  ["region", "Регион"],
  ["source", "Источник"],
  ["campaign", "Кампания"],
  ["interest", "Товар"],
  ["first_contact_at", "Первое обращение"],
  ["last_contact_at", "Последнее обращение"],
  ["responsible_name", "Ответственный"],
  ["sale_total", "Сумма продаж, KGS"],
  ["outcome", "Результат"],
  ["note", "Примечание"],
];
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  const send = (data) => res.end(JSON.stringify(data));
  try {
    if (!["GET", "POST", "PATCH", "DELETE", "PUT"].includes(req.method))
      throw new HttpError(405, "Метод запрещён.");
    checkOrigin(req);
    const params = new URL(req.url, "https://local.invalid").searchParams,
      route = params.get("route") || "";
    await limit(res, `ip:${ipKey(req)}`);
    const raw =
      req.method === "GET"
        ? Buffer.alloc(0)
        : await read(req, route === "proxy" ? 4 * 1024 * 1024 : 65536);
    let body = {};
    if (raw.length && route !== "proxy") {
      try {
        body = JSON.parse(raw.toString());
      } catch {
        throw new HttpError(400, "Некорректный JSON.");
      }
    }
    if(!body||typeof body!=="object"||Array.isArray(body))throw new HttpError(400,"Некорректный запрос.");
    if (route === "public" && req.method === "POST") {
      if (
        ["create_public_lead", "create_public_order"].includes(body.operation)
      )
        await limit(res, `public-form:${ipKey(req)}`, 5, 60);
      return send(await publicRequest(body));
    }
    if (route === "login" && req.method === "POST") {
      const email = text(body.email, 254, true).toLowerCase();
      text(body.password,256,true);
      const password=body.password;
      await limit(res, `login-ip:${ipKey(req)}`, 5, 60);
      await limit(res, `login-email:${hash(email)}`, 10, 900);
      const auth = await upstream("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: { email, password },
      });
      return send(await createSession(res, auth));
    }
    if (route === "logout" && req.method === "POST") {
      const token = cookie(req);
      if(token)try{const who=await session(req,res);await rpc("salt_crm_security_event",{p_actor:who.user.id,p_action:"logout"})}catch{/* Expired sessions must still be cleared. */}
      if (token)
        await rpc("salt_crm_session", {
          p_operation: "delete",
          p_id: hash(token),
          p_payload: {},
        });
      setCookie(res, "", 0);
      return send({ ok: true });
    }
    if(route==="session"&&req.method==="GET"&&!cookie(req))return send({user:null,staff:null});
    const who = await session(req, res);
    if (route === "session" && req.method === "GET")
      return send({ user: who.user, staff: who.staff });
    if (route === "password" && req.method === "POST") {
      await limit(res, `password:${who.user.id}`, 3, 900);
      text(body.password,256,true);
      const password=body.password;
      if (password.length < 12)
        throw new HttpError(
          400,
          "Новый пароль должен содержать минимум 12 символов.",
        );
      await upstream("/auth/v1/user", {
        method: "PUT",
        token: who.tokens.access_token,
        body: { password },
      });
      await rpc("salt_crm_security_event",{p_actor:who.user.id,p_action:"password_changed"});
      return send({ ok: true });
    }
    if (route === "proxy") {
      const path = params.get("path") || "";
      const allowed =
        /^\/rest\/v1\/(products|product_images|categories|staff|site_settings|chatbot_settings|chatbot_faqs|leads|analytics_events|quiz_sessions|quiz_answers|orders|order_items)(\?|$)/.test(
          path,
        ) ||
        /^\/rest\/v1\/rpc\/(admin_list_products|admin_get_product|admin_upsert_product|admin_delete_product)(\?|$)/.test(
          path,
        ) ||
        /^\/storage\/v1\/object\/(product-images\/|product-images$)/.test(
          path,
        ) ||
        path === "/functions/v1/create-staff";
      if (!allowed || path.includes("..") || path.includes("#"))
        throw new HttpError(403, "Недопустимый запрос.");
      if (
        ((path.startsWith("/rest/v1/staff") && req.method !== "GET") ||
          path === "/functions/v1/create-staff") &&
        who.staff.role !== "owner"
      )
        throw new HttpError(403, "Управление сотрудниками доступно владельцу.");
      if (req.method !== "GET")
        await limit(res, `write:${who.user.id}`, 30, 60);
      const c = getConfig();
      const headers = {
        apikey: c.key,
        Authorization: `Bearer ${who.tokens.access_token}`,
      };
      for (const name of ["content-type", "prefer", "range", "x-upsert"])
        if (req.headers[name]) headers[name] = req.headers[name];
      const response = await fetch(c.url + path, {
        method: req.method,
        headers,
        body: raw.length ? raw : undefined,
        signal: AbortSignal.timeout(25000),
        cache: "no-store",
      });
      res.statusCode = response.status;
      for (const name of ["content-type", "content-range"])
        if (response.headers.has(name))
          res.setHeader(name, response.headers.get(name));
      return res.end(Buffer.from(await response.arrayBuffer()));
    }
    if (!["owner", "admin"].includes(who.staff.role))
      throw new HttpError(403, "CRM доступна только администраторам.");
    if (req.method === "GET") {
      if (route === "options")
        return send(await crm("options", {}, who.user.id));
      if (route === "clients")
        return send(await crm("list", filters(params), who.user.id));
      if (route === "client")
        return send(
          await crm(
            "detail",
            {
              id: uuid(params.get("id")),
              offset: Math.max(
                0,
                Math.floor(Number(params.get("offset")) || 0),
              ),
            },
            who.user.id,
          ),
        );
      if (route === "reports")
        return send(
          await rpc("salt_crm_reports", {
            p_payload: filters(params),
            p_actor: who.user.id,
          }),
        );
      if (route === "export") {
        await limit(res, `export:${who.user.id}`, 3, 60);
        const f = filters(params),
          report = params.get("type") === "report";

        const metricNames={total_clients:'Всего клиентов',new_clients:'Новых клиентов',inquiries:'Обращений',repeat_inquiries:'Повторных обращений',meta_inquiries:'Обращений из Meta Ads',website_inquiries:'Обращений с сайта',sales:'Продаж',revenue:'Сумма продаж',average_sale:'Средняя продажа'};
        const sectionNames={regions:'Регионы',interests:'Товары',timeline:'Динамика'};
        const first=report ? await rpc("salt_crm_reports",{p_payload:f,p_actor:who.user.id}) : await crm("list",{...f,page:1,limit:100},who.user.id);
        await rpc("salt_crm_security_event",{p_actor:who.user.id,p_action:report?"export_reports":"export_clients"});
        res.setHeader("Content-Type","text/csv; charset=utf-8");
        res.setHeader("Content-Disposition",'attachment; filename="salt-ordo.csv"');
        if(report){
          const rows=[];
          for(const [key,value] of Object.entries(first.current)) if(typeof value==="number") rows.push({section:"Показатели",name:metricNames[key]||key,current:value,previous:first.previous[key]});
          for(const s of first.current.sources) rows.push({section:"Источники",name:s.name,clients:s.clients,inquiries:s.inquiries,sales:s.sales,revenue:s.revenue});
          for(const section of ["regions","interests","timeline"])for(const r of first.current[section])rows.push({section:sectionNames[section],name:r.name||r.period,inquiries:r.inquiries});
          return res.end(csv(rows,[["section","Раздел"],["name","Показатель"],["current","Текущий период"],["previous","Предыдущий период"],["clients","Новые клиенты"],["inquiries","Обращения"],["sales","Продажи"],["revenue","Выручка, KGS"]]));
        }
        res.write(csv(first.items,columns));
        for(let page=2;(page-1)*100<first.total;page++){
          if(res.destroyed)return;
          const batch=await crm("list",{...f,page,limit:100},who.user.id);
          const chunk=csv(batch.items,columns).split("\r\n").slice(1).join("\r\n");
          if(chunk)res.write("\r\n"+chunk);
        }
        return res.end();
      }
      throw new HttpError(404, "Страница не найдена.");
    }
    await limit(res, `crm-write:${who.user.id}`, 30, 60);
    if (req.method !== "POST") throw new HttpError(405, "Метод запрещён.");
    let payload;
    if (route === "create" || route === "inquiry")
      payload = { ...clientInput(body), request_id: uuid(body.request_id) };
    else if (route === "update") {
      if (!Number.isInteger(body.version) || body.version < 1)
        throw new HttpError(400, "Некорректная версия записи.");
      payload = {
        ...clientInput(body),
        id: uuid(body.id),
        version: body.version,
      };
    } else if (["archive", "restore"].includes(route))
      payload = { id: uuid(body.id) };
    else if (route === "note")
      payload = { id: uuid(body.id), body: text(body.body, 4000, true) };
    else if (route === "sale")
      payload = {
        id: uuid(body.id),
        amount: amount(body.amount),
        request_id: uuid(body.request_id),
      };
    else if (route === "void_sale")
      payload = {
        id: uuid(body.id),
        sale_id: uuid(body.sale_id),
        reason: text(body.reason, 500, true),
      };
    else if (route === "settings") {
      if (
        !Number.isInteger(body.retention_days) ||
        body.retention_days < 30 ||
        body.retention_days > 3650
      )
        throw new HttpError(400, "Укажите срок от 30 до 3650 дней.");
      payload = { retention_days: body.retention_days };
    } else if (route === "source") {
      if (typeof body.active !== "boolean")
        throw new HttpError(400, "Некорректное значение.");
      payload = { code: text(body.code, 30, true), active: body.active };
    } else throw new HttpError(404, "Страница не найдена.");
    return send(await crm(route, payload, who.user.id));
  } catch (error) {
    if(res.headersSent){res.destroy();return;}
    res.statusCode = error instanceof HttpError ? error.status : 503;
    return send({
      error:
        error instanceof HttpError
          ? error.message
          : "Сервис временно недоступен. Попробуйте позже.",
    });
  }
}
