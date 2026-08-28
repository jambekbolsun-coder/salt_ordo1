import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { LanguageProvider } from './state/LanguageContext'
import { SiteSettingsProvider } from './state/SiteSettingsContext'
import { CartProvider } from './state/CartContext'
import { FavoritesProvider } from './state/FavoritesContext'
import { AuthProvider } from './state/AuthContext'
import '@fontsource-variable/geist'
import './styles.css'
import './storefront.css'
import './approved-design.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <SiteSettingsProvider>
          <CartProvider>
            <FavoritesProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </FavoritesProvider>
          </CartProvider>
        </SiteSettingsProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
)
