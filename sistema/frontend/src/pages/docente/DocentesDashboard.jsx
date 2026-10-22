/* 
   BLOQUE 1: IMPORTACIONES
   Se importan los hooks de React y los iconos necesarios de lucide-react.
   Se vinculan los estilos compartidos (shared.css) y los específicos del docente.
*/
import { useState, useEffect, useRef } from 'react'
import { Home, ClipboardCheck, BookOpen, FolderOpen, Mail, Calendar, CalendarDays, MessageSquare, User, LogOut, Menu, Clock3, ArrowRight, MapPin, ChevronDown, ArrowLeft } from 'lucide-react';
import '../../shared.css'
import { getRoleLabel } from '../../utils/roleLabels'
import './DocentesDashboard.css'
import ChatScreen from '../../components/specific/ChatScreen';
import StudentSearch from '../../components/common/StudentSearch';
import { fetchEvents } from "../../api/events";
import { fetchPerfil, fetchHorarios, fetchComunicados } from "../../api/chat";

import { eventBus } from '../../stores/eventBus'
import NotificationBell from '../../components/NotificationBell'
import PerfilGenerico from '../auth/PerfilGenerico';
import DocenteAsistencia from './DocenteAsistencia';
import DocenteNotas from './DocenteNotas';
import DocenteMisCursos from './DocenteMisCursos';
import CalendarioDireccion from '../shared/CalendarioDireccion';
import EstudiantePrestamos from '../estudiante/EstudiantePrestamos';

const __sidebarPos = {};

/* 
   BLOQUE 2: ESTRUCTURA DE NAVEGACIÓN Y DATOS MOCK
   Define los elementos del menú lateral y datos de ejemplo para clases, 
   comunicados y eventos del docente.
*/
const NAV_ITEMS = [
  { id: 'inicio',      icon: Home,          label: 'Inicio' },
  { id: 'comunicados', icon: Mail,           label: 'Comunicados' },
  { id: 'asistencia',  icon: ClipboardCheck, label: 'Asistencia'   },
  { id: 'notas',       icon: BookOpen,       label: 'Notas'        },
  { id: 'mis-cursos',  icon: FolderOpen,     label: 'Mis Cursos'   },
  { id: 'prestamos',   icon: BookOpen,       label: 'Préstamos'   },
  { id: 'eventos',     icon: CalendarDays,       label: 'Calendario'   },
  { id: 'chat',        icon: MessageSquare,  label: 'Chat'         },
  { id: 'perfil',      icon: User,           label: 'Perfil'       },
]

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

/* 
   BLOQUE 3: COMPONENTES DE INTERFAZ
   Placeholder para mostrar secciones que aún están en desarrollo.
*/
const SectionPlaceholder = ({ title, icon: Icon }) => (
  <StudentSearch title={title} icon={Icon} />
);

/* 
   BLOQUE 4: COMPONENTE PRINCIPAL (DocentesDashboard)
   Gestiona estados de navegación, asistencia y reloj en tiempo real.
*/
export default function DocentesDashboard({ onLogout, username, onOpenCalendar, initialSection, onClearPendingSection, roles, onSwitchRole, onOpenComunicados }) {
  const [navActiva, setNavActiva] = useState(initialSection || 'inicio')
  const [asistencias, setAsistencias] = useState({})
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [hora, setHora] = useState('')
  const [rolDropdownOpen, setRolDropdownOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [, setPerfil] = useState(null);
  const [clasesHoy, setClasesHoy] = useState([])
  const [comunicadosList, setComunicadosList] = useState([])
  const navRef = useRef(null);

  // Fetch events, profile, and schedule data
  useEffect(() => {
    const t = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
    if (!t) return

    // 1. Fetch profile
    fetchPerfil(t)
      .then(pData => {
        if (!pData) return
        setPerfil(pData)
        
        // 2. Fetch all schedules
        fetchHorarios(t)
          .then(horarios => {
            // Find class of today
            let d = new Date().getDay() - 1 // 0: Lunes, 1: Martes...
            if (d < 0 || d > 4) d = 0 // fallback Lunes
            
            // Filter schedules matching the teacher's name
            const matchingName = pData.nombre_completo || pData.username
            const teacherSchedules = (horarios || []).filter(h => 
              h.profesor_nombre && 
              h.profesor_nombre.toLowerCase().includes(matchingName.toLowerCase())
            )
            
            const hoy = teacherSchedules.filter(h => h.dia === d)
            const mapped = hoy.map((h, i) => {
              // Guess year to assign CB/CS times
              const matchedAnio = h.curso_nombre?.match(/^(\d+)/)
              const anio = matchedAnio ? parseInt(matchedAnio[1], 10) : 1
              const franjas = (anio >= 4) ? FRANJAS_CS : FRANJAS_CB
              const times = franjas[h.franja] || { inicio: '07:30', fin: '08:50' }
              return {
                id: h.id || i,
                hora: `${times.inicio} - ${times.fin}`,
                materia: h.materia_nombre,
                curso: h.curso_nombre || 'Curso',
                aula: h.aula || 'Sin aula',
                tomada: false
              }
            })
            setClasesHoy(mapped)
          })
      })
      .catch(() => {})

    // 3. Fetch announcements
    fetchComunicados(t)
      .then((comData) => {
        const mapped = (comData || []).map(c => ({
          id: c.id,
          titulo: c.titulo,
          descripcion: c.cuerpo
        }))
        setComunicadosList(mapped.slice(0, 2))
      })
      .catch(() => {})

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
            .filter(e => new Date(e.fecha) >= hoy)
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
            .slice(0, 3);
          setEvents(futuros);
        })
        .catch(err => console.error("Error refetching events:", err));
    })
  }, [])

  useEffect(() => {
    if (initialSection) {
      onClearPendingSection && onClearPendingSection();
    }
  }, [initialSection, onClearPendingSection]);

  // Actualiza el reloj cada segundo
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

  const nombre = username || 'Usuario Demo';

  // Función para simular la toma de asistencia
  const handleTomar = (id) => setAsistencias(p => ({ ...p, [id]: true }))

  const fechaHoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).replace(/^\w/, c => c.toUpperCase())

  /* 
     BLOQUE 5: RENDERIZADO DE CONTENIDO
     Genera el Dashboard principal con accesos rápidos y listas de clases/eventos.
  */
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
    if (navActiva === "chat" || navActiva === "comunicados") {
      return <ChatScreen userRole="profesor" />;
    }

    if (navActiva === 'perfil') {
      return <PerfilGenerico userRole="profesor" />;
    }

    if (navActiva === 'asistencia') return <DocenteAsistencia />;
    if (navActiva === 'notas') return <DocenteNotas />;
    if (navActiva === 'mis-cursos') return <DocenteMisCursos />;
    if (navActiva === 'prestamos') return <EstudiantePrestamos userRole="profesor" />;
    if (navActiva === 'eventos') return <CalendarioDireccion canAddEvent={false} />;

    if (navActiva !== "inicio") {
      const activeItem = NAV_ITEMS.find(i => i.id === navActiva);
      return <SectionPlaceholder title={activeItem?.label || navActiva} icon={activeItem?.icon} />;
    }

    return (
      <>
        {/* Banner de Bienvenida (Hero) */}
        <div className="sh-hero">
          <div className="sh-hero-left">
            <p className="sh-hero-welcome">Bienvenido</p>
            <h1 className="sh-hero-name">Resumen Docente</h1>
            <p className="sh-hero-date"><Calendar size={13} /> {fechaHoy}</p>
            <div className="sh-hero-tags">
              <span className="sh-hero-tag">Docente · Matemática</span>
              <span className="sh-hero-tag">3 cursos a cargo</span>
            </div>
          </div>
          <div className="sh-hero-right">
            <div className="sh-hero-clock">
              <Clock3 size={16} /> {hora}
            </div>
          </div>
        </div>

        {/* Botones de Acceso Rápido (Comunicados, Tomar Asistencia, Cargar Notas) */}
        <div className="dd-acciones-header">
          <button className="sh-btn-action" onClick={() => handleNav('comunicados')}>
            <div className="sh-btn-action-icon" style={{ background: '#eef2ff', color: '#4a63e0' }}><Mail size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Comunicados</span>
              <span className="sh-btn-action-desc">Enviar y ver comunicados</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => setNavActiva('asistencia')}>
            <div className="sh-btn-action-icon"><ClipboardCheck size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Tomar asistencia</span>
              <span className="sh-btn-action-desc">Registrá presentes y ausentes</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => setNavActiva('notas')}>
            <div className="sh-btn-action-icon"><BookOpen size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Cargar notas</span>
              <span className="sh-btn-action-desc">Ingresá calificaciones por curso</span>
            </div>
          </button>
        </div>

        {/* Rejilla de Información Secundaria */}
        <div className="dd-grid">

          {/* Listado Detallado de Clases de Hoy */}
          <div className="sh-card dd-clases-card">
            <h2 className="sh-card-title">
              <ClipboardCheck size={17} /> Clases de hoy
            </h2>
            <div className="dd-clases-list">
              {clasesHoy.length === 0 ? (
                <p className="sh-empty-text">No tienes clases asignadas para hoy.</p>
              ) : (
                clasesHoy.map((clase) => {
                  const tomada = clase.tomada || asistencias[clase.id]
                  return (
                    <div key={clase.id} className="dd-clase-row">
                      <span className="dd-clase-hora">{clase.hora}</span>
                      <div className="dd-clase-info">
                        <span className="dd-clase-nombre">{clase.materia} — {clase.curso}</span>
                        <span className="dd-clase-aula">{clase.aula}</span>
                      </div>
                      <div className="dd-clase-btn-wrap">
                        {tomada
                          ? <span className="sh-badge-ok"><ClipboardCheck size={14} /> Asistencia tomada</span>
                          : <button className="sh-btn-secondary sh-btn-sm" onClick={() => handleTomar(clase.id)}>Tomar asistencia</button>
                        }
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Panel de Comunicados Institucionales */}
          <div className="sh-card">
            <h2 className="sh-card-title">
              <MessageSquare size={17} /> Comunicados Institucionales
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {comunicadosList.length === 0 ? (
                <p className="sh-empty-text">No hay comunicados recientes.</p>
              ) : (
                comunicadosList.map((c) => (
                  <div key={c.id} className="sh-comunicado-item sh-comunicado-item--admin">
                    <p className="sh-comunicado-title">{c.titulo}</p>
                    <p className="sh-comunicado-body sh-comunicado-body--expanded">{c.descripcion}</p>
                  </div>
                ))
              )}
            </div>
            <button className="sh-ver-todos" onClick={() => setNavActiva('comunicados')}>
              Ver todos <ArrowRight size={13} />
            </button>
          </div>

          {/* Panel de Eventos Próximos */}
          <div className="sh-card">
            <h2 className="sh-card-title">
              <Calendar size={17} /> Eventos próximos
            </h2>
            <div className="dd-events-list" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 4 }}>
              {events.length === 0 ? (
                <p className="sh-empty-text">No hay eventos programados.</p>
              ) : (
                events.map((e, i) => (
                  <div key={e.id || i} className={`sh-evento-item sh-evento-item--${e.tipo || 'admin'} dd-evento-card`}>
                    <div className="db-evento-indicator" />
                    <p className="sh-evento-fecha">
                      <Clock3 size={11} /> {new Date(e.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      {e.hora_inicio && ` · ${e.hora_inicio}`}
                    </p>
                    <p className="sh-evento-nombre">{e.titulo}</p>
                    {e.lugar && <p className="sh-evento-lugar"><MapPin size={10} /> {e.lugar}</p>}
                  </div>
                ))
              )}
            </div>
            <button className="sh-ver-todos" onClick={() => onOpenCalendar && onOpenCalendar()}>
              Ver calendario completo <ArrowRight size={13} />
            </button>
          </div>

        </div>
      </>
    );
  };

  /* 
     BLOQUE 6: ESTRUCTURA GLOBAL (SIDEBAR + MAIN)
     Organiza el menú lateral y la zona de visualización principal.
  */
  return (
    <div className="sh-layout">

      {/* Menú Lateral (Sidebar) */}
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

        {/* Lista de Navegación del Sidebar{/* Navegación */}
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

        {/* Footer del Sidebar con info de usuario */}
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
                    <button key={r} className={`sh-role-dropdown-item ${r === 'profesor' ? 'sh-role-dropdown-item--active' : ''}`}
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

      {/* Contenido Principal de la Pantalla */}
      <main className="sh-main">
        {/* Topbar para visualización móvil */}
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
            E.E.S.T. N°1 — Docente
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

        {/* Zona donde se inyecta el contenido renderizado */}
        <div className="sh-content">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}
