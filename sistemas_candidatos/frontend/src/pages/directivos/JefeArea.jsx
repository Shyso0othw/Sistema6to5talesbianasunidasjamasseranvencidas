/* 
   BLOQUE 1: IMPORTACIONES
   Se importan los hooks de React, iconos de lucide-react y los archivos de estilos.
*/
import { useState, useEffect, useRef } from 'react'
import { Home, Users, Clock, User, LogOut, Menu, Mail, Clock3, Calendar, CalendarDays, ChevronDown, Edit3, MessageSquare, ArrowRight, BookOpen, ArrowLeft } from 'lucide-react';
import '../../shared.css'
import './JefeArea.css'
import { getRoleLabel } from '../../utils/roleLabels'
import ChatScreen from '../../components/specific/ChatScreen';
import StudentSearch from '../../components/common/StudentSearch';
import { fetchEvents } from '../../api/events'
import { fetchComunicados, fetchDocentes } from '../../api/chat'
import NotificationBell from '../../components/NotificationBell'

import { eventBus } from '../../stores/eventBus'
import PerfilGenerico from '../auth/PerfilGenerico';
import JefeAreaDocentes from './JefeAreaDocentes';
import JefeAreaHorarios from './JefeAreaHorarios';
import CalendarioDireccion from '../shared/CalendarioDireccion';

const __sidebarPos = {};

/* 
   BLOQUE 2: DATOS DE PRUEBA (MOCK DATA)
*/
const NAV_ITEMS = [
  { id: 'inicio',       icon: Home,          label: 'Inicio' },
  { id: 'comunicados',  icon: Mail,          label: 'Comunicados' },
  { id: 'docentes',    icon: Users,         label: 'Docentes'   },
  { id: 'horarios',    icon: Clock,         label: 'Horarios'   },
  { id: 'calendario',  icon: CalendarDays,  label: 'Calendario' },
  { id: 'chat',        icon: MessageSquare, label: 'Chat'       },
  { id: 'perfil',      icon: User,          label: 'Perfil'     },
]





/* 
   BLOQUE 3: COMPONENTES AUXILIARES
*/
const SectionPlaceholder = ({ title, icon: Icon }) => (
  <StudentSearch title={title} icon={Icon} />
);

/* 
   BLOQUE 4: COMPONENTE PRINCIPAL (JefeArea)
*/
export default function JefeArea({ onLogout, username, onOpenCalendar, initialSection, onClearPendingSection, roles, onSwitchRole, onOpenComunicados }) {
  const [navActiva, setNavActiva] = useState(initialSection || 'inicio')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [hora, setHora] = useState('')
  const [rolDropdownOpen, setRolDropdownOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [docentesList, setDocentesList] = useState([])
  const [comunicadosList, setComunicadosList] = useState([])
  const navRef = useRef(null);

  useEffect(() => {
    const t = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
    if (!t) return

    // Fetch docentes
    fetchDocentes(t)
      .then(data => {
        setDocentesList(data.map(d => ({
          id: d.id,
          nombre: `${d.apellido}, ${d.nombre}`,
          materia: d.materia || 'Sin materia asignada',
          info: d.cuil ? `CUIL: ${d.cuil}` : 'Datos vigentes',
          initial: d.apellido ? d.apellido[0].toUpperCase() : 'D'
        })))
      })
      .catch(() => {})

    // Fetch comunicados
    fetchComunicados(t)
      .then(data => {
        setComunicadosList(data.map(c => {
          const colors = ['blue', 'purple', 'green', 'yellow']
          const color = colors[c.id % colors.length]
          return {
            id: c.id,
            tag: c.tipo_destinatario === 'Todos' ? 'INSTITUCIONAL' : 'COMUNICADO',
            titulo: c.titulo,
            fecha: c.fecha ? new Date(c.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '—',
            color
          }
        }))
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

  const nombre = username || 'Prof. Castillo'

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
      return <ChatScreen userRole="jefe_area" />;
    }

    if (navActiva === 'perfil') {
      return <PerfilGenerico userRole="jefe_area" />;
    }

    if (navActiva === 'docentes') return <JefeAreaDocentes />;
    if (navActiva === 'horarios') return <JefeAreaHorarios />;
    if (navActiva === 'calendario') return <CalendarioDireccion />;

    if (navActiva !== 'inicio') {
      const activeItem = NAV_ITEMS.find(i => i.id === navActiva);
      return <SectionPlaceholder title={activeItem?.label || navActiva} icon={activeItem?.icon} />;
    }

    return (
      <>
        {/* Hero Section */}
        <div className="sh-hero">
          <div className="sh-hero-left">
            <p className="sh-hero-welcome">JEFE DE AREA</p>
            <h1 className="sh-hero-name">{nombre}</h1>
            <p className="sh-hero-date"><Calendar size={13} /> {fechaHoy}</p>
            <div className="ja-hero-selector">
              <button className="ja-selector-btn">
                <BookOpen size={14} /> Jefe de area <ChevronDown size={14} />
              </button>
            </div>
          </div>
          <div className="sh-hero-right">
            <div className="sh-hero-clock">
              <Clock3 size={16} /> {hora}
            </div>
          </div>
        </div>

        {/* Quick Access Buttons */}
        <div className="ja-acciones-header">
          <button className="sh-btn-action" onClick={() => setNavActiva('docentes')}>
            <div className="sh-btn-action-icon" style={{ background: '#eef2ff', color: '#4a63e0' }}><Users size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Gestionar Docentes</span>
              <span className="sh-btn-action-desc">Asignaciones y horarios</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => handleNav('comunicados')}>
            <div className="sh-btn-action-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}><Mail size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Comunicados</span>
              <span className="sh-btn-action-desc">Enviar y ver avisos</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => setNavActiva('horarios')}>
            <div className="sh-btn-action-icon" style={{ background: '#fff7ed', color: '#d97706' }}><Clock size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Ver Horarios</span>
              <span className="sh-btn-action-desc">Materias y disponibilidad</span>
            </div>
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="ja-grid">
          {/* Próximos Eventos */}
          <div className="sh-card">
            <h2 className="sh-card-title">
              <CalendarDays size={17} /> Próximos Eventos
            </h2>
            <div className="ja-eventos-list">
              {events.length > 0 ? (
                events.map((event) => (
                  <div key={event.id} className="sh-comunicado-item sh-comunicado-item--blue" style={{ marginBottom: '8px' }}>
                    <div className="sh-comunicado-header">
                      <span className="sh-comunicado-tag sh-comunicado-tag--blue">
                        <Clock size={12} /> {new Date(event.start).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                    <p className="sh-comunicado-title">{event.title}</p>
                  </div>
                ))
              ) : (
                <p className="sh-card-subtitle">No hay eventos próximos</p>
              )}
            </div>
          </div>

          {/* Docentes del area */}
          <div className="sh-card ja-docentes-card">
            <h2 className="sh-card-title">
              <BookOpen size={17} /> Docentes del área
            </h2>
            <p className="sh-card-subtitle">Depto. de Ciencias Exactas</p>
            <div className="ja-docentes-list">
              {docentesList.length === 0 ? (
                <p className="sh-empty-text">No hay docentes registrados.</p>
              ) : (
                docentesList.slice(0, 4).map((doc, i) => (
                  <div key={doc.id || i} className="ja-docente-row">
                    <div className="ja-docente-avatar">{doc.initial}</div>
                    <div className="ja-docente-info">
                      <span className="ja-docente-nombre">{doc.nombre}</span>
                      <span className="ja-docente-meta">{doc.materia} · {doc.info}</span>
                    </div>
                    <button className="ja-docente-edit" onClick={() => setNavActiva('docentes')}>
                      <Edit3 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Comunicados */}
          <div className="sh-card">
            <h2 className="sh-card-title">
              <MessageSquare size={17} /> Comunicados
            </h2>
            <div className="ja-comunicados-list">
              {comunicadosList.length === 0 ? (
                <p className="sh-empty-text">No hay comunicados recientes.</p>
              ) : (
                comunicadosList.map((c, i) => (
                  <div key={c.id || i} className={`sh-comunicado-item sh-comunicado-item--${c.color}`}>
                    <div className="sh-comunicado-header">
                      <span className={`sh-comunicado-tag sh-comunicado-tag--${c.color}`}>
                        <span className="sh-unread-dot" /> {c.tag}
                      </span>
                    </div>
                    <p className="sh-comunicado-title">{c.titulo}</p>
                    <p className="sh-comunicado-date">{c.fecha}</p>
                  </div>
                ))
              )}
            </div>
            <button className="sh-ver-todos" onClick={() => handleNav('comunicados')}>
              Ver todos <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="sh-layout">
      {/* Sidebar */}
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
                    <button key={r} className={`sh-role-dropdown-item ${r === 'jefe_area' ? 'sh-role-dropdown-item--active' : ''}`}
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

      {/* Main Content */}
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
            E.E.S.T. N°1 — Jefe de Área
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
