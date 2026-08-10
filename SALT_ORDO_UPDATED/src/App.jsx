import { Route, Routes } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import ProtectedAdmin from './components/ProtectedAdmin'
import AdminLayout from './components/AdminLayout'
import RequireAdminRole from './components/RequireAdminRole'

import Home from './pages/Home'
import Catalog from './pages/Catalog'
import Product from './pages/Product'
import Favorites from './pages/Favorites'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import NotFound from './pages/NotFound'

import AdminLogin from './pages/admin/AdminLogin'
import Dashboard from './pages/admin/Dashboard'
import Products from './pages/admin/Products'
import ProductForm from './pages/admin/ProductForm'
import Staff from './pages/admin/Staff'
import Categories from './pages/admin/Categories'
import Chatbot from './pages/admin/Chatbot'
import Settings from './pages/admin/Settings'

export default function App() {
  return (
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
        </Route>
      </Route>

      <Route path="*" element={<NotFound/>}/>
    </Routes>
  )
}
