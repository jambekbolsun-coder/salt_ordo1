import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  consent,
  saveConsent,
  clearUnconsented,
  campaignAttribution,
} from "../lib/consent";
import "../consent.css";
export default function CookieConsent() {
  const [open, setOpen] = useState(() => !consent()),
    [custom, setCustom] = useState(false),
    [analytics, setAnalytics] = useState(false),
    [marketing, setMarketing] = useState(false),
    dialog = useRef(null);
  useEffect(() => {
    clearUnconsented();
    campaignAttribution();
    const show = () => {
      const saved = consent();
      setAnalytics(saved?.analytics === true);
      setMarketing(saved?.marketing === true);
      setCustom(true);
      setOpen(true);
    };
    window.addEventListener("salt-cookie-settings", show);
    return () => window.removeEventListener("salt-cookie-settings", show);
  }, []);
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [open]);
  const save = (a, m) => {
    saveConsent(a, m);
    campaignAttribution();
    setOpen(false);
  };
  return (
    <dialog
      className="cookie-dialog"
      ref={dialog}
      aria-labelledby="cookie-title"
      onCancel={(e) => {
        e.preventDefault();
        if (consent()) setOpen(false);
      }}
    >
      <h2 id="cookie-title">Cookies и ваши данные</h2>
      <p>
        Обязательные данные нужны для корзины, выбранного языка и входа
        сотрудников. С вашего разрешения мы собираем статистику посещений и
        сохраняем источник рекламы. Отказ не мешает пользоваться сайтом.
      </p>
      <p>
        <Link to="/cookies" onClick={() => setOpen(false)}>
          Политика cookies
        </Link>{" "}
        ·{" "}
        <Link to="/privacy" onClick={() => setOpen(false)}>
          Конфиденциальность
        </Link>
      </p>
      {custom && (
        <div className="cookie-options">
          <label>
            <input type="checkbox" checked disabled />
            Обязательные — всегда включены
          </label>
          <label>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
            />
            Аналитические — посещения и подбор товаров
          </label>
          <label>
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
            />
            Маркетинговые — источник рекламного обращения
          </label>
          <p>Рекламные пиксели Meta и Google сейчас не подключены.</p>
        </div>
      )}
      <div className="cookie-actions">
        <button onClick={() => save(true, true)}>Принять всё</button>
        <button onClick={() => save(false, false)}>
          Отклонить необязательные
        </button>
        {custom ? (
          <button onClick={() => save(analytics, marketing)}>
            Сохранить выбор
          </button>
        ) : (
          <button onClick={() => setCustom(true)}>Настроить</button>
        )}
      </div>
      <small>
        Вы можете изменить или отозвать согласие через «Настройки cookies» внизу
        сайта.
      </small>
    </dialog>
  );
}
