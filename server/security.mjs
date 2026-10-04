import {
  createHash,
  createHmac,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { HttpError } from "./validation.mjs";
import { rpc, upstream } from "./supabase.mjs";

const COOKIE = "__Host-salt-session";
function key() {
  const k = Buffer.from(process.env.SALT_SESSION_KEY || "", "base64");
  if (k.length !== 32)
    throw new HttpError(503, "Сервис авторизации не настроен.");
  return k;
}
export function seal(value) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  const content = Buffer.concat([
    cipher.update(JSON.stringify(value)),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), content]).toString(
    "base64url",
  );
}
export function unseal(value) {
  const bytes = Buffer.from(value, "base64url"),
    cipher = createDecipheriv("aes-256-gcm", key(), bytes.subarray(0, 12));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([
      cipher.update(bytes.subarray(28)),
      cipher.final(),
    ]).toString(),
  );
}
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export function cookie(req) {
  const name =
    process.env.NODE_ENV === "development" ? "salt-dev-session" : COOKIE;
  return (
    (req.headers.cookie || "")
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${name}=`))
      ?.slice(name.length + 1) || ""
  );
}
export function setCookie(res, value, age = 28800) {
  const dev = process.env.NODE_ENV === "development";
  res.setHeader(
    "Set-Cookie",
    `${dev ? "salt-dev-session" : COOKIE}=${value}; Path=/; HttpOnly; ${dev ? "" : "Secure; "}SameSite=Strict; Max-Age=${age}`,
  );
}
export function checkOrigin(req) {
  if (["GET", "HEAD"].includes(req.method)) return;
  const allowed = new Set([
    process.env.SALT_APP_ORIGIN || "https://salt-ordo1.vercel.app",
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.NODE_ENV === "development"
      ? ["http://localhost:5173", "http://127.0.0.1:5173"]
      : []),
  ]);
  if (
    !allowed.has(req.headers.origin) ||
    req.headers["sec-fetch-site"] === "cross-site" ||
    req.headers["x-salt-request"] !== "1"
  )
    throw new HttpError(403, "Запрос с другого сайта запрещён.");
}
export function ipKey(req) {
  // Vercel overwrites x-vercel-forwarded-for. Never trust client x-forwarded-for.
  const ip = process.env.VERCEL
    ? req.headers["x-vercel-forwarded-for"]
    : req.socket?.remoteAddress;
  return createHmac("sha256", key())
    .update(String(ip || "unknown"))
    .digest("hex");
}
export async function limit(res, bucket, max = 10, seconds = 1) {
  const result = await rpc("salt_crm_rate_limit", {
    p_key: bucket,
    p_limit: max,
    p_seconds: seconds,
  });
  if (!result.allowed) {
    res.setHeader("Retry-After", String(result.retry_after || seconds));
    throw new HttpError(
      429,
      "Слишком много запросов. Подождите и повторите попытку.",
    );
  }
}
export async function identity(accessToken) {
  const user = await upstream("/auth/v1/user", { token: accessToken });
  const staff = await upstream(
    `/rest/v1/staff?user_id=eq.${encodeURIComponent(user.id)}&is_active=eq.true&select=id,user_id,email,full_name,role,is_active`,
    { token: accessToken },
  );
  if (!staff?.length)
    throw new HttpError(
      403,
      "У аккаунта нет доступа к административной системе.",
    );
  return { user: { id: user.id, email: user.email }, staff: staff[0] };
}
export async function session(req, res) {
  const raw = cookie(req);
  if (!/^[a-zA-Z0-9_-]{43}$/.test(raw))
    throw new HttpError(401, "Войдите в систему.");
  const id = hash(raw);
  const data = await rpc("salt_crm_session", {
    p_operation: "get",
    p_id: id,
    p_payload: {},
  });
  if (!data) {
    setCookie(res, "", 0);
    throw new HttpError(401, "Сессия истекла. Войдите снова.");
  }
  let tokens;
  try {
    tokens = unseal(data.tokens);
  } catch {
    throw new HttpError(401, "Войдите снова.");
  }
  if (tokens.expires_at < Date.now() / 1000 + 30) {
    const fresh = await upstream("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: { refresh_token: tokens.refresh_token },
    });
    tokens = {
      access_token: fresh.access_token,
      refresh_token: fresh.refresh_token,
      expires_at: fresh.expires_at || Math.floor(Date.now()/1000)+(fresh.expires_in||3600),
    };
    await rpc("salt_crm_session", {
      p_operation: "rotate",
      p_id: id,
      p_payload: { tokens: seal(tokens) },
    });
  }
  const who = await identity(tokens.access_token);
  await limit(res, `user:${who.user.id}`);
  return { ...who, tokens, id };
}
export async function createSession(res, auth) {
  const who = await identity(auth.access_token);
  const raw = randomBytes(32).toString("base64url");
  await rpc("salt_crm_session", {
    p_operation: "create",
    p_id: hash(raw),
    p_payload: {
      user_id: who.user.id,
      tokens: seal({
        access_token: auth.access_token,
        refresh_token: auth.refresh_token,
        expires_at: auth.expires_at || Math.floor(Date.now()/1000)+(auth.expires_in||3600),
      }),
    },
  });
  setCookie(res, raw);
  await rpc("salt_crm_security_event",{p_actor:who.user.id,p_action:"login"});
  return who;
}
