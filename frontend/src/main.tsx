import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Enforce theme from local storage
const savedTheme = localStorage.getItem('nexus_theme')
if (savedTheme === 'light') {
  document.documentElement.classList.remove('dark')
} else {
  document.documentElement.classList.add('dark')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
