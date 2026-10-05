import { HttpError } from "./validation.mjs";

export function config() {
  const url = process.env.SALT_SUPABASE_URL;
  const key = process.env.SALT_SUPABASE_PUBLISHABLE_KEY;
  const service = process.env.SALT_GATEWAY_SECRET;
  if (!url || !key || !service)
    throw new HttpError(503, "Сервис ещё не настроен. Обратитесь к владельцу.");
  return { url, key, service };
}
/** @param {string} path @param {{method?:string,body?:unknown,token?:string,privileged?:boolean,headers?:Record<string,string>}} [options] */
export async function upstream(
  path,
  { method = "GET", body, token, privileged = false, headers = {} } = {},
) {
  const c = config();
  if (privileged && !/^\/rest\/v1\/rpc\/[a-z_]+$/.test(path))
    throw new HttpError(403, "Недопустимый запрос.");
  const res = await fetch(
    `${c.url}${privileged ? "/functions/v1/crm-gateway" : path}`,
    {
      method,
      headers: {
        apikey: c.key,
        ...(privileged ? { "x-salt-gateway": c.service } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
        ...headers,
      },
      body:
        body === undefined
          ? undefined
          : JSON.stringify(
              privileged ? { rpc: path.split("/").pop(), payload: body } : body,
            ),
      signal: AbortSignal.timeout(25000),
      cache: "no-store",
    },
  );
  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    throw new HttpError(502, "Сервис вернул некорректный ответ.");
  }
  if (!res.ok) {
    const known = {
      42501: "Недостаточно прав.",
      23505: "Такой телефон уже существует. Откройте найденную карточку.",
      P0002: "Запись не найдена.",
      40001: "Запись изменена другим сотрудником. Обновите страницу.",
      22023: "Проверьте введённые данные.",
    };
    const status = ({23505:409,40001:409,P0002:404,42501:403,22023:400})[data?.code] || (res.status>=500?503:res.status);
    throw new HttpError(
      status,
      known[data?.code] ||
        (path.startsWith("/auth/")
          ? "Не удалось войти. Проверьте email и пароль."
          : "Не удалось выполнить запрос. Попробуйте ещё раз."),
    );
  }
  return data;
}
export const rpc = (name, body) =>
  upstream(`/rest/v1/rpc/${name}`, { method: "POST", body, privileged: true });
export const crm = (operation, payload, actor) =>
  rpc("salt_crm_api", {
    p_operation: operation,
    p_payload: payload,
    p_actor: actor,
  });
