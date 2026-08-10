export default function AdminPageHeader({ eyebrow='Salt Ordo', title, text, actions }) {
  return (
    <div className="admin-page-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {actions && <div className="admin-page-head__actions">{actions}</div>}
    </div>
  )
}
