import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import ProtectedAdmin from './components/ProtectedAdmin'
import AdminLayout from './components/AdminLayout'
import RequireAdminRole from './components/RequireAdminRole'

const Home = lazy(() => import('./pages/Home'))
const Catalog = lazy(() => import('./pages/Catalog'))
const Product = lazy(() => import('./pages/Product'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const NotFound = lazy(() => import('./pages/NotFound'))

const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const Products = lazy(() => import('./pages/admin/Products'))
const ProductForm = lazy(() => import('./pages/admin/ProductForm'))
const Staff = lazy(() => import('./pages/admin/Staff'))
const Categories = lazy(() => import('./pages/admin/Categories'))
const Chatbot = lazy(() => import('./pages/admin/Chatbot'))
const Settings = lazy(() => import('./pages/admin/Settings'))
const Leads = lazy(() => import('./pages/admin/Leads'))
const Analytics = lazy(() => import('./pages/admin/Analytics'))
const Profile = lazy(() => import('./pages/admin/Profile'))

export default function App() {
  return (
    <Suspense fallback={<div className="screen-loader"><img src="/salt-ordo-logo.png" alt=""/><span>Загружаем Salt Ordo…</span></div>}>
      <Routes>
      <Route element={<PublicLayout/>}>
        <Route path="/" element={<Home/>}/>
        <Route path="/catalog" element={<Catalog/>}/>
        <Route path="/product/:slug" element={<Product/>}/>
        <Route path="/favorites" element={<Favorites/>}/>
        <Route path="/cart" element={<Cart/>}/>
        <Route path="/checkout" element={<Checkout/>}/>
      </Route>

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
            <Route path="staff" element={<Staff/>}/>
            <Route path="settings" element={<Settings/>}/>
          </Route>
          <Route element={<RequireAdminRole roles={['owner','admin','manager']}/> }>
            <Route path="leads" element={<Leads/>}/>
            <Route path="analytics" element={<Analytics/>}/>
          </Route>
          <Route path="profile" element={<Profile/>}/>
        </Route>
      </Route>

      <Route path="*" element={<NotFound/>}/>
      </Routes>
    </Suspense>
  )
}
