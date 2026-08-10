import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import MobileBottomNav from './MobileBottomNav'

export default function PublicLayout() {
  return (
    <div className="public-app">
      <Header />
      <main><Outlet/></main>
      <Footer />
      <MobileBottomNav />
    </div>
  )
}
