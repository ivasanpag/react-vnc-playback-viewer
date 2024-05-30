import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import React from 'react'

const root = ReactDOM.createRoot(document.querySelector('#root') as HTMLElement)
root.render(
  <React.StrictMode><App /></React.StrictMode>,
)