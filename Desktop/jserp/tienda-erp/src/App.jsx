import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './auth/Login'
import Dashboard from './admin/Dashboard'
import Home from './catalogo/Home'
import AdminRoute from './admin/AdminRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Dashboard />
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App

