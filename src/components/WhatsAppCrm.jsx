import { useEffect,useRef,useState } from 'react';
import { MessageCircle,CheckCircle2,AlertCircle } from 'lucide-react';
import { request } from '../lib/crm';
import { useAuth } from '../state/AuthContext';
import { loadMetaSdk,startSignup } from '../lib/whatsapp-signup';
import '../whatsapp-crm.css';
const sources={meta_ads:'Meta Ads',website:'Сайт',whatsapp:'WhatsApp без рекламы'};
const date=n=>n?new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bishkek'}).format(new Date(n)):'—';
const types={text:'Текст',image:'Изображение',video:'Видео',audio:'Аудио',document:'Документ',sticker:'Стикер',location:'Местоположение',contacts:'Контакты',interactive:'Интерактивное сообщение',button:'Кнопка'};
export function WhatsAppPreview({summary}){
 if(!summary)return null;
 return <div className="wa-preview"><strong><MessageCircle size={16} aria-hidden="true"/>WhatsApp · {summary.direction==='out'?'Ответ сотрудника':'Сообщение клиента'}</strong><span>{summary.body?.slice(0,120)||types[summary.type]||summary.type}</span><small>{date(summary.occurred_at)} · {sources[summary.source]}</small>{summary.last_incoming_at&&<small>Последнее обращение: {date(summary.last_incoming_at)}</small>}<small>{summary.attribution?.ad_id?`Объявление: ${summary.attribution.ad_id}`:summary.attribution?.landing_page}</small></div>;
}
export function WhatsAppConnection(){
 const {role}=useAuth(),owner=role==='owner';
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[step,setStep]=useState(''),[prepared,setPrepared]=useState(null),[revision,setRevision]=useState(0);
 const cancel=useRef(null);
 useEffect(()=>{let active=true;setPrepared(null);request('whatsapp').then(async d=>{if(!active)return;setData(d);if(owner&&d.config.ready){await loadMetaSdk(d.config);if(!active)return;const s=await request('whatsapp',{action:'prepare'});if(active)setPrepared(s)}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false;cancel.current?.()}},[owner,revision]);
 const refresh=()=>{setError('');setRevision(v=>v+1)};
 const start=()=>{
  setError('');if(!data?.config.ready){setError('Владелец должен добавить App ID, Configuration ID и серверные секреты в Vercel. Инструкция ниже.');return}
  if(!prepared||prepared.expires_at<Date.now()){refresh();setError('Обновляем защищённый сеанс. Нажмите ещё раз после подготовки.');return}
  setBusy(true);setStep('Авторизация Meta');
  cancel.current=startSignup(data.config,prepared.state,setStep,result=>{setData({...result,config:data.config});setBusy(false);setStep('Готово');setPrepared(null);setRevision(v=>v+1)},e=>{setError(e);setBusy(false);setPrepared(null);setRevision(v=>v+1)});
 };
 const action=async action=>{setBusy(true);setError('');try{await request('whatsapp',{action});refresh()}catch(e){setError(e.message);setRevision(v=>v+1)}finally{setBusy(false)}};
 const connected=data?.state==='connected';
 return <section className="wa-connection" aria-busy={busy}>
  <div className="crm-toolbar"><h3><MessageCircle aria-hidden="true" size={22}/> WhatsApp Business</h3><span className={`wa-state ${connected?'wa-state--ok':''}`}>{connected?<CheckCircle2 size={16} aria-hidden="true"/>:data?.state==='error'?<AlertCircle size={16} aria-hidden="true"/>:null}{busy?'Подключение…':connected?'Подключено':data?.state==='error'?'Требуется внимание':'Не подключено'}</span></div>
  {!data&&!error?<p role="status">Проверяем подключение…</p>:<>
   <p>Новые сообщения попадут в существующие карточки клиентов. Официальный режим Coexistence сохраняет работу основного номера в приложении WhatsApp Business на телефоне.</p>
   <p className="crm-help">Salt Ordo не переносит номер и не отключает приложение. Meta проверяет доступность Coexistence; обычная регистрация номера здесь запрещена.</p>
   {data?.display_phone&&<dl className="wa-facts"><div><dt>Номер</dt><dd>{data.display_phone}</dd></div><div><dt>Аккаунт</dt><dd>{data.business_name}</dd></div><div><dt>Подключил</dt><dd>{data.connected_by||'Владелец'} · {date(data.connected_at)}</dd></div><div><dt>Webhook</dt><dd>{data.webhook_subscribed?'Подписка подтверждена':'Ожидает подписки'}</dd></div><div><dt>Последний webhook</dt><dd>{date(data.last_webhook_at)}</dd></div><div><dt>Последнее сообщение</dt><dd>{date(data.last_message_at)}</dd></div></dl>}
   {connected&&<p className="wa-success">WhatsApp на телефоне продолжает работать. Для сохранения подключения регулярно открывайте приложение.</p>}
   {busy&&<p role="status">Авторизация Meta → Выбор номера → Подключение webhook → Готово<br/><strong>{step||'Проверка соединения'}…</strong></p>}
   {(error||data?.error_code)&&<p role="alert" className="notice notice--error">{error||'Проверьте соединение или подключитесь повторно.'}{data?.error_code&&<small> Код: {data.error_code}</small>}</p>}
   {owner?<div className="wa-buttons"><button className="btn btn--primary" disabled={busy||(data?.config.ready&&!prepared)} onClick={start}>{data?.display_phone?'Подключить повторно':'Подключить WhatsApp'}</button>{data?.display_phone&&<button className="btn btn--soft" disabled={busy} onClick={()=>action('check')}>Проверить соединение</button>}{data?.retry_count>0&&<button className="btn btn--soft" disabled={busy} onClick={()=>action('retry')}>Повторить обработку ({data.retry_count})</button>}{busy&&<button className="btn btn--soft" onClick={()=>{cancel.current?.();setBusy(false);refresh()}}>Закрыть подключение</button>}</div>:<p>Подключить WhatsApp может только владелец.</p>}
   <small>Официальное подключение через Meta</small>
   <details><summary>Инструкция для владельца</summary><ol><li>Создайте Meta App и конфигурацию Embedded Signup v4 с поддержкой WhatsApp Business App Coexistence. Добавьте переменные в Vercel по инструкции проекта.</li><li>В Meta укажите webhook <code>https://salt-ordo1.vercel.app/api/whatsapp/webhook</code> и Verify Token из защищённых переменных.</li><li>Нажмите «Подключить WhatsApp», выберите действующий номер, подтвердите подключение в WhatsApp Business на телефоне. Если Meta предлагает удалить аккаунт или перенести номер — отмените процесс.</li><li>Оставьте WhatsApp Business открытым до завершения синхронизации. Основное приложение работает дальше; Meta может переподключить связанные устройства и ограничить отдельные функции.</li><li>Отправьте сообщение с другого номера и проверьте карточку клиента. Если ранее отказались от передачи истории, новые сообщения продолжат поступать.</li></ol><a href="https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users" target="_blank" rel="noreferrer">Официальная инструкция и ограничения Meta</a></details>
   {owner&&data&&<details><summary>Техническая информация</summary><dl><div><dt>WABA ID</dt><dd>{data.waba_id||'—'}</dd></div><div><dt>Phone Number ID</dt><dd>{data.phone_id||'—'}</dd></div><div><dt>Синхронизация истории</dt><dd>{data.sync?.history_result||'Ожидается'}{data.sync?.history_progress!=null?` · ${data.sync.history_progress}%`:''}</dd></div></dl>{data.errors?.map((e,i)=><p key={i}>{e.error_code} · {date(e.processed_at)}</p>)}</details>}
  </>}
 </section>;
}
export function WhatsAppHistory({client}){
 const {role}=useAuth(),[offset,setOffset]=useState(0),[data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
 useEffect(()=>{const abort=new AbortController();setLoading(true);setError('');request('whatsapp',undefined,`view=messages&id=${client.id}&offset=${offset}`,abort.signal).then(setData).catch(e=>{if(!abort.signal.aborted)setError(e.message)}).finally(()=>{if(!abort.signal.aborted)setLoading(false)});return()=>abort.abort()},[client.id,offset,revision]);
 return <section className="crm-panel wa-history"><div className="crm-toolbar"><h2><MessageCircle size={22} aria-hidden="true"/> WhatsApp</h2><a className="btn btn--soft" href={`https://wa.me/${(client.whatsapp||client.phone).replace(/\D/g,'')}`} target="_blank" rel="noreferrer">Открыть чат в WhatsApp</a></div>
  <button className="crm-text-button" disabled={loading} onClick={()=>setRevision(v=>v+1)}>Обновить сообщения</button>
  {loading?<p role="status">Загружаем сообщения…</p>:error?<p role="alert">{error}</p>:<>
   {data?.first&&<details><summary>Первое сообщение · {date(data.first.occurred_at)}</summary><p>{data.first.body||types[data.first.type]||data.first.type}</p></details>}
   {!data?.items?.length&&<p className="crm-empty">Сообщений WhatsApp пока нет.</p>}
   <ol className="wa-thread">{data?.items?.map(m=><li key={m.id} className={`wa-message wa-message--${m.direction}`}><header><strong>{m.direction==='out'?'Сотрудник · с телефона':'Клиент'}</strong><span>{types[m.type]||`Другой тип: ${m.type}`}</span></header><p className="wa-body">{m.body||'Сообщение без текста'}</p>
    {m.details?.media_id&&<p>Вложение: {m.details.filename||m.details.mime_type||types[m.type]}. Файл не загружался.</p>}
    {m.type==='location'&&<p>{m.details.name} {m.details.address} · {m.details.latitude}, {m.details.longitude}</p>}
    {m.details?.contacts?.map((c,i)=><p key={i}>{c.name}: {c.phones?.map(p=>p.phone).join(', ')}</p>)}
    <small>{date(m.occurred_at)} · {sources[m.source]}{m.history?' · История до подключения':''}{m.delivery_status?` · ${m.delivery_status}`:''}</small>
    {(m.attribution?.ad_id||m.attribution?.landing_page)&&<p className="wa-context">{m.attribution.ad_id?`Объявление: ${m.attribution.ad_id}`:`Страница: ${m.attribution.landing_page}`} {m.attribution.product}</p>}
    {Object.keys(m.referral||{}).length>0&&<details><summary>Рекламное обращение</summary><dl>{Object.entries(m.referral).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>)}</dl></details>}
    {role==='owner'&&<details><summary>Техническая информация</summary><p>Message ID: {m.message_id}</p><p>Media ID: {m.details?.media_id||'—'}</p></details>}
   </li>)}</ol><div className="crm-pagination"><button className="btn btn--soft" disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-50))}>Новые</button><span>Страница {offset/50+1}</span><button className="btn btn--soft" disabled={(data?.items?.length||0)<50} onClick={()=>setOffset(offset+50)}>Ранее</button></div>
  </>}
 </section>;
}
