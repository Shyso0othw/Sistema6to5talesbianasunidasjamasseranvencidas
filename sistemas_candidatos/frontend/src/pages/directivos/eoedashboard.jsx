import { useState, useEffect, useRef } from 'react'
import { Home, Calendar, FolderOpen, CalendarDays, Mail, MessageSquare, User, LogOut, Menu, Clock, Clock3, Search, ChevronDown, ArrowLeft } from 'lucide-react';
import '../../shared.css'
import { getRoleLabel } from '../../utils/roleLabels'
import NotificationBell from '../../components/NotificationBell'

import { eventBus } from '../../stores/eventBus'
import './eoedashboard.css'
import ChatScreen from '../../components/specific/ChatScreen';
import StudentSearch from '../../components/common/StudentSearch';
import { fetchEvents } from "../../api/events";
import PerfilGenerico from '../auth/PerfilGenerico';
import EOECursos from './EOECursos';
import EOEHorarios from './EOEHorarios';

const __sidebarPos = {};

const NAV_ITEMS = [
  { id: 'inicio',       icon: Home,          label: 'Inicio' },
  { id: 'comunicados',  icon: Mail,          label: 'Comunicados' },
  { id: 'horarios',   icon: Clock,      label: 'Horarios'     },
  { id: 'cursos',     icon: FolderOpen,    label: 'Cursos'       },
  { id: 'calendario', icon: CalendarDays,  label: 'Calendario'   },
  { id: 'chat',       icon: MessageSquare, label: 'Chat'         },
  { id: 'perfil',     icon: User,          label: 'Perfil'       },
]




const SectionPlaceholder = ({ title, icon: Icon }) => (
  <StudentSearch title={title} icon={Icon} />
);

export default function EOEDashboard({ onLogout, username, onOpenCalendar, initialSection, onClearPendingSection, roles, onSwitchRole, onOpenComunicados }) {
  const nombre = username || 'Sofía Ramírez'
  const [navActiva, setNavActiva] = useState(initialSection || 'inicio')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [hora, setHora] = useState('')
  const [rolDropdownOpen, setRolDropdownOpen] = useState(false)
  const [, setEvents] = useState([]);
  const navRef = useRef(null);

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
      .catch(err => console.error("Error fetching events:", err));
  }, []);

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
      onOpenCalendar && onOpenCalendar(navActiva);
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
      return <ChatScreen userRole="eoe" />;
    }

    if (navActiva === 'perfil') {
      return <PerfilGenerico userRole="eoe" />;
    }

    if (navActiva === 'horarios') return <EOEHorarios />;
    if (navActiva === 'cursos') return <EOECursos />;

    if (navActiva !== 'inicio') {
      const activeItem = NAV_ITEMS.find(i => i.id === navActiva)
      return <SectionPlaceholder title={activeItem?.label || navActiva} icon={activeItem?.icon} />
    }

    return (
      <>
        {/* HERO */}
        <div className="sh-hero">
          <div className="sh-hero-left">
            <p className="sh-hero-welcome">Bienvenida</p>
            <h1 className="sh-hero-name">{nombre}</h1>
            <p className="sh-hero-date"><Calendar size={13} /> {fechaHoy}</p>
            <div className="sh-hero-tags">
              <span className="sh-hero-tag">Equipo de Orientación</span>
              <span className="sh-hero-tag">Ciclo Lectivo 2025</span>
            </div>
          </div>
          <div className="sh-hero-right">
            <div className="sh-hero-clock">
              <Clock3 size={16} /> {hora}
            </div>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN RÁPIDA */}
        <div className="eoe-acciones-grid">
          <button className="sh-btn-action" onClick={() => handleNav('comunicados')}>
            <div className="sh-btn-action-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}><Mail size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Comunicados</span>
              <span className="sh-btn-action-desc">Ver comunicados</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => handleNav('cursos')}>
            <div className="sh-btn-action-icon" style={{ background: '#ecfdf5', color: '#059669' }}><Search size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Buscar Cursos</span>
              <span className="sh-btn-action-desc">Consulta de legajo y seguimiento</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => handleNav('calendario')}>
            <div className="sh-btn-action-icon" style={{ background: '#eef2ff', color: '#4a63e0' }}><CalendarDays size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Ver Calendario</span>
              <span className="sh-btn-action-desc">Agenda y próximos eventos</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => handleNav('chat')}>
            <div className="sh-btn-action-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}><MessageSquare size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Chat General</span>
              <span className="sh-btn-action-desc">Comunicación con el equipo</span>
            </div>
          </button>
        </div>

        <div className="eoe-main-grid" style={{ gridTemplateColumns: '1fr' }}>
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
                    <button key={r} className={`sh-role-dropdown-item ${r === 'eoe' ? 'sh-role-dropdown-item--active' : ''}`}
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
            <button className="sh-desktop-topbar-notif" onClick={() => setNavActiva("chat")} aria-label="Abrir chat">
            <MessageSquare size={20} />
          </button>
            <NotificationBell />
        </div>


        <header className="sh-desktop-topbar">
          <div className="sh-desktop-topbar-title">
            <img src="https://eestn1.com.ar/src/assets/img/logo.webp" className="sh-desktop-topbar-logo" alt="logo" />
            E.E.S.T. N°1 — EOE
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
