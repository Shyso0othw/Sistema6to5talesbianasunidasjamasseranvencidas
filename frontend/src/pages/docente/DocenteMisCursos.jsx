import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react'

import { API_BASE } from '../../config'
const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `Bearer ${token}`,
})
import '../../shared.css'
import './DocentesDashboard.css'

export default function DocenteMisCursos() {
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error] = useState('');

  useEffect(() => {
    const cargarCursos = async () => {
      try {
        const t = localStorage.getItem('token') || sessionStorage.getItem('token')
        if (!t) return
        const res = await apiFetch(`${API_BASE}/mis-cursos/`, { headers: authHeaders() })
        if (!res.ok) throw new Error('Error al cargar cursos')
        const data = await res.json()
        setCursos(data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    cargarCursos()
  }, [])

  if (loading) {
    return (
      <div className="sh-page">
        <div className="sh-hero">
          <div className="sh-hero-content">
            <h2 className="sh-hero-title">Mis Cursos</h2>
            <p className="sh-hero-subtitle">Cargando...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="sh-page">
        <div className="sh-hero">
          <div className="sh-hero-content">
            <h2 className="sh-hero-title">Mis Cursos</h2>
            <p className="sh-hero-subtitle" style={{ color: '#dc2626' }}>Error: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title">Mis Cursos</h2>
          <p className="sh-hero-subtitle">{cursos.length} cursos a cargo</p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
      }}>
        {cursos.length === 0 ? (
          <div className="sh-card" style={{ textAlign: 'center', padding: 40 }}>
            <p className="sh-empty-text">No tienes cursos asignados</p>
          </div>
        ) : (
          <div>
            {cursos.map(curso => (
              <div
                key={curso.id}
                className="sh-card"
                style={{
                  borderLeft: `6px solid ${curso.activo ? '#3b82f6' : '#d1d5db'}`,
                  marginBottom: 0,
                }}
              >
                <div className="sh-card-title">
                  <span style={{ fontWeight: 700 }}> {curso.año}° {curso.division} </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-soft)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{curso.carrera || 'Curso'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-soft)' }}>
                    <span style={{ fontWeight: 600 }}>{curso.activo ? 'Activo' : 'Inactivo'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-soft)' }}>
                    <span style={{ fontWeight: 600 }}>{curso.año >= 4 ? 'Ciclo Superior' : 'Ciclo Básico'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}