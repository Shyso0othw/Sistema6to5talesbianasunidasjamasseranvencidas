/*
   BLOQUE 1: IMPORTACIONES
   Se importan React, iconos de lucide-react y los estilos necesarios.
*/
/*
   BLOQUE 1: IMPORTACIONES
   Se importan React, iconos de lucide-react y los estilos necesarios.
*/
import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, ClipboardCheck, Calendar, CalendarDays, MessageSquare, Mail, User, LogOut, Menu, Clock3, Star, MapPin, ArrowRight, ChevronDown, ArrowLeft, BookOpen } from 'lucide-react';
import '../../shared.css'
import { getRoleLabel } from '../../utils/roleLabels'
import './preceptordashboard.css'
import ChatScreen from '../../components/specific/ChatScreen';
import StudentSearch from '../../components/common/StudentSearch';
import { fetchEvents } from "../../api/events";
import { fetchCursos, fetchAlumnos } from "../../api/chat";

import { eventBus } from '../../stores/eventBus'
import NotificationBell from '../../components/NotificationBell'
import PerfilGenerico from '../auth/PerfilGenerico';
import PreceptorAsistencia from './PreceptorAsistencia';
import PreceptorHorarios from './PreceptorHorarios';
import CalendarioDireccion from '../shared/CalendarioDireccion';
import CargaNotas from '../shared/CargaNotas';

const __sidebarPos = {};

/*
   BLOQUE 2: DATOS DE PRUEBA (MOCK DATA)
   Datos estáticos para simular cursos, asistencia, mensajes y eventos del preceptor.
*/
const NAV_ITEMS = [
  { id: 'inicio',       icon: LayoutDashboard, label: 'Inicio' },
  { id: 'comunicados',  icon: Mail,            label: 'Comunicados'   },
  { id: 'asistencia',   icon: ClipboardCheck,  label: 'Asistencia'   },
  { id: 'carga-notas',  icon: BookOpen,        label: 'Carga Notas'   },
  { id: 'horarios',     icon: Clock3,           label: 'Horarios'     },
  { id: 'eventos',      icon: CalendarDays,        label: 'Calendario'    },
  { id: 'chat',         icon: MessageSquare,   label: 'Chat'         },
  { id: 'perfil',       icon: User,            label: 'Perfil'       },
]


/*
   BLOQUE 3: PLACEHOLDER PARA SECCIONES EN DESARROLLO
   Placeholder para mostrar secciones que aún están en desarrollo.
*/
const SectionPlaceholder = ({ title, icon: Icon }) => (
  <StudentSearch title={title} icon={Icon} />
);

/*
   BLOQUE 4: COMPONENTE PRINCIPAL (PreceptorDashboard)
   Gestiona estados de navegación, reloj y renderizado de la interfaz.
*/
export default function PreceptorDashboard({ onLogout, username, onOpenCalendar, initialSection, onClearPendingSection, roles, onSwitchRole, onOpenComunicados }) {
  const [navActiva, setNavActiva] = useState(initialSection || 'inicio');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hora, setHora] = useState("");
  const [rolDropdownOpen, setRolDropdownOpen] = useState(false);
  const [events, setEvents] = useState([])
  const [cursosAsistencia, setCursosAsistencia] = useState([])
  const [cursosCargo, setCursosCargo] = useState([])
  const navRef = useRef(null);

  useEffect(() => {
    const t = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
    if (!t) return

    // Fetch courses and students
    Promise.all([
      fetchCursos(t),
      fetchAlumnos(t)
    ])
      .then(([cData, aData]) => {
        const mapped = (cData || []).map(c => {
          const count = (aData || []).filter(a => a.año === c.año && a.division === c.division).length
          return {
            curso: `${c.año}° Año ${c.division}`,
            estudiantes: count,
            completada: false,
            tomada: false
          }
        })
        setCursosAsistencia(mapped)
        setCursosCargo(mapped.slice(0, 3))
      })
      .catch((err) => console.error('Error loading preceptor data:', err))

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

  const nombre = username || "Preceptor/a";

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

  /*
     BLOQUE 5: RENDERIZADO DE CONTENIDO
     Decide qué mostrar en pantalla según la navegación activa.
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
    // Caso especial: Chat (usar componente dedicado)
    if (navActiva === 'chat' || navActiva === 'comunicados') {
      return <ChatScreen userRole="preceptor" />;
    }

    if (navActiva === 'perfil') {
      return <PerfilGenerico userRole="preceptor" />;
    }

    if (navActiva === 'asistencia') return <PreceptorAsistencia />;
    if (navActiva === 'horarios') return <PreceptorHorarios />;
    if (navActiva === 'eventos') return <CalendarioDireccion />;
    if (navActiva === 'carga-notas') return <CargaNotas />;

    if (navActiva !== 'inicio') {
      const activeItem = NAV_ITEMS.find(i => i.id === navActiva);
      return <SectionPlaceholder title={activeItem?.label || navActiva}
icon={activeItem?.icon} />;
    }

    return (
      <>
        {/* Banner Hero: Bienvenida y Reloj */}
        <div className="sh-hero">
          <div className="sh-hero-left">
            <p className="sh-hero-welcome">Bienvenida</p>
            <h1 className="sh-hero-name">Resumen de Preceptoría</h1>
            <p className="sh-hero-date">
              <Calendar size={13} /> {fechaHoy}
            </p>
          </div>
          <div className="sh-hero-right">
            <div className="sh-hero-clock">
              <Clock3 size={16} /> {hora}
            </div>
          </div>
        </div>

        {/* Grid de Accesos Rápidos */}
        <div className="pd-acciones-grid">
          <button className="sh-btn-action" onClick={() => handleNav("comunicados")}>
            <div className="sh-btn-action-icon" style={{ background: '#eef2ff', color: '#4a63e0' }}><Mail size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Comunicados</span>
              <span className="sh-btn-action-desc">Enviar y ver comunicados</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => handleNav("asistencia")}>
            <div className="sh-btn-action-icon" style={{ background: '#eef2ff', color: '#4a63e0' }}><ClipboardCheck size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Tomar Asistencia</span>
              <span className="sh-btn-action-desc">Control diario de alumnos</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => handleNav("eventos")}>
            <div className="sh-btn-action-icon" style={{ background: '#fff7ed', color: '#d97706' }}><Calendar size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Calendario</span>
              <span className="sh-btn-action-desc">Eventos y fechas importantes</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => handleNav("perfil")}>
            <div className="sh-btn-action-icon" style={{ background: '#ecfdf5', color: '#059669' }}><User size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Mi Perfil</span>
              <span className="sh-btn-action-desc">Ajustes de cuenta</span>
            </div>
          </button>
        </div>

        {/* Módulo Principal: Gestión de Asistencia por Curso */}
        <div className="sh-card pd-main-card">
          <h2 className="sh-card-title">
            <ClipboardCheck size={17} /> Tomar asistencia
          </h2>
          <p className="sh-card-subtitle">Podés tomar lista de cualquier curso</p>
          <div className="pd-asistencia-list">
            {cursosAsistencia.map((item, i) => (
              <div key={i} className="sh-row pd-row-hover">
                <div className="pd-curso-info">
                  <p className="pd-curso-nombre">{item.curso}</p>
                  <p className="pd-curso-estudiantes">{item.estudiantes} estudiantes</p>
                </div>
                <div className="pd-btn-wrap">
                  {item.completada ? (
                    <div className="pd-badge-wrap">
                      <span className="sh-badge-ok"><ClipboardCheck size={14} /> Completada</span>
                      <button className="sh-btn-ghost sh-btn-sm">
                      <ArrowRight size={14} /> Editar
                    </button>
                    </div>
                  ) : (
                    <button className="sh-btn-primary sh-btn-sm" onClick={() => setNavActiva('asistencia')}>Tomar asistencia</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribución Inferior: Mensajes, Cursos y Eventos */}
        <div className="pd-bottom-grid">

          {/* Listado de Mensajes de los Docentes */}
          <div className="sh-card">
            <h2 className="sh-card-title">
              <MessageSquare size={17} /> Mensajes de Docentes
            </h2>
            <div className="pd-mensajes-lista">
                <p className="sh-empty-text" style={{ padding: '20px 0' }}>No hay mensajes recientes.</p>
            </div>
            <button className="sh-ver-todos" onClick={() => setNavActiva('chat')}>
              Ver todos <ArrowRight size={13} />
            </button>
          </div>

          {/* Resumen de Cursos a Cargo */}
          <div className="sh-card">
            <h2 className="sh-card-title">
              <User size={17} /> Mis cursos a cargo
            </h2>
            <div className="pd-cursos-cargo-lista">
              {cursosCargo.map((c, i) => (
                <div key={i} className="sh-row pd-row-hover">
                  <div>
                    <p className="pd-curso-nombre">{c.curso}</p>
                    <p className="pd-curso-estudiantes">{c.estudiantes} estudiantes</p>
                  </div>
                  <span className={c.tomada ? 'sh-badge-ok' : 'sh-badge-warn'}>
                    {c.tomada ? 'Tomada' : 'Pendiente'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Próximos Eventos en el Calendario */}
          <div className="sh-card">
            <h2 className="sh-card-title">
              <Calendar size={17} /> Eventos próximos
            </h2>
            <div className="pd-events-list" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 4 }}>
              {events.length === 0 ? (
                <p className="sh-empty-text">No hay eventos programados.</p>
              ) : (
                events.map((e, i) => (
                  <div key={e.id || i} className={`sh-evento-item sh-evento-item--${e.tipo || 'admin'} pd-evento-card`}>
                    <div className="db-evento-indicator" />
                    <p className="sh-evento-fecha">
                      <Star size={11} /> {new Date(e.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      {e.hora_inicio && ` · ${e.hora_inicio}`}
                    </p>
                    <p className="sh-evento-nombre">{e.titulo}</p>
                    {e.lugar && <p className="sh-evento-lugar"><MapPin size={11} /> {e.lugar}</p>}
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
     BLOQUE 6: ESTRUCTURA PRINCIPAL (SIDEBAR + MAIN)
     Define el layout general con navegación lateral y contenido central.
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

        {/* Navegación del Sidebar */}
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

        {/* Footer del Sidebar con info de usuario y cierre de sesión */}
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
                    <button key={r} className={`sh-role-dropdown-item ${r === 'preceptor' ? 'sh-role-dropdown-item--active' : ''}`}
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
        {/* Topbar para móviles */}
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
            E.E.S.T. N°1 — Preceptor
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

        {/* Área de Contenido Dinámico */}
        <div className="sh-content">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}
