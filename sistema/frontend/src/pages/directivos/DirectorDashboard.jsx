import AdminEstudiantes from '../admin/AdminEstudiantes'
import { useState, useEffect, useRef } from "react";
import { LayoutDashboard, Users, FileBarChart, Mail, MessageSquare, CalendarDays, LogOut, ChevronRight, AlertTriangle, Calendar, Clock3, Menu, ArrowLeft, ChevronDown, Pin, Star, Bell } from "lucide-react";
import "../../shared.css";
import { getRoleLabel } from '../../utils/roleLabels';
import './DirectorDashboard.css';
import ChatScreen from '../../components/specific/ChatScreen';
import StudentSearch from '../../components/common/StudentSearch';
import { fetchEvents } from "../../api/events";
import { fetchDashboardStats, fetchComunicados } from "../../api/chat";

import { eventBus } from '../../stores/eventBus'
import NotificationBell from '../../components/NotificationBell'
import PersonalStaff from '../shared/PersonalStaff';
import DirectorReportes from './DirectorReportes';
import DirectorAlertas from './DirectorAlertas';
import CalendarioDireccion from '../shared/CalendarioDireccion';



const __sidebarPos = {};

const FECHA = new Date().toLocaleDateString("es-AR", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const NAV_ITEMS = [
  { id: "inicio", icon: LayoutDashboard, label: "Inicio" },
  { id: "comunicados", icon: Mail, label: "Comunicados" },
  { id: "estudiantes", icon: Users, label: "Estudiantes" },
  { id: "personal", icon: Users, label: "Personal" },
  { id: "reportes", icon: FileBarChart, label: "Reportes" },
  { id: "calendario", icon: CalendarDays, label: "Calendario" },
  { id: "alertas", icon: Bell, label: "Alertas" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
];

const STATS_TEMPLATE = [
  { label: "Total alumnos",     key: 'total_alumnos',    sub: "activos este año",    cls: "" },
  { label: "Total profesores",  key: 'total_profesores', sub: "en actividad",        cls: "dir-stat-value--blue" },
  { label: "Total preceptores", key: 'total_preceptores', sub: "en actividad",       cls: "dir-stat-value--green" },
  { label: "Asistencia hoy",    key: 'asistencia_hoy',  sub: "del total de alumnos", cls: "dir-stat-value--amber" },
];


const REPORTES = [
  "Asistencia por curso",
  "Rendimiento académico general",
  "Alumnos en riesgo",
];



const SectionPlaceholder = ({ title, icon: Icon }) => (
  <StudentSearch title={title} icon={Icon} />
);

export default function DirectorDashboard({ onLogout, username, onOpenCalendar, onOpenComunicados, initialSection, onClearPendingSection, roles, onSwitchRole }) {
  const nombre = username || "Director/a";
  const [activeNav, setActiveNav] = useState(initialSection || "inicio");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hora, setHora] = useState("");
  const [rolDropdownOpen, setRolDropdownOpen] = useState(false);
  const [events, setEvents] = useState([])
  const [statsData, setStatsData] = useState({});
  const [comunicadosList, setComunicadosList] = useState([]);
  const ALERTAS = statsData.alertas_count == null ? [] : [{tipo:'warning',icon:AlertTriangle,iconColor:'#d97706',titulo:`${statsData.alertas_count} estudiantes con más de diez ausencias registradas`,sub:'Consultar seguimiento de inasistencias'}];
  const PERSONAL = [{nombre:'Profesores',cantidad:statsData.total_profesores ?? '…'},{nombre:'Preceptores',cantidad:statsData.total_preceptores ?? '…'},{nombre:'Aux / Bibl / EOE',cantidad:statsData.total_auxiliares == null ? '…' : statsData.total_auxiliares + statsData.total_bibliotecarios + statsData.total_eoe}];
  const navRef = useRef(null);

  useEffect(() => {
    const t = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!t) return;
    fetchDashboardStats(t)
      .then(data => setStatsData(data))
      .catch(err => console.error('Error fetching stats:', err));
    
    // Fetch comunicados
    fetchComunicados(t)
      .then(data => {
        setComunicadosList(data.slice(0, 3).map(c => ({
          id: c.id,
          tipo: c.tipo_destinatario === 'Todos' ? 'INSTITUCIONAL' : 'COMUNICADO',
          titulo: c.titulo,
          cuerpo: c.cuerpo,
          fecha: c.fecha ? new Date(c.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '—'
        })))
      })
      .catch(() => {})
  }, []);


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

  // Navegación directa sin pasar por Inicio
  useEffect(() => {
    if (initialSection) {
      onClearPendingSection && onClearPendingSection();
    }
  }, [initialSection, onClearPendingSection]);

  useEffect(() => {
    const tick = () => setHora(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = __sidebarPos['dashboard'] || 0;
    }
  }, []);

  useEffect(() => {
    const unsub = eventBus.on('notification-navigate', ({ section }) => {
      if (section === 'chat') { setActiveNav?.('chat'); return }
      if (section === 'notas') { setActiveNav?.('notas'); return }
      if (section === 'asistencia') { setActiveNav?.('asistencia'); return }
      if (section && !['calendario', 'eventos', 'comunicados'].includes(section)) {
        setActiveNav?.(section)
      }
    })
    return unsub
  }, [])

  const handleNavScroll = (e) => {
    __sidebarPos['dashboard'] = e.target.scrollTop;
  };

  const iniciales = nombre
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
    setActiveNav(id);
    setIsSidebarOpen(false);
  };


  const renderContent = () => {
    if (activeNav === "chat") {
      return <ChatScreen userRole="director" />;
    }

    if (activeNav === "estudiantes") return <AdminEstudiantes />;
    if (activeNav === "personal") return <PersonalStaff />;
    if (activeNav === "reportes") return <DirectorReportes />;
    if (activeNav === "alertas") return <DirectorAlertas />;
    if (activeNav === "calendario") return <CalendarioDireccion />;

    if (activeNav !== "inicio") {
      const activeItem = NAV_ITEMS.find(i => i.id === activeNav);
      return <SectionPlaceholder title={activeItem?.label || activeNav} icon={activeItem?.icon} />;
    }

    return (
      <>
        {/* Hero */}
        <div className="sh-hero">
          <div className="sh-hero-left">
            <p className="sh-hero-welcome">Resumen Institucional</p>
            <h1 className="sh-hero-name">Resumen de Dirección</h1>
            <p className="sh-hero-date"><Calendar size={13} /> {FECHA}</p>
          </div>

          <div className="sh-hero-right">
            <div className="sh-hero-clock">
              <Clock3 size={16} /> {hora}
            </div>
          </div>
        </div>


        {/* Quick actions grid */}
        <div className="db-acciones-grid">
          <button 
            className="sh-btn-action"
            onClick={() => onOpenComunicados && onOpenComunicados()}
          >
            <div className="sh-btn-action-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <span className="sh-btn-action-label">Gestión de Comunicados</span>
              <span className="sh-btn-action-desc">Crear y enviar comunicados a la comunidad</span>
            </div>
          </button>
        </div>

        {/* Tarjetas resumen */}
        <div className="dir-stats-grid">
          {STATS_TEMPLATE.map((s) => (
            <div className="dir-stat-card" key={s.label}>
              <p className="dir-stat-label">{s.label}</p>
              <p className={`dir-stat-value ${s.cls}`}>{statsData[s.key] ?? '...'}</p>
              <p className="dir-stat-sub">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Alertas calculadas desde los registros */}
        <div className="sh-card">
          <h2 className="sh-card-title">
            <Bell size={17} /> Alertas
          </h2>
          <div className="dir-alertas-lista">
            {ALERTAS.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} className={`dir-alerta-item dir-alerta-item--${a.tipo}`}>
                  <span className="dir-alerta-icon"><Icon size={18} color={a.iconColor} /></span>
                  <div className="dir-alerta-texto">
                    <p className="dir-alerta-titulo">{a.titulo}</p>
                    <p className="dir-alerta-sub">{a.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comunicados recibidos */}
        <div className="sh-card">
          <h2 className="sh-card-title">
            <Mail size={17} /> Últimos comunicados
          </h2>
          <div className="em-comunicados-lista" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
            {comunicadosList.length === 0 ? (
              <p className="sh-empty-text">No hay comunicados recientes.</p>
            ) : (
              comunicadosList.map((c) => (
                <div key={c.id} className="em-comunicado-item" style={{ padding: '12px', border: '1px solid var(--gray-100)', borderRadius: '8px', background: '#fafafa' }}>
                  <div className="em-comunicado-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#6366f1' }}>{c.tipo}</span>
                    <span style={{ fontSize: '11px', color: '#888' }}>{c.fecha}</span>
                  </div>
                  <p className="em-comunicado-titulo" style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 4px 0' }}>{c.titulo}</p>
                  <p className="em-comunicado-cuerpo" style={{ fontSize: '12px', color: '#555', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.cuerpo}</p>
                </div>
              ))
            )}
          </div>
          <button className="sh-ver-todos" onClick={() => handleNav("comunicados")} style={{ marginTop: '12px' }}>
            Ver todos los comunicados <ChevronRight size={13} />
          </button>
        </div>

        {/* Próximos eventos */}
        <div className="sh-card">
          <h2 className="sh-card-title">
            <Calendar size={17} /> Próximos eventos
          </h2>
          <div className="dir-events-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
            {events.length > 0 ? (
              events.map((e, i) => (
                <div key={e.id || i} className={`db-evento-card db-evento-card--${e.tipo || 'admin'}`}>
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
            ) : (
              <p className="sh-no-data" style={{ textAlign: 'center', padding: '20px', color: 'var(--sh-text-muted)', fontSize: '14px' }}>No hay eventos programados</p>
            )}
          </div>
        </div>

        {/* Reportes */}
        <div className="sh-card">
          <h2 className="sh-card-title">
            <FileBarChart size={17} /> Reportes rápidos
          </h2>
          <div className="dir-reportes-lista">
            {REPORTES.map((r, i) => (
              <button className="dir-reporte-item" key={i} onClick={() => handleNav("reportes")}>
                <p className="dir-reporte-nombre">{r}</p>
                <span className="dir-reporte-ver">
                  Ver <ChevronRight size={14} style={{ verticalAlign: "middle" }} />
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Gestión de personal */}
        <div className="sh-card">
          <h2 className="sh-card-title">
            <Users size={17} /> Gestión de personal
          </h2>
          <div className="dir-personal-lista">
            {PERSONAL.map((p, i) => (
              <div className="dir-personal-item" key={i}>
                <p className="dir-personal-nombre">{p.nombre}</p>
                <span className="dir-personal-badge">{p.cantidad}</span>
              </div>
            ))}
          </div>
        </div>


      </>
    );
  };

  return (
    <div className="sh-layout">

      {/* Sidebar */}
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

        <nav className="sh-nav" ref={navRef} onScroll={handleNavScroll}>
          <p className="sh-nav-section-title">MENÚ PRINCIPAL</p>
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              className={`sh-nav-item ${activeNav === id ? 'sh-nav-item--active' : ''}`}
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
                    <button
                      key={r}
                      className={`sh-role-dropdown-item ${r === 'director' ? 'sh-role-dropdown-item--active' : ''}`}
                      onClick={() => {
                        onSwitchRole && onSwitchRole(r);
                        setRolDropdownOpen(false);
                      }}
                    >
                      {getRoleLabel(r)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button className="sh-logout" onClick={onLogout}>
            <LogOut size={13} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
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
            <button className="sh-desktop-topbar-notif" onClick={() => setActiveNav("chat")} aria-label="Abrir chat">
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
            E.E.S.T. N°1 — Dirección
          </div>
          <div className="sh-desktop-topbar-actions">
              <button className="sh-desktop-topbar-notif" onClick={() => setActiveNav("chat")} aria-label="Abrir chat">
                <MessageSquare size={20} />
              </button>
              <NotificationBell />
            <div className="sh-desktop-topbar-user">
              <div className="sh-user-avatar">{iniciales}</div>
              <span className="sh-user-name-desktop">{nombre}</span>
            </div>
          </div>
        </header>

        <div className="sh-content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
