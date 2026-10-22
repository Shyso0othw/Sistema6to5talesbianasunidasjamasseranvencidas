import './jefededepartamento.css'
import '../../shared.css'
import { useState, useEffect, useRef } from 'react'
import { Home, Users, Calendar, CalendarDays, Clock, Clock3, BookOpen, MessageSquare, User, LogOut, Menu, ArrowRight, ArrowLeft, Mail, ChevronDown, ChevronRight, Pin, Star } from 'lucide-react';
import ChatScreen from '../../components/specific/ChatScreen';
import StudentSearch from '../../components/common/StudentSearch';
import { fetchEvents } from "../../api/events";
import { fetchDashboardStats, fetchDocentes, fetchMaterias } from "../../api/chat";
import NotificationBell from '../../components/NotificationBell'

import { eventBus } from '../../stores/eventBus'
import { getRoleLabel } from '../../utils/roleLabels';
import PerfilGenerico from '../auth/PerfilGenerico';
import JefeDeptoDocentes from './JefeDeptoDocentes';
import JefeDeptoHorarios from './JefeDeptoHorarios';
import JefeDeptoMaterias from './JefeDeptoMaterias';
import CalendarioDireccion from '../shared/CalendarioDireccion';

const __sidebarPos = {};

const NAV_ITEMS = [
  { id: 'inicio',       icon: Home,          label: 'Inicio' },
  { id: 'comunicados',  icon: Mail,          label: 'Comunicados' },
  { id: 'docentes',    icon: Users,          label: 'Docentes'     },
  { id: 'horarios',    icon: Clock,       label: 'Horarios'     },
  { id: 'calendario',  icon: CalendarDays,   label: 'Calendario'   },
  { id: 'materias',    icon: BookOpen,       label: 'Materias'     },
  { id: 'chat',        icon: MessageSquare,  label: 'Chat'         },
  { id: 'perfil',      icon: User,           label: 'Perfil'       },
]



const SectionPlaceholder = ({ title, icon: Icon }) => (
  <StudentSearch title={title} icon={Icon} />
);

export default function JefeDepartamento({ onLogout, username, onOpenCalendar, initialSection, onClearPendingSection, roles, onSwitchRole, onOpenComunicados }) {
  const nombre = username || 'Carlos Medina'
  const [navActiva, setNavActiva] = useState(initialSection || 'inicio')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [hora, setHora] = useState('')
  const [rolDropdownOpen, setRolDropdownOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [statsData, setStatsData] = useState({})
  const [materiasCount, setMateriasCount] = useState('...')
  const [docentesList, setDocentesList] = useState([])
  const navRef = useRef(null);

  useEffect(() => {
    const t = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
    if (!t) return

    // Fetch dashboard stats
    fetchDashboardStats(t)
      .then(data => setStatsData(data))
      .catch(() => {})

    // Fetch materias
    fetchMaterias(t)
      .then(data => setMateriasCount(data.length))
      .catch(() => {})

    // Fetch docentes
    fetchDocentes(t)
      .then(data => {
        setDocentesList(data.map(d => ({
          nombre: `${d.apellido}, ${d.nombre}`,
          materias: d.materia || 'Sin materia asignada',
          horas: d.cargo || 'Cargo a confirmar',
          activo: true
        })))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchEvents()
      .then(data => setEvents(data.slice(0, 3)))
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
    if (id === 'calendario') {
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
      return <ChatScreen userRole="jefe_departamento" />;
    }

    if (navActiva === 'perfil') {
      return <PerfilGenerico userRole="jefe_departamento" />;
    }

    if (navActiva === 'docentes') return <JefeDeptoDocentes />;
    if (navActiva === 'horarios') return <JefeDeptoHorarios />;
    if (navActiva === 'materias') return <JefeDeptoMaterias />;
    if (navActiva === 'calendario') return <CalendarioDireccion />;

    if (navActiva !== 'inicio') {
      const activeItem = NAV_ITEMS.find(i => i.id === navActiva)
      return <SectionPlaceholder title={activeItem?.label || navActiva} icon={activeItem?.icon} />
    }

    return (
      <>
        {/* HERO */}
        <div className="sh-hero">
          <div className="sh-hero-left">
            <p className="sh-hero-welcome">Bienvenido</p>
            <h1 className="sh-hero-name">Resumen de Departamento</h1>
            <p className="sh-hero-date"><Calendar size={13} /> {fechaHoy}</p>
            <div className="sh-hero-tags">
              <span className="sh-hero-tag">Jefe de Departamento</span>
              <span className="sh-hero-tag">{docentesList.length} docentes registrados</span>
            </div>
          </div>
          <div className="sh-hero-right">
            <div className="sh-hero-clock">
              <Clock3 size={16} /> {hora}
            </div>
          </div>
        </div>

        {/* Quick Access Buttons */}
        <div className="db-acciones-grid">
          <button className="sh-btn-action" onClick={() => handleNav('comunicados')}>
            <div className="sh-btn-action-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}><Mail size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Comunicados</span>
              <span className="sh-btn-action-desc">Enviar y ver avisos</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => setNavActiva('docentes')}>
            <div className="sh-btn-action-icon" style={{ background: '#eef2ff', color: '#4a63e0' }}><Users size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Docentes</span>
              <span className="sh-btn-action-desc">Gestión de docentes</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => setNavActiva('materias')}>
            <div className="sh-btn-action-icon" style={{ background: '#ecfdf5', color: '#059669' }}><BookOpen size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Materias</span>
              <span className="sh-btn-action-desc">Gestión de materias</span>
            </div>
          </button>
        </div>

        {/* HEADER */}
        <div className="jd-header">
          <h2 className="jd-title">Gestión de Departamento</h2>
          <p className="jd-subtitle">Supervisión de docentes, horarios y materias académicas</p>
        </div>

        {/* STATS */}
        <div className="jd-stats">
          <div className="sh-card jd-stat-card">
            <div className="jd-stat-icon-wrap">
              <Users size={24} />
            </div>
            <div>
              <p className="jd-stat-number">{statsData.total_profesores ?? '...'}</p>
              <p className="jd-stat-label">Docentes totales</p>
            </div>
          </div>
          <div className="sh-card jd-stat-card">
            <div className="jd-stat-icon-wrap" style={{ color: '#7c3aed', background: '#f5f3ff' }}>
              <BookOpen size={24} />
            </div>
            <div>
              <p className="jd-stat-number">{materiasCount}</p>
              <p className="jd-stat-label">Materias activas</p>
            </div>
          </div>
          <div className="sh-card jd-stat-card">
            <div className="jd-stat-icon-wrap" style={{ color: '#059669', background: '#ecfdf5' }}>
              <Calendar size={24} />
            </div>
            <div>
              <p className="jd-stat-number">{statsData.total_cursos ?? '...'}</p>
              <p className="jd-stat-label">Cursos con horario</p>
            </div>
          </div>
        </div>

        {/* DOCENTES */}
        <div className="sh-card">
          <div className="jd-card-header">
            <h2 className="sh-card-title">
              <Users size={17} /> Docentes del departamento
            </h2>
            <a href="#" className="jd-gestionar">Gestionar todos <ArrowRight size={14} /></a>
          </div>
          <div className="jd-docentes-grid">
            {docentesList.length === 0 ? (
              <p className="sh-empty-text">No hay docentes registrados.</p>
            ) : (
              docentesList.slice(0, 4).map((doc, i) => (
                <div key={i} className={`jd-docente-row ${!doc.activo ? 'jd-docente-inactivo' : ''}`}>
                  <div className="jd-docente-info">
                    <p className="jd-docente-nombre">{doc.nombre}</p>
                    <p className="jd-docente-materia">{doc.materias}</p>
                    <p className="jd-docente-horas">{doc.horas}</p>
                  </div>
                  <button className="sh-btn-ghost sh-btn-sm" onClick={() => setNavActiva('docentes')}>Ver detalle</button>
                </div>
              ))
            )}
          </div>
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
                       <Star size={11} /> {new Date(e.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
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
          <button className="sh-ver-todos" onClick={() => handleNav('calendario')}>
            Ver calendario completo <ChevronRight size={13} />
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="sh-layout">
      {/* SIDEBAR */}
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
                    <button key={r} className={`sh-role-dropdown-item ${r === 'jefe_departamento' ? 'sh-role-dropdown-item--active' : ''}`}
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

      {/* MAIN */}
      <main className="sh-main">
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
            E.E.S.T. N°1 — Jefe de Depto.
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
