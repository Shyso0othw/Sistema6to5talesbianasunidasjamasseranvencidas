/*
   BLOQUE 1: IMPORTACIONES
   Se importan los hooks de React (useState, useEffect), los iconos de lucide-react
   y los estilos compartidos y específicos para este componente.
*/
/*
   BLOQUE 1: IMPORTACIONES
   Se importan los hooks de React (useState, useEffect), los iconos de lucide-react
   y los estilos compartidos y específicos para este componente.
*/
import { useState, useEffect, useRef } from "react";
import { LayoutDashboard, Users, GraduationCap, UserCheck, UserCog, BookOpen, CalendarDays, Clock, LogOut, UserPlus, FolderPlus, FolderOpen, Send, BarChart2, FileBarChart, ClipboardList, ClipboardCheck, Settings, Mail, MessageSquare, Menu, ArrowLeft, Clock3, Calendar, ChevronDown, ChevronRight, Pin, Star, ChevronUp, Shield, Briefcase, Heart, Activity, FileText, Book } from "lucide-react";
import "../../shared.css"
import { getRoleLabel } from "../../utils/roleLabels"
import './AdminDashboard.css'
import ChatScreen from '../../components/specific/ChatScreen'
import StudentSearch from '../../components/common/StudentSearch'
import { fetchEvents } from "../../api/events"
import { fetchDashboardStats } from "../../api/chat"

import { eventBus } from '../../stores/eventBus'
import NotificationBell from '../../components/NotificationBell'
import CalendarioDireccion from '../shared/CalendarioDireccion'
import AgregarUsuario from '../../components/specific/AgregarUsuario';

import AdminEstudiantes from './AdminEstudiantes';
import AdminDocentes from './AdminDocentes';
import PersonalStaff from '../shared/PersonalStaff';
import AdminPreceptores from './AdminPreceptores';
import AdminFamilias from './AdminFamilias';
import AdminCursos from './AdminCursos';
import AdminOrientaciones from './AdminOrientaciones';
import AdminMaterias from './AdminMaterias';
import AdminHorarios from './AdminHorarios';
import AdminReportes from './AdminReportes';
import AdminConfiguracion from './AdminConfiguracion';
import AdminAsistenciaPersonal from './AdminAsistenciaPersonal';
import CargaNotas from '../shared/CargaNotas';
import CargaAsistencia from '../shared/CargaAsistencia';

const __sidebarPos = {};

/*
   BLOQUE 2: DATOS DE PRUEBA (MOCK DATA)
   Definición de estadísticas, accesos rápidos, actividad reciente y estructura de navegación.
   Estos datos simulan la información que vendría de una base de datos o API.
*/
const STATS_TEMPLATE = [
  { id: 1,  key: 'total_alumnos',           label: "Estudiantes",          Icon: GraduationCap, color: "blue",   navId: "estudiantes" },
  { id: 2,  key: 'total_profesores',        label: "Docentes activos",     Icon: Users,         color: "green",  navId: "docentes" },
  { id: 3,  key: 'total_cursos',            label: "Cursos activos",       Icon: FolderPlus,    color: "purple", navId: "cursos" },
  { id: 4,  key: 'total_preceptores',       label: "Preceptores",          Icon: Shield,        color: "yellow", navId: "preceptores" },
  { id: 5,  key: 'total_familias',          label: "Tutores / Familias",   Icon: Users,         color: "green",  navId: "tutores-familias" },
  { id: 6,  key: 'total_directivos',        label: "Directivos",           Icon: UserCog,       color: "red",    navId: "personal" },
  { id: 7,  key: 'total_secretaria',        label: "Secretaría",           Icon: FileText,      color: "gray",   navId: "personal" },
  { id: 8,  key: 'total_auxiliares',        label: "Auxiliares",           Icon: Briefcase,     color: "blue",   navId: "personal" },
  { id: 9,  key: 'total_bibliotecarios',    label: "Bibliotecarios",       Icon: Book,          color: "green",  navId: "personal" },
  { id: 10, key: 'total_eoe',               label: "EOE",                  Icon: Heart,         color: "pink",   navId: "personal" },
  { id: 11, key: 'total_ematp',             label: "EMATP",                Icon: Activity,      color: "yellow", navId: "personal" },
  { id: 12, key: 'total_jefe_preceptores',  label: "Jefe de Preceptores",  Icon: Shield,        color: "yellow", navId: "personal" },
  { id: 13, key: 'total_jefe_area',         label: "Jefe de Área",         Icon: BookOpen,      color: "purple", navId: "personal" },
  { id: 14, key: 'total_jefe_departamento', label: "Jefe de Departamento", Icon: BookOpen,      color: "purple", navId: "personal" },
];

const ACCESO_RAPIDO = [
  { id: 1, label: "Agregar Usuario",  Icon: UserPlus,        color: "gray",   navId: "agregar-usuario"   },
  { id: 2, label: "Crear curso",      Icon: FolderPlus,      color: "green",  navId: "cursos"            },
  { id: 3, label: "Gestionar horarios", Icon: Clock,         color: "blue",   navId: "horarios"          },
  { id: 4, label: "Enviar comunicado", Icon: Send,           color: "purple", navId: "comunicados"       },
  { id: 5, label: "Ver reportes",     Icon: BarChart2,       color: "yellow", navId: "reportes"          },
  { id: 6, label: "Configuración",    Icon: Settings,        color: "gray2",  navId: "configuracion"     },
];



const canManageAcademic = (roles) => {
  const allowed = ['preceptor', 'director', 'directivo', 'admin', 'secretario', 'secretaria'];
  return roles.some(r => allowed.includes(r.toLowerCase()));
};

const NAV_SECTIONS = (roles = []) => [
  {
    id: "inicio",
    titulo: "INICIO",
    items: [
      { id: "dashboard", label: "Inicio", icon: LayoutDashboard },
    ]
  },
  {
    id: "control-usuarios",
    titulo: "CONTROL DE USUARIOS",
    items: [
      { id: "estudiantes", label: "Estudiantes", icon: GraduationCap },
      { id: "docentes", label: "Docentes", icon: UserCheck },
      { id: "preceptores", label: "Preceptores", icon: UserCog },
      { id: "tutores-familias", label: "Tutores / Familias", icon: Users },
      { id: "personal", label: "Gestión de Personal", icon: Users },
      { id: "agregar-usuario", label: "Agregar Usuario", icon: UserPlus },
    ]
  },
  {
    id: "control-institucional",
    titulo: "CONTROL INSTITUCIONAL",
    items: [
      { id: "orientaciones", label: "Orientaciones", icon: BookOpen },
      { id: "cursos", label: "Cursos", icon: FolderOpen },
      { id: "materias", label: "Materias", icon: BookOpen },
      { id: "horarios", label: "Horarios", icon: Clock },
    ]
  },
  {
    id: "academico",
    titulo: "ACADÉMICO",
    items: [
      { id: "asistencia-personal", label: "Asistencia Personal", icon: ClipboardList },
      ...(canManageAcademic(roles) ? [
        { id: "carga-notas", label: "Carga Notas", icon: BookOpen },
        { id: "carga-asistencia", label: "Carga Asistencia", icon: ClipboardCheck },
      ] : []),
    ]
  },
  {
    id: "gestion-reportes",
    titulo: "GESTIÓN Y REPORTES",
    items: [
      { id: "comunicados", label: "Comunicados", icon: Mail },
      { id: "chat", label: "Chat", icon: MessageSquare },
      { id: "reportes", label: "Reportes / Estad.", icon: FileBarChart },
      { id: "eventos", label: "Calendario", icon: CalendarDays },
      { id: "configuracion", label: "Configuración", icon: Settings },
    ]
  }
];

/*
   BLOQUE 3: COMPONENTES AUXILIARES
   Componentes pequeños reutilizables para mostrar iconos de actividad o marcadores de sección.
*/


function SectionPlaceholder({ title }) {
  return <StudentSearch title={title} />;
}

/*
   BLOQUE 4: COMPONENTE PRINCIPAL (AdminDashboard)
   Gestiona el estado de navegación, el reloj en tiempo real y renderiza el contenido principal.
*/
export default function AdminDashboard({ onLogout, username, onOpenCalendar, initialSection, onClearPendingSection, roles = [], onSwitchRole, onOpenComunicados }) {
  const [navActiva, setNavActiva] = useState(initialSection || "dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openSections, setOpenSections] = useState(() => {
    let def = { 'control-usuarios': false, 'control-institucional': false, 'academico': false, 'gestion-reportes': false };
    const sectionToOpen = initialSection || "dashboard";
    for (const sec of NAV_SECTIONS(roles)) {
      if (sec.items && sec.items.find(i => i.id === sectionToOpen)) {
        def[sec.id] = true;
      }
    }
    return def;
  });
  const [hora, setHora] = useState("");
  const [rolDropdownOpen, setRolDropdownOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [statsData, setStatsData] = useState({});
  const navRef = useRef(null);

  useEffect(() => {
    const t = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!t) return;
    fetchDashboardStats(t)
      .then(data => setStatsData(data))
      .catch(err => console.error('Error fetching stats:', err));
  }, [navActiva]);


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

  const nombre = username || "Administrador";

  useEffect(() => {
    if (initialSection) {
      onClearPendingSection && onClearPendingSection();
    }
  }, [initialSection, onClearPendingSection]);

  // Efecto para actualizar el reloj cada segundo
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

  /*
     BLOQUE 5: RENDERIZADO DE CONTENIDO
     Función que decide qué mostrar en el área central según la navegación activa.
  */
  const handleNav = (id) => {
    if (id === 'eventos' || id === 'calendario') { onOpenCalendar?.(navActiva); return }
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
      return <ChatScreen userRole="admin" onBack={() => setNavActiva("dashboard")} />
    }

    if (navActiva === "agregar-usuario") {
      return <AgregarUsuario />
    }

    if (navActiva === "eventos") {
      return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'var(--sh-bg)' }}>
          <CalendarioDireccion
            onLogout={onLogout}
            username={username}
            navSections={NAV_SECTIONS(roles)}
            activeNav="eventos"
            onNav={handleNav}
            roles={roles}
            onSwitchRole={onSwitchRole}
          />
        </div>
      );
    }

    if (navActiva === "estudiantes") return <AdminEstudiantes />;
    if (navActiva === "docentes") return <AdminDocentes />;
    if (navActiva === "personal") return <PersonalStaff />;
    if (navActiva === "preceptores") return <AdminPreceptores />;
    if (navActiva === "tutores-familias") return <AdminFamilias />;
    if (navActiva === "cursos") return <AdminCursos />;
    if (navActiva === "orientaciones") return <AdminOrientaciones />;
    if (navActiva === "materias") return <AdminMaterias />;
    if (navActiva === "horarios") return <AdminHorarios />;
    if (navActiva === "reportes") return <AdminReportes />;
    if (navActiva === "configuracion") return <AdminConfiguracion />;

    if (navActiva === "asistencia-personal") return <AdminAsistenciaPersonal />;
    if (navActiva === "carga-notas") return <CargaNotas />;
    if (navActiva === "carga-asistencia") return <CargaAsistencia />;

    if (navActiva !== "dashboard") {
      let activeItem = null;
      for (const sec of NAV_SECTIONS(roles)) {
        const found = sec.items.find(i => i.id === navActiva);
        if (found) { activeItem = found; break; }
      }
      return <SectionPlaceholder title={activeItem?.label || navActiva} />;
    }

    return (
      <>
        {/* Sección Hero: Bienvenida y Reloj */}
        <div className="sh-hero">
          <div className="sh-hero-left">
            <p className="sh-hero-welcome">Gestión Centralizada</p>
            <h1 className="sh-hero-name">Resumen del Sistema</h1>
            <p className="sh-hero-date">
              <Calendar size={13} /> Ciclo lectivo 2026
            </p>
          </div>
          <div className="sh-hero-right">
            <div className="sh-hero-clock">
              <Clock3 size={16} /> {hora}
            </div>
          </div>
        </div>

        {/* Tarjetas Principales */}
        <div className="ad-stats-grid" style={{ marginBottom: '32px' }}>
          {STATS_TEMPLATE.map((s) => (
            <div className="ad-stat-card" key={s.id} onClick={() => handleNav(s.navId)} style={{ cursor: 'pointer' }}>
              <div className={`ad-stat-icon-wrap ad-stat-icon-wrap--${s.color}`}>
                <s.Icon size={20} />
              </div>
              <div>
                <p className="ad-stat-valor">{statsData[s.key] !== undefined ? statsData[s.key] : "..."}</p>
                <p className="ad-stat-label">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Distribución principal del Dashboard (Acceso Rápido y Actividad) */}
        <div className="ad-desktop-grid">
          {/* Tarjeta de Acceso Rápido */}
          <div className="sh-card" style={{ marginBottom: 0 }}>
            <p className="ad-section-label" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '16px', letterSpacing: '1px' }}>ACCESO RÁPIDO</p>
            <div className="ad-acciones-grid">
              {ACCESO_RAPIDO.map(({ id, label, Icon, navId }) => (
                <button key={id} className="sh-btn-action" onClick={() => handleNav(navId)}>
                  <div className="sh-btn-action-icon" style={{ background: '#eef2ff', color: '#4a63e0' }}><Icon size={20} /></div>
                  <div>
                    <span className="sh-btn-action-label">{label}</span>
                    <span className="sh-btn-action-desc">Ir a {label.toLowerCase()}</span>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--gray-100)' }}>
              <p className="ad-section-label" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '1px' }}>GESTIÓN DE USUARIOS</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button className="sh-btn-ghost" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => handleNav("estudiantes")}><GraduationCap size={16} />Estudiantes</button>
                <button className="sh-btn-ghost" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => handleNav("docentes")}><UserCheck size={16} />Docentes</button>
                <button className="sh-btn-ghost" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => handleNav("preceptores")}><UserCog size={16} />Preceptores</button>
                <button className="sh-btn-ghost" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => handleNav("tutores-familias")}><Users size={16} />Tutores/Familias</button>
              </div>
            </div>
          </div>

          {/* Eventos próximos */}
          <div className="sh-card" style={{ marginBottom: 0 }}>
            <h3 className="sh-card-title">
              <CalendarDays size={18} style={{ color: 'var(--accent-blue)' }} />
              Eventos próximos
            </h3>
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
            <button className="sh-ver-todos" onClick={() => setNavActiva("eventos")}>
              Ver calendario completo <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </>
    );
  };

  /*
     BLOQUE 6: ESTRUCTURA PRINCIPAL (SIDEBAR + MAIN)
     Define la disposición general: Sidebar de navegación y contenido principal.
  */
  return (
    <div className="sh-layout">
      {isSidebarOpen && <button aria-label="Cerrar menú lateral" className="sh-sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}

      {/* Menú Lateral (Sidebar) */}
      <aside className={`sh-sidebar ${isSidebarOpen ? "sh-sidebar--open" : ""}`}>
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

        {/* Navegación */}
        <nav className="sh-nav" ref={navRef} onScroll={handleNavScroll}>
          {NAV_SECTIONS(roles).map((section) => (
            <div key={section.id} style={{ marginBottom: section.id !== 'inicio' ? 4 : 0 }}>
              {section.id !== 'inicio' && (
                <div
                  className="sh-nav-section-title"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '8px 12px', marginTop: 12, borderRadius: 6, '&:hover': { background: 'rgba(255,255,255,0.05)' } }}
                  onClick={() => setOpenSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                    {section.titulo}
                  </span>
                  {openSections[section.id] ? <ChevronUp size={14} style={{ color: 'rgba(255,255,255,0.4)' }} /> : <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />}
                </div>
              )}

              <div style={{ display: section.id === 'inicio' || openSections[section.id] ? 'block' : 'none' }}>
                {section.items.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    className={`sh-nav-item ${navActiva === id ? "sh-nav-item--active" : ""}`}
                    onClick={() => handleNav(id)}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sh-sidebar-footer">
          <div className="sh-footer-user">
            <div className="sh-user-avatar">{username ? username[0].toUpperCase() : "U"}</div>
            <div className="sh-user-info">
              <span className="sh-user-name">{username}</span>
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
                    <button key={r} className={`sh-role-dropdown-item ${r === 'admin' ? 'sh-role-dropdown-item--active' : ''}`}
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
        {/* Barra superior móvil (Hamburguesa + Logo) */}
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
            <button className="sh-hamburger" style={{ marginRight: '12px', display: 'none' }} onClick={() => setIsSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <img src="https://eestn1.com.ar/src/assets/img/logo.webp" className="sh-desktop-topbar-logo" alt="logo" />
            E.E.S.T. N°1 — Administración
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

        {/* Área donde se renderiza el contenido dinámico */}
        <div className="sh-content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
