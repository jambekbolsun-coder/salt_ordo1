import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import MobileBottomNav from './MobileBottomNav'
import FloatingAssist from './FloatingAssist'
import QuizOverlay from './QuizOverlay'
import { track } from '../lib/analytics'

export default function PublicLayout() {
  const location = useLocation()

  useEffect(() => {
    track('page_view', { path: `${location.pathname}${location.search}` })
  }, [location.pathname, location.search])

  return (
    <div className="public-app">
      <a className="skip-link" href="#main-content">Перейти к содержанию</a>
      <Header />
      <main id="main-content"><Outlet/></main>
      <Footer />
      <FloatingAssist />
      <QuizOverlay />
      <MobileBottomNav />
    </div>
  )
}
