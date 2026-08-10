import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import MobileBottomNav from './MobileBottomNav'
import FloatingAssist from './FloatingAssist'

export default function PublicLayout() {
  return (
    <div className="public-app">
      <Header />
      <main><Outlet/></main>
      <Footer />
      <FloatingAssist />
      <MobileBottomNav />
    </div>
  )
}
