import { useState } from 'react'
import { createUserWithRole } from '../lib/users'

export default function Usuarios() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('vendedor')
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)

  const crearUsuario = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setMensaje('Completa email y contraseña')
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    setLoading(true)
    try {
      const { user, error } = await createUserWithRole({ email, password, role })
      if (error) {
        setMensaje('Error creando usuario')
        console.error(error)
      } else {
        setMensaje('Usuario creado exitosamente')
        setEmail('')
        setPassword('')
        setRole('vendedor')
      }
    } catch (err) {
      console.error(err)
      setMensaje('Error creando usuario')
    }
    setLoading(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  return (
    <div className="p-6">
      <h3 className="text-xl font-bold text-slate-100 mb-4">Usuarios</h3>
      {mensaje && <div className="mb-4 text-sm text-emerald-400">{mensaje}</div>}
      <form onSubmit={crearUsuario} className="space-y-3 max-w-md">
        <div>
          <label className="block text-slate-300 text-sm mb-1">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-700 text-slate-100" />
        </div>
        <div>
          <label className="block text-slate-300 text-sm mb-1">Contraseña</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-700 text-slate-100" />
        </div>
        <div>
          <label className="block text-slate-300 text-sm mb-1">Rol</label>
          <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-700 text-slate-100">
            <option value="vendedor">Vendedor</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <div>
          <button disabled={loading} className="bg-blue-600 px-4 py-2 rounded text-white font-bold">{loading ? 'Creando...' : 'Crear Usuario'}</button>
        </div>
      </form>
    </div>
  )
}
