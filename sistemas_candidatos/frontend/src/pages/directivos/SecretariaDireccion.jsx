/* 
   BLOQUE 1: IMPORTACIONES
   Se importan los hooks de React, iconos de lucide-react y los archivos de estilos.
*/
import { useState, useEffect, useRef } from 'react'
import { LayoutDashboard, Users, UserCheck, Clock, BookOpen, User, LogOut, Menu, Clock3, Calendar, CalendarDays, ChevronRight, ArrowLeft, ArrowRight, ShieldCheck, Activity, Mail, UserCog, GraduationCap, Briefcase, Edit3, ChevronDown, Pin, MessageSquare, Bell } from 'lucide-react';
import '../../shared.css'
import { getRoleLabel } from '../../utils/roleLabels'
import './SecretariaDireccion.css'
import ChatScreen from '../../components/specific/ChatScreen';
import StudentSearch from '../../components/common/StudentSearch';
import { fetchEvents } from '../../api/events'
import { fetchDashboardStats, fetchComunicados } from '../../api/chat'

import { eventBus } from '../../stores/eventBus'
import NotificationBell from '../../components/NotificationBell'
import PerfilGenerico from '../auth/PerfilGenerico';
import SecretariaEstudiantes from './SecretariaEstudiantes';
import SecretariaDocentes from './SecretariaDocentes';
import SecretariaPreceptores from './SecretariaPreceptores';
import SecretariaTutores from './SecretariaTutores';
import PersonalStaff from '../shared/PersonalStaff';
import SecretariaHorarios from './SecretariaHorarios';
import SecretariaMaterias from './SecretariaMaterias';
import SecretariaActividad from './SecretariaActividad';
import AdminAsistenciasPersonal from '../admin/AdminAsistenciasPersonal';
import CargaNotas from '../shared/CargaNotas';
import CargaAsistencia from '../shared/CargaAsistencia';

const __sidebarPos = {};

/* 
   BLOQUE 2: DATOS DE PRUEBA (MOCK DATA)
*/
const NAV_ITEMS = [
  { id: "dashboard", icon: LayoutDashboard, label: "Inicio" },
  { id: "comunicados", icon: Mail, label: "Comunicados" },
  { id: "eventos", icon: CalendarDays, label: "Calendario" },
  { id: "estudiantes", icon: GraduationCap, label: "Estudiantes" },
  { id: "docentes", icon: UserCheck, label: "Docentes" },
  { id: "preceptores", icon: UserCog, label: "Preceptores" },
  { id: "tutores-familias", icon: Users, label: "Familias" },
  { id: "personal", icon: Users, label: "Personal" },
  { id: "asistencias-personal", icon: Calendar, label: "Asist. Personal" },
  { id: "horarios", icon: Clock, label: "Horarios" },
  { id: "materias", icon: BookOpen, label: "Materias" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "actividad-reciente", icon: Activity, label: "Actividad reciente" },
  { id: "perfil", icon: User, label: "Perfil" },
];

const GESTION_USUARIOS = [
  { id: 'estudiantes',      label: 'Estudiantes'      },
  { id: 'docentes',         label: 'Docentes'         },
  { id: 'preceptores',      label: 'Preceptores'      },
  { id: 'tutores-familias', label: 'Tutores/Familias' },
  { id: 'personal',         label: 'Personal'         },
]


/* 
   BLOQUE 4: COMPONENTE PRINCIPAL (SecretaríaDirección)
 */
export default function SecretariaDireccion({ onLogout, username, onOpenCalendar, initialSection, onClearPendingSection, roles, onSwitchRole, onOpenComunicados }) {
  const [navActiva, setNavActiva] = useState(initialSection || 'dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [hora, setHora] = useState('')
  const [rolDropdownOpen, setRolDropdownOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [stats, setStats] = useState(null);
  const [comunicados, setComunicados] = useState([])
  const ACTIVIDAD = (stats?.actividad || []).map(a => ({id:a.id,titulo:a.tipo,detalle:a.texto,tiempo:a.tiempo}));
  const navRef = useRef(null);

  useEffect(() => {
    const t = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
    if (!t) return

    // Fetch stats
    fetchDashboardStats(t)
      .then(setStats)
      .catch(() => {})

    // Fetch announcements
    fetchComunicados(t)
      .then(data => setComunicados(data.slice(0, 3)))
      .catch(() => {})

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

  useEffect(() => {
    if (initialSection) {
      onClearPendingSection && onClearPendingSection();
    }
  }, [initialSection, onClearPendingSection]);

  const nombre = username || 'Lic. Martínez'

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
      onOpenCalendar && onOpenCalendar('dashboard');
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
      return <ChatScreen userRole="secretaria" />;
    }

    if (navActiva === 'perfil') {
      return <PerfilGenerico userRole="secretaria" />;
    }

    if (navActiva === "estudiantes") return <SecretariaEstudiantes />;
    if (navActiva === "docentes") return <SecretariaDocentes />;
    if (navActiva === "preceptores") return <SecretariaPreceptores />;
    if (navActiva === "tutores-familias") return <SecretariaTutores />;
    if (navActiva === "personal") return <PersonalStaff />;
    if (navActiva === "horarios") return <SecretariaHorarios />;
    if (navActiva === "materias") return <SecretariaMaterias />;
    if (navActiva === "actividad-reciente") return <SecretariaActividad />;
if (navActiva === "carga-notas") return <CargaNotas />;
  if (navActiva === "carga-asistencia") return <CargaAsistencia />;
  if (navActiva === "asistencias-personal") return <AdminAsistenciasPersonal onLogout={onLogout} username={username} />;

  if (navActiva !== 'dashboard') {
      const activeItem = NAV_ITEMS.find(i => i.id === navActiva);
      return <StudentSearch title={activeItem?.label || navActiva} icon={activeItem?.icon} />;
    }

    return (
      <>
        {/* Hero Section */}
        <div className="sh-hero">
          <div className="sh-hero-left">
            <p className="sh-hero-welcome">SECRETARÍA / DIRECCIÓN</p>
            <h1 className="sh-hero-name">{nombre}</h1>
            <p className="sh-hero-date"><Calendar size={13} /> {fechaHoy}</p>
            <div className="sd-hero-badge">
              <span className="sd-badge">
                <ShieldCheck size={14} /> Secretaría/Director
              </span>
            </div>
          </div>
          <div className="sh-hero-right">
            <div className="sh-hero-clock">
              <Clock3 size={16} /> {hora}
            </div>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="sd-acciones-grid">
          <button className="sh-btn-action" onClick={() => handleNav('estudiantes')}>
            <div className="sh-btn-action-icon" style={{ background: '#eef2ff', color: '#4a63e0' }}><GraduationCap size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Gestión de Alumnos</span>
              <span className="sh-btn-action-desc">Legajos y documentación</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => handleNav('eventos')}>
            <div className="sh-btn-action-icon" style={{ background: '#fff7ed', color: '#d97706' }}><Calendar size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Calendario</span>
              <span className="sh-btn-action-desc">Eventos institucionales</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => handleNav('comunicados')}>
            <div className="sh-btn-action-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}><Mail size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Comunicados</span>
              <span className="sh-btn-action-desc">Enviar avisos generales</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => handleNav('personal')}>
            <div className="sh-btn-action-icon" style={{ background: '#ecfdf5', color: '#059669' }}><Briefcase size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Personal</span>
              <span className="sh-btn-action-desc">Docentes y auxiliares</span>
            </div>
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="sd-grid">
          
          {/* Gestión de usuarios */}
          <div className="sh-card">
            <h2 className="sh-card-title">
              <Users size={17} /> Gestión de usuarios
            </h2>
            <p className="sd-section-label">Acceso rápido</p>
            <div className="sd-usuarios-list">
              {GESTION_USUARIOS.map((item) => (
                <button 
                  key={item.id} 
                  className="sd-usuario-row"
                  onClick={() => setNavActiva(item.id)}
                >
                  <span>{item.label}</span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </div>

          {/* Actividad reciente */}
          <div className="sh-card">
            <h2 className="sh-card-title">
              <Activity size={17} /> Actividad reciente
            </h2>
            <div className="sd-actividad-list">
              {ACTIVIDAD.map((act) => (
                <div key={act.id} className="sd-actividad-item-box">
                  <div className="sd-actividad-header-row">
                    <div className="sd-actividad-dot" />
                    <p className="sd-actividad-titulo">{act.titulo}</p>
                    <span className="sd-actividad-tiempo">{act.tiempo}</span>
                  </div>
                  <p className="sd-actividad-detalle">{act.detalle}</p>
                  <button className="sd-btn-edit-small">
                    <Edit3 size={12} /> Editar
                  </button>
                </div>
              ))}
             </div>
            <button className="sh-ver-todos" onClick={() => setNavActiva('actividad-reciente')}>
              Ver más actividades <ArrowRight size={13} />
            </button>
          </div>

          {/* Comunicados */}
          <div className="sh-card">
            <h2 className="sh-card-title">
              <Bell size={17} /> Comunicados
            </h2>
            <div className="sd-comunicados-list">
              {comunicados.map((act) => (
                <div key={act.id} className="sh-comunicado-item sh-comunicado-item--blue">
                  <div className="sh-comunicado-header">
                    <span className="sh-comunicado-tag sh-comunicado-tag--blue">
                      <span className="sh-unread-dot" /> {act.tipo_destinatario}
                    </span>
                  </div>
                  <p className="sh-comunicado-title">{act.titulo}</p>
                  <p className="sh-comunicado-date">{act.fecha ? new Date(act.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : ''}</p> 
                </div>
              ))}
            </div>
            <button className="sh-ver-todos" onClick={() => handleNav('comunicados')}>
              Ver más comunicados <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Próximos eventos (Full Width) */}
        <div className="sh-card sd-eventos-card" onClick={() => onOpenCalendar && onOpenCalendar()} style={{ cursor: 'pointer' }}>
          <h2 className="sh-card-title">
            <Calendar size={17} /> Próximos eventos
          </h2>
          <div className="sd-eventos-grid">
            {events.length === 0 ? (
              <p className="sh-empty-text" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px' }}>No hay eventos programados.</p>
            ) : (
              events.map((e, i) => (
                <div key={e.id || i} className={`db-evento-card db-evento-card--${e.tipo || 'admin'}`}>
                  <div className="db-evento-indicator" />
                  <div className="sh-evento-content">
                    <span className="sh-evento-fecha">
                      {e.fecha ? new Date(e.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
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
          <button className="sh-ver-todos" style={{ marginTop: '16px' }} onClick={(e) => { e.stopPropagation(); onOpenCalendar && onOpenCalendar(); }}>
            Ver calendario completo <ArrowRight size={13} />
          </button>
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
                    <button key={r} className={`sh-role-dropdown-item ${r === 'secretario' || r === 'secretaria' ? 'sh-role-dropdown-item--active' : ''}`}
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
            E.E.S.T. N°1 — Secretaría
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
