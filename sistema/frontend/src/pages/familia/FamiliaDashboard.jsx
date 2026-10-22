import { apiFetch } from '../../api/http.js'
/* 
   BLOQUE 1: IMPORTACIONES
   Se importan los hooks de React, iconos de lucide-react y los archivos de estilos.
*/
import { useState, useEffect, useMemo, useRef } from 'react'
import { Home, BookOpen, ClipboardCheck, Clock, Calendar, Mail, MessageSquare, User, LogOut, GraduationCap, ChevronDown, MapPin, Clock3, ArrowRight, CheckCircle2, Menu, CalendarDays, Pin, ChevronRight, Star, ArrowLeft } from 'lucide-react';
import '../../shared.css'
import { getRoleLabel } from '../../utils/roleLabels'
import './FamiliaDashboard.css'
import ChatScreen from '../../components/specific/ChatScreen';
import StudentSearch from '../../components/common/StudentSearch';
import FamiliaNotas from './FamiliaNotas';
import FamiliaHorarios from './FamiliaHorarios';
import FamiliaAsistencia from './FamiliaAsistencia';
import FamiliaPerfil from './FamiliaPerfil';
import { fetchEvents } from '../../api/events'
import { eventBus } from '../../stores/eventBus'
import NotificationBell from '../../components/NotificationBell'
import { API_BASE } from '../../config'

const __sidebarPos = {};

const FRANJAS_CB = [
  { inicio: '07:45', fin: '08:45' },
  { inicio: '08:45', fin: '09:45' },
  { inicio: '09:45', fin: '10:00', tipo: 'recreo' },
  { inicio: '10:00', fin: '11:00' },
  { inicio: '11:00', fin: '12:00' },
  { inicio: '12:00', fin: '13:10', tipo: 'receso' },
  { inicio: '13:10', fin: '14:10' },
  { inicio: '14:10', fin: '15:10' },
  { inicio: '15:10', fin: '15:25', tipo: 'recreo' },
  { inicio: '15:25', fin: '16:25' },
  { inicio: '16:25', fin: '17:25' },
  { inicio: '17:25', fin: '18:25' },
  { inicio: '18:25', fin: '19:25' },
  { inicio: '19:25', fin: '20:25' },
  { inicio: '20:25', fin: '21:25' },
]

const FRANJAS_CS = [
  { inicio: '07:45', fin: '08:45' },
  { inicio: '08:45', fin: '08:55', tipo: 'recreo' },
  { inicio: '08:55', fin: '09:55' },
  { inicio: '09:55', fin: '10:55' },
  { inicio: '10:55', fin: '11:05', tipo: 'recreo' },
  { inicio: '11:05', fin: '12:05' },
  { inicio: '12:05', fin: '13:10', tipo: 'receso' },
  { inicio: '13:10', fin: '14:10' },
  { inicio: '14:10', fin: '14:20', tipo: 'recreo' },
  { inicio: '14:20', fin: '15:20' },
  { inicio: '15:20', fin: '16:20' },
  { inicio: '16:20', fin: '16:30', tipo: 'recreo' },
  { inicio: '16:30', fin: '17:30' },
  { inicio: '17:30', fin: '18:30' },
  { inicio: '18:30', fin: '18:40', tipo: 'recreo' },
  { inicio: '18:40', fin: '19:40' },
  { inicio: '19:40', fin: '20:40' },
  { inicio: '20:40', fin: '20:50', tipo: 'recreo' },
  { inicio: '20:50', fin: '21:50' },
]

const NAV_ITEMS = [
  { id: 'inicio',      label: 'Inicio',            icon: Home          },
  { id: 'comunicados', label: 'Comunicados',       icon: Mail          },
  { id: 'notas',       label: 'Notas',            icon: BookOpen      },
  { id: 'asistencia',  label: 'Asistencia',       icon: ClipboardCheck },
  { id: 'horario',     label: 'Horario',          icon: Clock         },
  { id: 'eventos',     label: 'Calendario',       icon: CalendarDays   },
  { id: 'chat',        label: 'Chat',             icon: MessageSquare },
  { id: 'perfil',      label: 'Perfil',           icon: User          },
]

function CirculoAsistencia({ porcentaje }) {
  const r = 34
  const circ = 2 * Math.PI * r
  const offset = circ - (porcentaje / 100) * circ
  return (
    <svg width="90" height="90" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#e8eaf0" strokeWidth="7" />
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--accent-blue)" strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="40" y="45" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--navy)" fontFamily="inherit">
        {porcentaje}%
      </text>
    </svg>
  )
}

const SectionPlaceholder = ({ title, icon: Icon }) => (
  <StudentSearch title={title} icon={Icon} />
);

/* 
   BLOQUE 4: COMPONENTE PRINCIPAL (FamiliaDashboard)
*/
export default function FamiliaDashboard({ onLogout, username, onOpenCalendar, initialSection, onClearPendingSection, roles, onSwitchRole, onOpenComunicados }) {
  const nombre = username || 'Familia'
  const [navActiva, setNavActiva]           = useState(initialSection || 'inicio')
  const [estudianteIdx, setEstudianteIdx]   = useState(0)
  const [selectorOpen, setSelectorOpen]     = useState(false)
  const [isSidebarOpen, setIsSidebarOpen]   = useState(false)
  const [hora, setHora]                     = useState('')
  const [rolDropdownOpen, setRolDropdownOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [alumnosVinculados, setAlumnosVinculados] = useState([]);
  const [clasesHoy, setClasesHoy] = useState([])
  const [asistencia, setAsistencia] = useState({ porcentaje: 100, inasistencias: 0, permitidas: 15 })
  const [comunicadosList, setComunicadosList] = useState([])
  const navRef = useRef(null);

  // Load parent profiles and linked students
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
    if (!token) return
    apiFetch(`${API_BASE}/perfil/`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    })
      .then(r => r.json())
      .then(d => {
        const alumnos = d?.perfil_especifico?.alumnos || []
        setAlumnosVinculados(alumnos)
      })
      .catch(() => {})
  }, [])

  // Load events
  useEffect(() => {
    fetchEvents()
      .then(data => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const futuros = data
          .filter(e => e.fecha && new Date(e.fecha) >= hoy)
          .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
          .slice(0, 3);
        setEvents(futuros);
      })
      .catch(err => console.error("Error fetching events:", err));
  }, []);

  useEffect(() => {
    return eventBus.on('evento_update', () => {
      fetchEvents()
        .then(data => {
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          const futuros = data
            .filter(e => e.fecha && new Date(e.fecha) >= hoy)
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
            .slice(0, 3);
          setEvents(futuros);
        })
        .catch(err => console.error("Error refetching events:", err));
    })
  }, [])

  const estudiante = useMemo(() => {
    const alumno = alumnosVinculados[Math.min(estudianteIdx, alumnosVinculados.length - 1)]
    return alumno ? {id:alumno.id, nombre:`${alumno.nombre} ${alumno.apellido}`, curso:`${alumno.año}° ${alumno.division}`, _alumno:alumno} : {id:null,nombre:'Sin alumnos',curso:'',_alumno:null}
  }, [alumnosVinculados, estudianteIdx])
  const listaEstudiantes = alumnosVinculados.map(a => ({id:a.id,nombre:`${a.nombre} ${a.apellido}`,curso:`${a.año}° ${a.division}`,_alumno:a}))

  // Load child-specific data when selected student changes
  useEffect(() => {
    if (!estudiante?.id) return
    const t = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!t) return

    // 1. Fetch courses to find match
    apiFetch(`${API_BASE}/cursos/`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : [])
      .then((cursosData) => {
        const match = (cursosData || []).find(c => c.año === estudiante._alumno.año && c.division === estudiante._alumno.division)
        if (match) {
          // Fetch schedules
          apiFetch(`${API_BASE}/horarios/?curso=${match.id}`, { headers: { Authorization: `Bearer ${t}` } })
            .then(r => r.ok ? r.json() : [])
            .then((horarios) => {
              let d = new Date().getDay() - 1
              if (d < 0 || d > 4) d = 0 // fallback Lunes
              const hoy = (horarios || []).filter(h => h.dia === d)

              const mapped = hoy.map((h, i) => {
                const franjas = (estudiante._alumno.año >= 4) ? FRANJAS_CS : FRANJAS_CB
                const times = franjas[h.franja] || { inicio: '07:30', fin: '08:50' }
                const colors = ["#ef4444", "#f97316", "#3b82f6", "#22c55e", "#8b5cf6"]
                return {
                  id: h.id || i,
                  inicio: times.inicio,
                  fin: times.fin,
                  materia: h.materia_nombre,
                  profesor: h.profesor_nombre || 'Sin docente asignado',
                  aula: h.aula || 'Sin aula',
                  color: colors[i % colors.length]
                }
              })
              setClasesHoy(mapped)
            })
        }
      })

    // 2. Fetch cumulative attendance to calculate percentage
    apiFetch(`${API_BASE}/asistencias/?estudiante=${estudiante.id}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : [])
      .then((asisData) => {
        const totalClases = (asisData || []).reduce((sum, item) => sum + (item.total || 0), 0)
        const totalPres = (asisData || []).reduce((sum, item) => sum + (item.presentes || 0), 0)
        const totalAus = (asisData || []).reduce((sum, item) => sum + (item.ausentes || 0), 0)
        const pct = totalClases > 0 ? Math.round((totalPres / totalClases) * 100) : 100
        setAsistencia({
          porcentaje: pct,
          inasistencias: totalAus,
          permitidas: 15
        })
      })
  }, [estudiante])

  // Fetch announcements
  useEffect(() => {
    const t = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!t) return
    apiFetch(`${API_BASE}/comunicados/`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : [])
      .then((comData) => {
        const mapped = (comData || []).map(c => ({
          id: c.id,
          titulo: c.titulo,
          cuerpo: c.cuerpo,
          fecha: c.fecha ? new Date(c.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '—'
        }))
        setComunicadosList(mapped.slice(0, 3))
      })
  }, [])

  useEffect(() => {
    if (initialSection) {
      onClearPendingSection && onClearPendingSection();
    }
  }, [initialSection, onClearPendingSection]);

  // Clock tick
  useEffect(() => {
    const tick = () => setHora(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = __sidebarPos['dashboard'] || 0;
    }
  }, []);

  useEffect(() => {
    const unsub = eventBus.on('notification-navigate', ({ section }) => {
      if (section === 'chat') { setNavActiva?.('chat'); return }
      if (section === 'notas') { setNavActiva?.('notas'); return }
      if (section === 'asistencia') { setNavActiva?.('asistencia'); return }
      if (section && !['calendario', 'eventos', 'comunicados'].includes(section)) {
        setNavActiva?.(section)
      }
    })
    return unsub
  }, [])

  const handleNavScroll = (e) => {
    __sidebarPos['dashboard'] = e.target.scrollTop;
  };

  const fechaHoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).replace(/^\w/, c => c.toUpperCase())

  const handleNav = (id) => {
    if (id === 'eventos') {
      onOpenCalendar && onOpenCalendar('inicio');
      setIsSidebarOpen(false);
      return;
    }
    if (id === 'comunicados') {
      onOpenComunicados && onOpenComunicados();
      setIsSidebarOpen(false);
      return;
    }
    setNavActiva(id);
    setIsSidebarOpen(false);
  };

  const renderContent = () => {
    if (navActiva === "chat") {
      return <ChatScreen userRole="familia" />;
    }

    if (navActiva === 'notas') {
      return <FamiliaNotas estudiante={estudiante} />;
    }
    if (navActiva === 'horario') {
      return <FamiliaHorarios estudiante={estudiante} />;
    }
    if (navActiva === 'asistencia') {
      return <FamiliaAsistencia estudiante={estudiante} />;
    }
    if (navActiva === 'perfil') {
      return <FamiliaPerfil estudiante={estudiante} />;
    }
    if (navActiva !== 'inicio') {
      const activeItem = NAV_ITEMS.find(i => i.id === navActiva);
      return <SectionPlaceholder title={activeItem?.label || navActiva} />;
    }

    return (
      <>
        {/* Sección Hero */}
        <div className="sh-hero">
          <div className="sh-hero-left">
            <p className="sh-hero-welcome">Bienvenido/a</p>
            <h1 className="sh-hero-name">{nombre}</h1>
            <p className="sh-hero-date"><Calendar size={13} /> {fechaHoy}</p>

            {/* Selector de estudiante */}
            {listaEstudiantes.length > 0 && (
              <div className="fd-selector-wrapper">
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Estudiante a cargo
                </p>
                <button className="fd-selector-btn" onClick={() => setSelectorOpen(!selectorOpen)}>
                  <GraduationCap size={15} style={{ opacity: 0.8 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{estudiante.nombre}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{estudiante.curso}</span>
                  </div>
                  <ChevronDown size={14} style={{ marginLeft: 'auto', transform: selectorOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </button>
                {selectorOpen && (
                  <div className="fd-selector-dropdown">
                    {listaEstudiantes.map((e, i) => (
                      <button key={e.id} className={`fd-selector-option ${i === estudianteIdx ? 'fd-selector-option--active' : ''}`}
                        onClick={() => { setEstudianteIdx(i); setSelectorOpen(false) }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <strong>{e.nombre}</strong>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.curso}</span>
                        </div>
                        {i === estudianteIdx && <CheckCircle2 size={14} style={{ color: 'var(--accent-blue)' }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="sh-hero-right">
            <div className="sh-hero-clock">
              <Clock3 size={16} /> {hora}
            </div>
          </div>
        </div>

        {/* Botones de Acceso Rápido */}
        <div className="db-acciones-grid">
          <button className="sh-btn-action" onClick={() => handleNav('comunicados')}>
            <div className="sh-btn-action-icon" style={{ background: '#eef2ff', color: '#4a63e0' }}><Mail size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Comunicados</span>
              <span className="sh-btn-action-desc">Ver comunicados institucionales</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => setNavActiva('notas')}>
            <div className="sh-btn-action-icon" style={{ background: '#ecfdf5', color: '#059669' }}><BookOpen size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Notas</span>
              <span className="sh-btn-action-desc">Ver calificaciones</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => setNavActiva('asistencia')}>
            <div className="sh-btn-action-icon" style={{ background: '#fff7ed', color: '#d97706' }}><ClipboardCheck size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Asistencia</span>
              <span className="sh-btn-action-desc">Ver registro de asistencia</span>
            </div>
          </button>
        </div>

        {/* Eventos próximos */}
        <div className="sh-card">
          <h2 className="sh-card-title">
            <CalendarDays size={17} /> Eventos próximos
          </h2>
          <div className="db-events-list">
            {events.length === 0 ? (
              <p className="sh-empty-text">No hay eventos programados.</p>
            ) : (
              events.map((e, i) => (
                <div className={`db-evento-card db-evento-card--${e.tipo || 'admin'}`} key={e.id || i}>
                  <div className="db-evento-indicator" />
                  <div className="sh-evento-content">
                    <span className="sh-evento-fecha">
                      <Star size={11} /> {e.fecha ? new Date(e.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
                      {e.hora_inicio && ` · ${e.hora_inicio}`}
                    </span>
                    <h3 className="sh-evento-nombre">{e.titulo}</h3>
                    {e.lugar && (
                      <span className="sh-evento-ubicacion">
                        <Pin size={12} /> {e.lugar}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="sh-ver-todos" onClick={() => handleNav('eventos')}>
            Ver calendario completo <ChevronRight size={13} />
          </button>
        </div>

        {/* Panel de Comunicados */}
        <div className="sh-card fd-card-clickable" onClick={() => handleNav('comunicados')}>
          <h2 className="sh-card-title"><Mail size={17} /> Comunicados Institucionales</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {comunicadosList.length === 0 ? (
              <p className="sh-empty-text">No hay comunicados recientes.</p>
            ) : (
              comunicadosList.map((c) => (
                <div key={c.id} className="sh-comunicado-item sh-comunicado-item--preceptor">
                  <div className="sh-comunicado-header">
                    <span className="sh-comunicado-tag sh-comunicado-tag--preceptor">
                      <span className="sh-unread-dot" /> INSTITUCIONAL
                    </span>
                    <span className="sh-comunicado-date">{c.fecha}</span>
                  </div>
                  <p className="sh-comunicado-title">{c.titulo}</p>
                  <p className="sh-comunicado-body sh-comunicado-body--expanded">{c.cuerpo}</p>
                </div>
              ))
            )}
          </div>
          <button className="sh-ver-todos" onClick={(e) => { e.stopPropagation(); handleNav('comunicados'); }}>
            Ver todos <ArrowRight size={13} />
          </button>
        </div>

        {/* Rejilla de Información del Estudiante Seleccionado */}
        {estudiante.id && (
          <div className="fd-grid">

            {/* Tarjeta de Clases de Hoy */}
            <div className="sh-card fd-card-clickable" onClick={() => setNavActiva('horario')}>
              <h2 className="sh-card-title"><Clock size={17} /> Clases de hoy</h2>
              <div className="fd-clases-lista">
                {clasesHoy.length === 0 ? (
                  <p className="sh-empty-text">No hay clases hoy para este estudiante.</p>
                ) : (
                  clasesHoy.map((c, i) => (
                    <div key={c.id || i} className="fd-clase-item">
                      <div className="fd-clase-tiempo">
                        <span className="fd-clase-inicio">{c.inicio}</span>
                        <span className="fd-clase-fin">{c.fin}</span>
                      </div>
                      <span className="fd-clase-dot" style={{ background: c.color }} />
                      <div>
                        <p className="fd-clase-nombre">{c.materia}</p>
                        <p className="fd-clase-meta">{c.profesor} · <MapPin size={10} style={{ marginRight: 2, verticalAlign: 'middle' }} />{c.aula}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button className="sh-ver-todos" onClick={(e) => { e.stopPropagation(); setNavActiva('horario'); }}>
                Ver todo <ArrowRight size={13} />
              </button>
            </div>

            {/* Tarjeta de Estado General de Asistencia */}
            <div className="sh-card fd-card-clickable" onClick={() => setNavActiva('asistencia')}>
              <h2 className="sh-card-title"><ClipboardCheck size={17} /> Estado de asistencia</h2>
              <div className="fd-asistencia-wrap">
                <CirculoAsistencia porcentaje={asistencia.porcentaje} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p className="fd-asist-stat">Inasistencias: <strong>{asistencia.inasistencias}</strong> de {asistencia.permitidas}</p>
                  <p className="fd-asist-stat">Quedan <strong>{Math.max(0, asistencia.permitidas - asistencia.inasistencias)}</strong> antes del límite</p>
                </div>
              </div>
              <button className="sh-ver-todos" style={{ marginTop: '16px' }} onClick={(e) => { e.stopPropagation(); setNavActiva('asistencia'); }}>
                Ver reporte detallado <ArrowRight size={13} />
              </button>
            </div>

          </div>
        )}
      </>
    );
  };

  return (
    <div className="sh-layout">

      {/* Sidebar de Navegación Lateral */}
      <aside className={`sh-sidebar ${isSidebarOpen ? 'sh-sidebar--open' : ''}`}>
        <div className="sh-sidebar-header">
          <div className="sh-sidebar-logo">
            <img src="https://eestn1.com.ar/src/assets/img/logo.webp" alt="Logo EEST N°1" />
          </div>
          <div className="sh-sidebar-school">
            <span className="sh-school-name">E.E.S.T. N°1</span>
            <span className="sh-school-sub">Escuela de Educación Secundaria Técnica N°1 Manuel Belgrano</span>
          </div>
          <button className="sh-hamburger" style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.5)' }} onClick={() => setIsSidebarOpen(false)}>
            <ArrowLeft size={20} />
          </button>
        </div>

        <nav className="sh-nav" ref={navRef} onScroll={handleNavScroll}>
          <p className="sh-nav-section-title">MENÚ PRINCIPAL</p>
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              className={`sh-nav-item ${navActiva === id ? 'sh-nav-item--active' : ''}`}
              onClick={() => handleNav(id)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sh-sidebar-footer">
          <div className="sh-footer-user">
            <div className="sh-user-avatar">{nombre[0].toUpperCase()}</div>
            <div className="sh-user-info">
              <span className="sh-user-name">{nombre}</span>
            </div>
          </div>
          {roles && roles.length > 1 && (
            <div className="sh-role-switcher">
              <button className="sh-role-switcher-btn" onClick={() => setRolDropdownOpen(!rolDropdownOpen)}>
                <span className="sh-role-switcher-label">Cambiar rol</span>
                <ChevronDown size={14} style={{ transform: rolDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {rolDropdownOpen && (
                <div className="sh-role-dropdown">
                  {roles.map((r) => (
                    <button key={r} className={`sh-role-dropdown-item ${r === 'familia' || r === 'familias' ? 'sh-role-dropdown-item--active' : ''}`}
                      onClick={() => { onSwitchRole && onSwitchRole(r); setRolDropdownOpen(false); }}>
                      {getRoleLabel(r)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button className="sh-logout" onClick={() => onLogout && onLogout()}>
            <LogOut size={13} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="sh-main">
        {/* Topbar para móvil */}
        <div className="sh-mobile-topbar">
          <button className="sh-hamburger" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="sh-topbar-brand">
            <img src="https://eestn1.com.ar/src/assets/img/logo.webp" className="sh-topbar-logo" alt="logo" />
            <span className="sh-topbar-name">EEST N°1</span>
          </div>
          <div className="sh-mobile-topbar-actions">
            <button className="sh-desktop-topbar-notif" onClick={() => setNavActiva("chat")} aria-label="Abrir chat">
              <MessageSquare size={20} />
            </button>
            <NotificationBell />
            <div className="sh-mobile-topbar-user">
              <div className="sh-user-avatar">{nombre[0].toUpperCase()}</div>
              <span className="sh-mobile-username">{nombre}</span>
            </div>
          </div>
        </div>

        <header className="sh-desktop-topbar">
          <div className="sh-desktop-topbar-title">
            <img src="https://eestn1.com.ar/src/assets/img/logo.webp" className="sh-desktop-topbar-logo" alt="logo" />
            E.E.S.T. N°1 — Familia
          </div>
          <div className="sh-desktop-topbar-actions">
            <button className="sh-desktop-topbar-notif" onClick={() => setNavActiva("chat")} aria-label="Abrir chat">
              <MessageSquare size={20} />
            </button>
            <NotificationBell />
            <div className="sh-desktop-topbar-user">
              <div className="sh-user-avatar">{nombre[0].toUpperCase()}</div>
              <span className="sh-user-name-desktop">{nombre}</span>
            </div>
          </div>
        </header>

        <div className="sh-content">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}
