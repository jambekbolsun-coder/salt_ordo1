import { ArrowLeft, Home, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import Ornament from '../components/Ornament'
import { useLanguage } from '../state/LanguageContext'

export default function NotFound() {
  const { t } = useLanguage()
  return (
    <section className="not-found">
      <div className="not-found__glow not-found__glow--pink"/><div className="not-found__glow not-found__glow--blue"/>
      <div className="not-found__card">
        <img src="/salt-ordo-logo.png" alt="" className="not-found__logo"/>
        <div className="not-found__number">4<span>0</span>4</div>
        <Ornament className="not-found__ornament"/>
        <h1>{t.notFound.title}</h1>
        <p>{t.notFound.text}</p>
        <div className="not-found__actions"><Link className="btn btn--primary" to="/"><Home size={18}/>{t.notFound.home}</Link><Link className="btn btn--ghost" to="/catalog"><Search size={18}/>{t.notFound.catalog}</Link></div>
        <button className="back-link" type="button" onClick={()=>window.history.back()}><ArrowLeft size={17}/>{t.notFound.back}</button>
      </div>
    </section>
  )
}
