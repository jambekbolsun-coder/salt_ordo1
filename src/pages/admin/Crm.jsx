import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { request, outcomeNames, money, date } from "../../lib/crm";
import { useAuth } from "../../state/AuthContext";
import { WhatsAppConnection, WhatsAppHistory, WhatsAppPreview } from "../../components/WhatsAppCrm";
import "../../crm.css";
const auditNames={whatsapp_received:"Сообщение WhatsApp",inquiry_added:"Добавлено обращение",update:"Изменена карточка",note:"Добавлена заметка",sale:"Записана продажа",void_sale:"Отменена продажа",archive:"Перенесён в архив",restore:"Восстановлен"};
const fieldNames={full_name:"ФИО",phone:"Телефон",whatsapp:"WhatsApp",region:"Регион",source:"Источник",campaign:"Кампания",interest:"Товар",responsible_id:"Ответственный",outcome:"Результат",note:"Примечание",version:"Версия",updated_at:"Дата изменения",amount:"Сумма",sale_id:"Номер продажи",reason:"Причина",duplicate:"Повторное обращение"};

function useData(route, query = "", revision = 0) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  useEffect(() => {
    const abort = new AbortController();
    setState({ loading: true, data: null, error: "" });
    request(route, undefined, query, abort.signal)
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((error) => {
        if (!abort.signal.aborted)
          setState({ loading: false, data: null, error: error.message });
      });
    return () => abort.abort();
  }, [route, query, revision]);
  return state;
}
function State({ state, children }) {
  if (state.loading)
    return (
      <p className="crm-empty" role="status">
        Загружаем данные…
      </p>
    );
  if (state.error)
    return (
      <div className="notice notice--error" role="alert">
        {state.error}{" "}
        <button onClick={() => window.location.reload()}>Повторить</button>
      </div>
    );
  return children;
}
function Layout() {
  const [revision,setRevision]=useState(0);
  const options = useData("options","",revision);
  return (
    <div className="crm">
      <header className="crm-heading">
        <div>
          <span className="eyebrow">Salt Ordo · CRM</span>
          <h1>Клиенты</h1>
          <p>Обращения, продажи и результаты вашей команды.</p>
        </div>
        <Link className="btn btn--primary" to="/admin/clients/new">
          Добавить клиента
        </Link>
      </header>
      <nav className="crm-tabs" aria-label="Разделы CRM">
        {[
          ["", "Обзор"],
          ["list", "База клиентов"],
          ["reports", "Отчёты"],
          ["sources", "Источники"],
          ["settings", "Настройки CRM"],
        ].map(([path, label]) => (
          <NavLink
            key={path}
            end
            to={`/admin/clients${path ? "/" + path : ""}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <State state={options}>
        <Outlet context={{...options.data,refreshOptions:()=>setRevision(v=>v+1)}} />
      </State>
    </div>
  );
}
const filterLabels = {
  q: "Поиск",
  from: "С даты",
  to: "По дату",
  source: "Источник",
  wa_source: "WhatsApp",
  campaign: "Кампания",
  campaign_id:"ID кампании", adset_id:"ID группы объявлений", ad_id:"ID объявления", utm_source:"UTM source",
  region: "Регион",
  responsible_id: "Ответственный",
  outcome: "Результат",
  sale: "Продажа",
  archived: "Архив",
};
function Filters({ reports = false }) {
  const options = useOutletContext(),
    [params, setParams] = useSearchParams();
  const submit = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();
    for (const [k, v] of new FormData(e.currentTarget)) if (v) next.set(k, v);
    setParams(next);
    e.currentTarget.closest("details").open=false;
  };
  return (
    <details className="crm-filters">
      <summary>
        Поиск и фильтры ·{" "}
        {Object.keys(filterLabels).filter((k) => params.has(k)).length}
      </summary>
      <form onSubmit={submit} key={params.toString()} className="crm-form">
        <label>
          ФИО или телефон
          <input
            name="q"
            defaultValue={params.get("q") || ""}
            maxLength={150}
            type="search"
          />
        </label>
        <label>
          {reports ? "Начало периода" : "Первое обращение с"}
          <input
            type="date"
            name="from"
            defaultValue={params.get("from") || ""}
          />
        </label>
        <label>
          {reports ? "Конец периода" : "Первое обращение по"}
          <input type="date" name="to" defaultValue={params.get("to") || ""} />
        </label>
        <Select
          name="source"
          label="Источник"
          values={options.sources.map((s) => [s.code, s.name])}
          current={params.get("source")}
        />
        {['campaign_id','adset_id','ad_id','utm_source'].map(k=><label key={k}>{filterLabels[k]}<input name={k} defaultValue={params.get(k)||''} maxLength={200}/></label>)}
        <Select name="wa_source" label="Обращения WhatsApp" values={[["all","Все WhatsApp"],["meta_ads","Meta Ads"],["website","Сайт"],["whatsapp","WhatsApp без рекламы"]]} current={params.get('wa_source')}/>
        <label>
          Кампания
          <input
            name="campaign"
            list="crm-campaigns"
            defaultValue={params.get("campaign") || ""}
          />
          <datalist id="crm-campaigns">
            {options.campaigns.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label>
          Регион
          <input
            name="region"
            list="crm-regions"
            defaultValue={params.get("region") || ""}
          />
          <datalist id="crm-regions">
            {options.regions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <Select
          name="responsible_id"
          label="Ответственный"
          values={options.staff.map((s) => [s.id, s.full_name])}
          current={params.get("responsible_id")}
        />
        <Select
          name="outcome"
          label="Результат"
          values={Object.entries(outcomeNames)}
          current={params.get("outcome")}
        />
        <Select
          name="sale"
          label="Наличие продажи"
          values={[
            ["yes", "Есть продажа"],
            ["no", "Без продажи"],
          ]}
          current={params.get("sale")}
        />
        <Select
          name="archived"
          label="Архив"
          values={[
            ["yes", "В архиве"],
            ["all", "Все записи"],
          ]}
          current={params.get("archived")}
          empty="Активные"
        />
        {!reports && (
          <Select
            name="sort"
            label="Сортировка"
            values={[
              ["activity", "Последнее обращение"],
              ["amount", "Сумма продаж"],
              ["oldest", "Сначала старые"],
            ]}
            current={params.get("sort")}
            empty="Сначала новые"
          />
        )}
        {reports && (
          <Select
            name="bucket"
            label="Группировка"
            values={[
              ["week", "По неделям"],
              ["month", "По месяцам"],
            ]}
            current={params.get("bucket")}
            empty="По дням"
          />
        )}
        <div className="crm-actions">
          <button className="btn btn--primary">Применить</button>
          <button
            type="button"
            className="btn btn--soft"
            onClick={() => setParams({})}
          >
            Сбросить всё
          </button>
        </div>
      </form>
    </details>
  );
}
function Select({ name, label, values, current, empty = "Все" }) {
  return (
    <label>
      {label}
      <select name={name} defaultValue={current || ""}>
        <option value="">{empty}</option>
        {values.map(([key, name]) => (
          <option key={key} value={key}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
function Chips() {
  const [p, set] = useSearchParams(),
    options = useOutletContext();
  const label = (key, value) =>
    key === "source"
      ? options.sources.find((s) => s.code === value)?.name
      : key === "responsible_id"
        ? options.staff.find((s) => s.id === value)?.full_name
        : key === "outcome"
          ? outcomeNames[value]
          : key==="wa_source" ? (value==='all'?'Все WhatsApp':options.sources.find(s=>s.code===value)?.name) : key==="sale" ? (value==="yes"?"Есть":"Нет") : key==="archived"?(value==="all"?"Все записи":"В архиве"):value;
  return (
    <div className="crm-chips">
      {Object.entries(filterLabels)
        .filter(([k]) => p.has(k))
        .map(([k, l]) => (
          <button
            key={k}
            onClick={() => {
              const next = new URLSearchParams(p);
              next.delete(k);
              next.delete("page");
              set(next);
            }}
            aria-label={`Убрать фильтр ${l}`}
          >
            {l}: {label(k, p.get(k))} ×
          </button>
        ))}
    </div>
  );
}
function Export({ report = false }) {
  const [p] = useSearchParams(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const download = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/index?route=export&type=${report ? "report" : "clients"}&${p}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error((await response.json()).error);
      const url = URL.createObjectURL(await response.blob()),
        a = document.createElement("a");
      a.href = url;
      a.download = report ? "salt-ordo-report.csv" : "salt-ordo-clients.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <button className="btn btn--soft" disabled={busy} onClick={download}>
        {busy ? "Готовим файл…" : "Экспорт CSV"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
function List() {
  const [p, set] = useSearchParams(),
    options = useOutletContext(),
    state = useData("clients", p.toString()),
    page = Number(p.get("page")) || 1;
  const move = (step) => {
    const next = new URLSearchParams(p);
    next.set("page", String(page + step));
    set(next);
  };
  return (
    <>
      <Filters />
      <Chips />
      <div className="crm-toolbar">
        <h2>
          База клиентов {state.data && <small>· {state.data.total}</small>}
        </h2>
        <Export />
      </div>
      <State state={state}>
        {state.data && (
          <>
            {!state.data.items.length ? (
              <div className="crm-empty">
                <h3>Клиенты не найдены</h3>
                <p>Измените фильтры или добавьте первое обращение.</p>
              </div>
            ) : (
              <div className="crm-list">
                {state.data.items.map((c) => (
                  <article className="crm-client" key={c.id}>
                    <div>
                      <Link
                        className="crm-client-name"
                        to={`/admin/clients/${c.id}`}
                        state={{ back: p.toString() }}
                      >
                        {c.full_name}
                      </Link>
                      <a href={`tel:${c.phone}`}>{c.phone}</a>
                      {c.whatsapp&&<span>WhatsApp: {c.whatsapp}</span>}
                      <WhatsAppPreview summary={c.wa_summary}/>
                      <span>{c.region || "Регион не указан"}</span>
                    </div>
                    <div>
                      <strong>
                        {options.sources.find((s) => s.code === c.source)?.name}
                      </strong>
                      <span>{c.campaign || "Без кампании"}</span>
                      <span>{c.interest || "Товар не указан"}</span>
                      {c.note&&<span title={c.note}>{c.note.length>100?c.note.slice(0,100)+"…":c.note}</span>}
                    </div>
                    <div>
                      <span className="crm-badge">
                        {outcomeNames[c.outcome]}
                      </span>
                      <strong>{money(c.sale_total)}</strong>
                      <span>{c.responsible_name || "Не назначен"}</span>
                    </div>
                    <div>
                      <span>Первое: {date(c.first_contact_at)}</span>
                      <span>Последнее: {date(c.last_contact_at)}</span>
                      <span>
                        {c.inquiry_count} обращений
                        {c.archived_at ? " · В архиве" : ""}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="crm-pagination">
              <button
                className="btn btn--soft"
                disabled={page <= 1}
                onClick={() => move(-1)}
              >
                Назад
              </button>
              <span>
                Страница {page} из{" "}
                {Math.max(1, Math.ceil(state.data.total / 25))}
              </span>
              <button
                className="btn btn--soft"
                disabled={page * 25 >= state.data.total}
                onClick={() => move(1)}
              >
                Далее
              </button>
            </div>
          </>
        )}
      </State>
    </>
  );
}
const blank = {
  full_name: "",
  phone: "",
  whatsapp: "",
  region: "",
  source: "manual",
  campaign: "",
  interest: "",
  responsible_id: "",
  outcome: "new",
  note: "",
};
function ClientForm({ initial = blank, onSave, busy }) {
  const options = useOutletContext(),
    [form, setForm] = useState({
      ...initial,
      whatsapp: initial.whatsapp || "",
      responsible_id: initial.responsible_id || "",
    });
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  return (
    <form
      className="crm-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      {[
        ["full_name", "ФИО", 150],
        ["phone", "Телефон", 30],
        ["whatsapp", "WhatsApp-номер", 30],
        ["region", "Город или регион", 100],
        ["campaign", "Рекламная кампания", 200],
        ["interest", "Товар или категория", 200],
      ].map(([key, label, max]) => (
        <label key={key}>
          {label}
          <input
            name={key}
            value={form[key]}
            onChange={change}
            required={["full_name", "phone"].includes(key)}
            maxLength={max}
            type={key === "phone" || key === "whatsapp" ? "tel" : "text"}
            autoComplete={
              key === "full_name" ? "name" : key === "phone" ? "tel" : "off"
            }
          />
        </label>
      ))}
      <label>
        Источник
        <select name="source" value={form.source} onChange={change}>
          {options.sources
            .filter((s) => s.active || s.code === form.source)
            .map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
        </select>
      </label>
      <label>
        Ответственный
        <select
          name="responsible_id"
          value={form.responsible_id}
          onChange={change}
        >
          <option value="">Не назначен</option>
          {options.staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Результат
        <select name="outcome" value={form.outcome} onChange={change}>
          {Object.entries(outcomeNames).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="crm-full">
        Примечание
        <textarea
          name="note"
          value={form.note}
          onChange={change}
          maxLength={2000}
          rows={3}
        />
      </label>
      <p className="crm-full crm-help">
        Номер сохраняется с кодом страны. Повторный номер добавит обращение в
        существующую карточку. Продажи учитываются отдельно в карточке клиента.
      </p>
      <button className="btn btn--primary" disabled={busy}>
        {busy ? "Сохраняем…" : "Сохранить"}
      </button>
    </form>
  );
}
function NewClient() {
  const navigate = useNavigate(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [requestId] = useState(() => crypto.randomUUID());
  const save = async (form) => {
    setBusy(true);
    setError("");
    try {
      const result = await request("create", {
        ...form,
        request_id: requestId,
      });
      navigate(`/admin/clients/${result.id}`, {
        state: {
          notice: result.duplicate
            ? "Номер уже есть в базе. Добавлено повторное обращение."
            : "Клиент добавлен.",
        },
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="crm-panel">
      <h2>Новое обращение</h2>
      {error && (
        <p role="alert" className="notice notice--error">
          {error}
        </p>
      )}
      <ClientForm onSave={save} busy={busy} />
    </section>
  );
}
function ConfirmChange({change,busy,error,onCancel,onConfirm}) {
  const ref=useRef(null);
  useEffect(()=>{ref.current.showModal()},[]);
  return <dialog ref={ref} className="crm-confirm" aria-labelledby="crm-confirm-title" onCancel={e=>{e.preventDefault();if(!busy)onCancel()}}>
    <form onSubmit={e=>{e.preventDefault();onConfirm(new FormData(e.currentTarget).get('reason'))}}>
      <h2 id="crm-confirm-title">{change.title}</h2>
      <p>Запись и история сохранятся. Действие будет отражено в журнале CRM.</p>
      {change.operation==='void_sale'&&<label>Причина отмены<textarea name="reason" required minLength={2} maxLength={500}/></label>}
      {error&&<p role="alert">{error}</p>}
      <div className="crm-toolbar"><button type="button" className="btn btn--soft" disabled={busy} onClick={onCancel}>Назад</button><button className="btn btn--primary" disabled={busy}>{busy?'Сохраняем…':'Подтвердить'}</button></div>
    </form>
  </dialog>
}
function Detail() {
  const options=useOutletContext();
  const [confirmation,setConfirmation]=useState(null);
  const { id } = useParams(),
    location = useLocation(),
    [revision, setRevision] = useState(0),
    [offset, setOffset] = useState(0),
    state = useData("client", `id=${id}&offset=${offset}`, revision);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(location.state?.notice || ""),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState(""),
    [sale, setSale] = useState(""),
    [saleId, setSaleId] = useState(() => crypto.randomUUID());
  const mutate = async (route, payload) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(route, { ...payload, id });
      setRevision((v) => v + 1);
      setNotice("Изменения сохранены.");
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {confirmation&&<ConfirmChange change={confirmation} busy={busy} error={error} onCancel={()=>setConfirmation(null)} onConfirm={async reason=>{if(await mutate(confirmation.operation,{...confirmation.payload,...(reason?{reason}: {})}))setConfirmation(null)}}/>}
      <Link
        className="crm-back"
        to={`/admin/clients/list${location.state?.back ? "?" + location.state.back : ""}`}
      >
        ← К базе клиентов
      </Link>
      {notice && (
        <p role="status" className="notice notice--success">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="notice notice--error">
          {error}
        </p>
      )}
      <State state={state}>
        {state.data && (
          <>
            <section className="crm-panel">
              <div className="crm-toolbar">
                <h2>{state.data.client.full_name}</h2>
                <button
                  className="btn btn--soft"
                  disabled={busy}
                  onClick={()=>setConfirmation({operation:state.data.client.archived_at?'restore':'archive',payload:{},title:state.data.client.archived_at?'Вернуть клиента из архива?':'Архивировать клиента?'})}
                >
                  {state.data.client.archived_at ? "Восстановить" : "В архив"}
                </button>
              </div>
              <p>
                Первое обращение: {date(state.data.client.first_contact_at)} ·
                Последнее: {date(state.data.client.last_contact_at)}{" "}
                {state.data.client.archived_at && "· В архиве"}
              </p>
              <ClientForm
                key={state.data.client.version}
                initial={state.data.client}
                onSave={(form) => mutate("update", form)}
                busy={busy}
              />
              <button
                className="btn btn--soft"
                disabled={busy}
                onClick={() =>
                  mutate("inquiry", {
                    ...state.data.client,
                    request_id: crypto.randomUUID(),
                  })
                }
              >
                Записать повторное обращение
              </button>
            </section>
            <div className="crm-two">
              <section className="crm-panel">
                <h2>Заметки</h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (await mutate("note", { body: note })) setNote("");
                  }}
                >
                  <label>
                    Новая заметка
                    <textarea
                      required
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      maxLength={4000}
                    />
                  </label>
                  <button className="btn btn--primary" disabled={busy}>
                    Добавить заметку
                  </button>
                </form>
                {state.data.notes.map((n) => (
                  <div className="crm-entry" key={n.id}>
                    <p>{n.body}</p>
                    <small>
                      {n.actor_name} · {date(n.created_at)}
                    </small>
                  </div>
                ))}
              </section>
              <section className="crm-panel">
                <h2>Продажи</h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      await mutate("sale", { amount: sale, request_id: saleId, inquiry_id:new FormData(e.currentTarget).get("inquiry_id")||null })
                    ) {
                      setSale("");
                      setSaleId(crypto.randomUUID());
                    }
                  }}
                >
                  <label>
                    Сумма, сом
                    <input
                      required
                      type="number"
                      min="0.01"
                      max="9999999999.99"
                      step="0.01"
                      inputMode="decimal"
                      value={sale}
                      onChange={(e) => setSale(e.target.value)}
                    />
                  </label>
                  <label>Обращение, которое привело к продаже
                    <select name="inquiry_id">
                      <option value="">Первоначальный источник клиента</option>
                      {state.data.inquiries.map(i=><option key={i.id} value={i.id}>{date(i.occurred_at)} · {options.sources.find(s=>s.code===i.source)?.name} · {i.message?.slice(0,50)}</option>)}
                    </select>
                  </label>
                  <button
                    className="btn btn--primary"
                    disabled={busy || !!state.data.client.archived_at}
                  >
                    Записать продажу
                  </button>
                </form>
                {state.data.sales.map((s) => (
                  <div className="crm-entry" key={s.id}>
                    <strong>{money(s.amount)}</strong>
                    <span>
                      {" "}
                      · {date(s.sold_at)} {s.voided_at ? " · Отменена" : ""}
                    </span>
                    {!s.voided_at && (
                      <button
                        className="crm-text-button"
                        disabled={busy}
                        onClick={()=>setConfirmation({operation:'void_sale',payload:{sale_id:s.id},title:'Отменить продажу?'})}
                      >
                        Отменить продажу
                      </button>
                    )}
                  </div>
                ))}
              </section>
            </div>
            <section className="crm-panel">
              <h2>История обращений · {state.data.inquiry_count}</h2>
              {state.data.inquiries.map((i) => (
                <div className="crm-entry" key={i.id}>
                  <strong>
                    {date(i.occurred_at)} · {options.sources.find(s=>s.code===i.source)?.name||i.source}
                  </strong>
                  <p>
                    {i.campaign} {i.interest}
                  </p>
                  <p>{i.message}</p>
                  {Object.keys(i.attribution).length > 0 && (
                    <details>
                      <summary>Рекламные данные</summary>
                      <dl>
                        {Object.entries(i.attribution).map(([k, v]) => (
                          <div key={k}>
                            <dt>{k}</dt>
                            <dd>{String(v)}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  )}
                </div>
              ))}
            </section>
            <WhatsAppHistory client={state.data.client}/>
            <section className="crm-panel">
              <h2>История изменений</h2>
              {state.data.audit.map((a) => (
                <div className="crm-entry" key={a.id}>
                  <strong>
                    {a.actor_name || "Система"} · {auditNames[a.action]||a.action}
                  </strong>
                  <small>{date(a.created_at)}</small>
                  <dl>
                    {Object.entries(a.changes).map(([k, v]) => (
                      <div key={k}>
                        <dt>{fieldNames[k]||k}</dt>
                        <dd>
                          {typeof v === "object" && v !== null
                            ? `${v.before ?? "—"} → ${v.after ?? "—"}`
                            : String(v)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </section>
            <div className="crm-pagination">
              <button
                className="btn btn--soft"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - 50))}
              >
                Новые записи
              </button>
              <span>Блок истории {offset / 50 + 1}</span>
              <button
                className="btn btn--soft"
                disabled={["audit", "inquiries", "sales", "notes"].every(
                  (k) => state.data[k].length < 50,
                )}
                onClick={() => setOffset(offset + 50)}
              >
                Более ранние
              </button>
            </div>
          </>
        )}
      </State>
    </>
  );
}
const metrics = [
  ["total_clients", "Всего клиентов"],
  ["new_clients", "Новых за период"],
  ["inquiries", "Обращений"],
  ["repeat_inquiries", "Повторных обращений"],
  ["meta_inquiries", "Из Meta Ads"],
  ["website_inquiries", "С сайта"],
  ["sales", "Продаж"],
  ["revenue", "Сумма продаж"],
  ["average_sale", "Средняя продажа"],
  ["wa_inquiries", "Обращений WhatsApp"],
  ["wa_clients", "Клиентов WhatsApp"],
  ["wa_repeat_inquiries", "Повторных WhatsApp-обращений"],
  ["wa_ads", "WhatsApp · Meta Ads"],
  ["wa_website", "WhatsApp · сайт"],
  ["wa_organic", "WhatsApp без рекламы"],
  ["wa_inquiry_conversion", "WhatsApp · конверсия обращений, %"],
  ["wa_client_conversion", "WhatsApp · клиентов с продажей, %"],
];
function Report() {
  const [p] = useSearchParams(),
    state = useData("reports", p.toString());
  return (
    <>
      <Filters reports />
      <Chips />
      <State state={state}>
        {state.data && (
          <>
            <div className="crm-toolbar">
              <div>
                <h2>Результаты за период</h2>
                <p>
                  {state.data.from} — {state.data.to}
                </p>
                <small>
                  Сравнение: {state.data.previous_from} —{" "}
                  {state.data.previous_to} · Время Бишкека
                </small>
              </div>
              <Export report />
            </div>
            <div className="crm-metrics">
              {metrics.map(([key, label]) => (
                <section className="crm-metric" key={key}>
                  <span>{label}</span>
                  <strong>
                    {["revenue", "average_sale"].includes(key)
                      ? money(state.data.current[key])
                      : state.data.current[key]}
                  </strong>
                  {key !== "total_clients" && (
                    <small>
                      Предыдущий:{" "}
                      {["revenue", "average_sale"].includes(key)
                        ? money(state.data.previous[key])
                        : state.data.previous[key]}{" "}
                      · Δ{" "}
                      {(
                        state.data.current[key] - state.data.previous[key]
                      ).toLocaleString("ru-RU")}
                    </small>
                  )}
                </section>
              ))}
            </div>
            <p className="crm-help">
              Обращения и продажи считаются по дате события. Источник клиента —
              первое обращение; источник продажи фиксируется при записи продажи.
              Архив исключён, пока не выбран в фильтрах. Дни без обращений имеют
              значение 0.
            </p>
            <div className="crm-two">
              <section className="crm-panel">
                <h2>Обращения во времени</h2>
                <Bars
                  rows={state.data.current.timeline.map((r) => ({
                    name: r.period,
                    inquiries: r.inquiries,
                  }))}
                />
              </section>
              <section className="crm-panel">
                <h2>Источники обращений</h2>
                <Bars rows={state.data.current.sources} />
              </section>
            </div>
            <section className="crm-panel">
              <h2>Клиенты и продажи по источникам</h2>
              <div className="crm-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Источник</th>
                      <th>Новые клиенты</th>
                      <th>Обращения</th>
                      <th>Продажи</th>
                      <th>Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...state.data.current.sources]
                      .sort((a, b) => b.revenue - a.revenue)
                      .map((s) => (
                        <tr key={s.code}>
                          <th>{s.name}</th>
                          <td>{s.clients}</td>
                          <td>{s.inquiries}</td>
                          <td>{s.sales}</td>
                          <td>{money(s.revenue)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
            <div className="crm-two"><section className="crm-panel"><h2>Кампании · обращения</h2><Bars rows={state.data.current.campaigns||[]}/></section><section className="crm-panel"><h2>Объявления · обращения</h2><Bars rows={state.data.current.ads||[]}/></section></div>
            <div className="crm-two">
              <section className="crm-panel">
                <h2>Регионы · обращения</h2>
                <Bars rows={state.data.current.regions} />
              </section>
              <section className="crm-panel">
                <h2>Товары · обращения</h2>
                <Bars rows={state.data.current.interests} />
              </section>
            </div>
          </>
        )}
      </State>
    </>
  );
}
function Bars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.inquiries));
  return rows.length ? (
    <div className="crm-bars">
      {rows.map((r, i) => (
        <div key={i}>
          <div>
            <span>{r.name}</span>
            <strong>{r.inquiries}</strong>
          </div>
          <meter
            min="0"
            max={max}
            value={r.inquiries}
            aria-label={`${r.name}: ${r.inquiries}`}
          />
        </div>
      ))}
    </div>
  ) : (
    <p className="crm-empty">За этот период обращений нет.</p>
  );
}
function Sources() {
  const options = useOutletContext(),
    { role } = useAuth(),
    [rows, setRows] = useState(options.sources),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const toggle = async (row) => {
    setBusy(true);
    setError("");
    try {
      await request("source", { code: row.code, active: !row.active });
      options.refreshOptions();
      setRows(
        rows.map((r) =>
          r.code === row.code ? { ...r, active: !r.active } : r,
        ),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="crm-panel">
      <h2>Источники клиентов</h2>
      <p>
        История сохраняется при отключении источника. Новые ручные обращения
        можно добавлять только в активные источники.
      </p>
      {error && <p role="alert">{error}</p>}
      {rows.map((s) => (
        <div className="crm-source" key={s.code}>
          <strong>{s.name}</strong>
          <label>
            <input
              type="checkbox"
              checked={s.active}
              disabled={
                busy ||
                role !== "owner" ||
                ["website", "manual", "other"].includes(s.code)
              }
              onChange={() => toggle(s)}
            />
            Активен
          </label>
        </div>
      ))}
    </section>
  );
}
function Settings() {
  const options = useOutletContext(),
    { role } = useAuth(),
    [days, setDays] = useState(options.settings.retention_days),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="crm-panel">
      <h2>Настройки CRM</h2>
      <p>Валюта: кыргызский сом (KGS). Часовой пояс: Бишкек (UTC+6).</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await request("settings", { retention_days: Number(days) });
            setNotice("Настройки сохранены.");
          } catch (e) {
            setNotice(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Срок пересмотра хранения, дней
          <input
            type="number"
            min="30"
            max="3650"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            disabled={role !== "owner"}
          />
        </label>
        <p className="crm-help">
          Рекомендованный срок ручной проверки старых записей. Автоматическое
          удаление не выполняется; архив сохраняет историю. Окончательное
          удаление рассматривает владелец по запросу клиента.
        </p>
        <button
          className="btn btn--primary"
          disabled={busy || role !== "owner"}
        >
          Сохранить
        </button>
        {notice && <p role="status">{notice}</p>}
      </form>
      <hr />
      <h3>Доступ</h3>
      <p>
        Владелец и администраторы видят CRM. Источники и срок хранения меняет
        владелец. Действия сотрудников сохраняются в истории.
      </p>
      <h3>Перенос старых заявок</h3>
      <p>
        Записей с некорректным телефоном: {options.import_issues}. Они сохранены
        в разделе «Заявки» и не объединяются автоматически.
      </p>
      <WhatsAppConnection/>
    </section>
  );
}
export default function Crm() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Report />} />
        <Route path="list" element={<List />} />
        <Route path="new" element={<NewClient />} />
        <Route path="reports" element={<Report />} />
        <Route path="sources" element={<Sources />} />
        <Route path="settings" element={<Settings />} />
        <Route path=":id" element={<Detail />} />
      </Route>
    </Routes>
  );
}
