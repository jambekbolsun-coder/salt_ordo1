import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import ProtectedAdmin from './components/ProtectedAdmin'
import AdminLayout from './components/AdminLayout'
import RequireAdminRole from './components/RequireAdminRole'
import { AdminPwaProvider } from './state/AdminPwaContext'

const AtelierPages = lazy(() => import('./pages/AtelierPages'))
const Home = lazy(() => import('./pages/Home'))
const Catalog = lazy(() => import('./pages/Catalog'))
const Product = lazy(() => import('./pages/Product'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Contacts = lazy(() => import('./pages/Contacts'))
const SeoCategory = lazy(() => import('./pages/SeoCategory'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Privacy = lazy(() => import('./pages/Privacy'))

const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const Products = lazy(() => import('./pages/admin/Products'))
const ProductForm = lazy(() => import('./pages/admin/ProductForm'))
const Categories = lazy(() => import('./pages/admin/Categories'))
const Chatbot = lazy(() => import('./pages/admin/Chatbot'))
const Staff = lazy(() => import('./pages/admin/Staff'))
const Settings = lazy(() => import('./pages/admin/Settings'))
const Leads = lazy(() => import('./pages/admin/Leads'))
const Analytics = lazy(() => import('./pages/admin/Analytics'))
const Security = lazy(() => import('./pages/admin/Security'))
const MfaChallenge = lazy(() => import('./pages/admin/MfaChallenge'))
const Profile = lazy(() => import('./pages/admin/Profile'))
const Application = lazy(() => import('./pages/admin/Application'))
const Crm = lazy(() => import('./pages/admin/Crm'))

export default function App() {
  return (
    <Suspense fallback={<div className="screen-loader"><img src="/salt-ordo-logo.png" alt=""/><span>Загружаем Salt Ordo…</span></div>}>
      <Routes>
      <Route element={<PublicLayout/>}>
        <Route path="/" element={<Home/>}/>
        <Route path="/catalog" element={<Catalog/>}/>
        <Route path="/collections" element={<Catalog/>}/>
        <Route path="/selection" element={<Favorites/>}/>
        {["materials","individual-order","atelier","works","care"].map(path => <Route key={path} path={`/${path}`} element={<AtelierPages/>}/>)}
        <Route path="/product/:slug" element={<Product/>}/>
        <Route path="/favorites" element={<Favorites/>}/>
        <Route path="/cart" element={<Cart/>}/>
        <Route path="/checkout" element={<Checkout/>}/>
        <Route path="/contacts" element={<Contacts/>}/>
        <Route path="/privacy" element={<Privacy/>}/>
        <Route path="/cookies" element={<Privacy/>}/>
        <Route path="/:pageSlug" element={<SeoCategory/>}/>
      </Route>

      <Route element={<AdminPwaProvider/>}>
      <Route path="/admin/mfa" element={<MfaChallenge/>}/>
      <Route path="/admin/login" element={<AdminLogin/>}/>
      <Route path="/admin" element={<ProtectedAdmin/>}>
        <Route element={<AdminLayout/>}>
          <Route index element={<Dashboard/>}/>
          <Route element={<RequireAdminRole roles={['owner','admin','content']}/> }>
            <Route path="products" element={<Products/>}/>
            <Route path="products/new" element={<ProductForm/>}/>
            <Route path="products/:id" element={<ProductForm/>}/>
            <Route path="categories" element={<Categories/>}/>
            <Route path="chatbot" element={<Chatbot/>}/>
          </Route>
          <Route element={<RequireAdminRole roles={['owner','admin']}/> }>
            <Route path="clients/*" element={<Crm/>}/>
            <Route path="staff" element={<Staff/>}/>
            <Route path="settings" element={<Settings/>}/>
          </Route>
          <Route element={<RequireAdminRole roles={['owner','admin','manager']}/> }>
            <Route path="leads" element={<Leads/>}/>
            <Route path="analytics" element={<Analytics/>}/>
          </Route>
          <Route path="security" element={<Security/>}/>
          <Route path="profile" element={<Profile/>}/>
          <Route path="application" element={<Application/>}/>
        </Route>
      </Route>
      </Route>

      <Route path="*" element={<NotFound/>}/>
      </Routes>
    </Suspense>
  )
}
