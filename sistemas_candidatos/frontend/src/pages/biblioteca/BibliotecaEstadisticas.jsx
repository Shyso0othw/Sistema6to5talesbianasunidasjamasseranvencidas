import { apiFetch } from '../../api/http.js'
import { useState, useEffect } from 'react';
import { BookOpen, Book, Users, BarChart2, Calendar, AlertTriangle } from 'lucide-react'
import { API_BASE } from '../../config'
import './biblioteca.css'
import '../../shared.css'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

export default function BibliotecaEstadisticas() {
  const [stats, setStats] = useState({
    totalLibros: 0, prestados: 0, disponibles: 0, lectoresActivos: 0,
    prestamosMes: 0, pctDemorados: 0,
    populares: [], prestamosPorMes: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch(`${API_BASE}/libros/`, { headers: authHeaders() }).then(r => r.json()),
      apiFetch(`${API_BASE}/prestamos/`, { headers: authHeaders() }).then(r => r.json())
    ]).then(([librosData, prestamosData]) => {
      const libros = Array.isArray(librosData) ? librosData : []
      const prestamos = Array.isArray(prestamosData) ? prestamosData : []
      
      const totalLibros = libros.reduce((acc, l) => acc + (l.copias || 0), 0)
      const disponibles = libros.reduce((acc, l) => acc + (l.disponibles || 0), 0)
      const prestados = totalLibros - disponibles

      const lectoresUnicos = new Set(prestamos.map(p => p.usuario_nombre)).size
      
      const hoy = new Date()
      const currentMonth = hoy.getMonth()
      const currentYear = hoy.getFullYear()
      let prestamosMes = 0
      let demorados = 0

      const porMesMap = {}
      const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

      prestamos.forEach(p => {
        if (p.estado === 'Demorado') demorados++
        if (p.fecha_prestamo) {
          const fp = new Date(p.fecha_prestamo)
          if (fp.getMonth() === currentMonth && fp.getFullYear() === currentYear) {
            prestamosMes++
          }
          const mName = mesesNombres[fp.getMonth()]
          porMesMap[mName] = (porMesMap[mName] || 0) + 1
        }
      })

      const pctDemorados = prestamos.length ? Math.round((demorados / prestamos.length) * 100) : 0

      // Populares
      const popMap = {}
      prestamos.forEach(p => {
        if (p.libro_titulo) {
          popMap[p.libro_titulo] = (popMap[p.libro_titulo] || 0) + 1
        }
      })
      const populares = Object.entries(popMap)
        .map(([titulo, count]) => ({ titulo, autor: 'Autor', count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Prestamos por mes array
      const prestamosPorMes = Object.entries(porMesMap)
        .map(([mes, count]) => ({ mes, count }))
      
      setStats({
        totalLibros, prestados, disponibles, lectoresActivos: lectoresUnicos,
        prestamosMes, pctDemorados, populares, prestamosPorMes
      })
      setLoading(false)
    }).catch(err => {
      console.error('Error fetching stats', err)
      setLoading(false)
    })
  }, [])

  const STATS_ARRAY = [
    { icon: Book, label: 'Total Libros', valor: stats.totalLibros.toString(), color: '#4a63e0' },
    { icon: BookOpen, label: 'Prestados', valor: stats.prestados.toString(), color: '#d97706' },
    { icon: Book, label: 'Disponibles', valor: stats.disponibles.toString(), color: '#059669' },
    { icon: Users, label: 'Lectores Activos', valor: stats.lectoresActivos.toString(), color: '#7c3aed' },
    { icon: Calendar, label: 'Préstamos del Mes', valor: stats.prestamosMes.toString(), color: '#6366f1' },
    { icon: AlertTriangle, label: '% Demorados', valor: `${stats.pctDemorados}%`, color: '#dc2626' },
  ]

  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title"><BarChart2 size={24} /> Estadísticas de Biblioteca</h2>
          <p className="sh-hero-subtitle">Indicadores y métricas de la biblioteca</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#667781' }}>Cargando estadísticas...</div>
        ) : STATS_ARRAY.map((s, i) => (
          <div key={i} className="sh-card ad-stat-card" style={{ padding: 24, textAlign: 'center' }}>
            <s.icon size={32} style={{ color: s.color, marginBottom: 12 }} />
            <div className="ad-stat-valor" style={{ fontSize: 32, fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{s.valor}</div>
            <div className="ad-stat-label" style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginTop: 8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="sh-card">
          <h2 className="sh-card-title"><BookOpen size={17} /> Libros Más Populares</h2>
          <div style={{ padding: '8px 0' }}>
            {stats.populares.map((l, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: i < stats.populares.length - 1 ? '1px solid var(--gray-100)' : 'none'
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: ['#4a63e0', '#7c3aed', '#059669', '#d97706', '#dc2626'][i],
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, flexShrink: 0
                }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>{l.titulo}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.autor}</div>
                </div>
                <div style={{
                  fontSize: 16, fontWeight: 800, color: 'var(--navy)',
                  background: 'var(--gray-50)', padding: '4px 12px', borderRadius: 8
                }}>{l.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="sh-card">
          <h2 className="sh-card-title"><Calendar size={17} /> Préstamos por Mes</h2>
          <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.prestamosPorMes.map((m, i) => {
              const maxCount = Math.max(...stats.prestamosPorMes.map(p => p.count), 1)
              const pct = (m.count / maxCount) * 100
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 80, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0 }}>{m.mes}</div>
                  <div style={{
                    flex: 1, height: 24, borderRadius: 6,
                    background: 'var(--gray-100)', overflow: 'hidden', position: 'relative'
                  }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 6,
                      background: '#4a63e0', transition: 'width 0.5s ease'
                    }} />
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 800, color: 'var(--navy)', width: 30, textAlign: 'right'
                  }}>{m.count}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
