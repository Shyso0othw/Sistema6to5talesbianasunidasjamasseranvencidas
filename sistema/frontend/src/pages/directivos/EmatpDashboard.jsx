import { getFranjas } from '../../utils/horarioUtils'
import { apiFetch } from '../../api/http.js'
import { useState, useEffect, useRef } from "react";
import { Home, Clock, BookOpen, User, Mail, LogOut, Calendar, CalendarDays, GraduationCap, Megaphone, Menu, ArrowLeft, FolderOpen, Clock3, ChevronDown, Pin, Star, ChevronRight, MessageSquare } from "lucide-react";
import "../../shared.css";
import './EmatpDashboard.css';
import ChatScreen from '../../components/specific/ChatScreen';
import StudentSearch from '../../components/common/StudentSearch';
import { fetchEvents } from "../../api/events";

import { eventBus } from '../../stores/eventBus'
import NotificationBell from '../../components/NotificationBell'
import { CalendarioBase } from '../../components/specific/CalendarioVisualizer';
import { getRoleLabel } from '../../utils/roleLabels';
import PerfilGenerico from '../auth/PerfilGenerico';
import EmatpCursos from './EmatpCursos';
import EmatpHorarios from './EmatpHorarios';
import { API_BASE } from '../../config'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` })

const __sidebarPos = {};

// ── Datos de ejemplo ───────────────────────────────────────────────────────
const FRANJAS_CB = getFranjas('basico')
const FRANJAS_CS = getFranjas('superior')

const USUARIO = { nombre: "Usuario", rol: "EMATP / AUX / BIBLIO" };





const SectionPlaceholder = ({ title, icon: Icon }) => (
  <StudentSearch title={title} icon={Icon} />
);

export default function EmatpDashboard({
  onLogout,
  username,
  initialSection,
  onClearPendingSection,
  roles,
  onSwitchRole,
  onOpenComunicados
}) {
  const [navActiva, setNavActiva] = useState(initialSection || "inicio");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hora, setHora] = useState("");
  const [rolDropdownOpen, setRolDropdownOpen] = useState(false);
  const [events, setEvents] = useState([])
  const [horariosHoy, setHorariosHoy] = useState([])
  const [comunicadosList, setComunicadosList] = useState([])
  const [cursosAssigned, setCursosAssigned] = useState([])
  const navRef = useRef(null);

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

  useEffect(() => {
    Promise.all([
      apiFetch(`${API_BASE}/cursos/`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
      apiFetch(`${API_BASE}/alumnos/`, { headers: authHeaders() }).then(r => r.ok ? r.json() : []),
    ])
      .then(([cursosData, alumnosData]) => {
        const mapped = (cursosData || []).map(item => ({ id: item.id, curso: `${item.año}°${item.division}`, alumnos: (alumnosData || []).filter(a => a.año === item.año && a.division === item.division).length }))
        setCursosAssigned(mapped)
      })
      .catch(() => {})

    // Fetch schedules
    apiFetch(`${API_BASE}/horarios/`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        let d = new Date().getDay() - 1 // 0: Lunes...
        if (d < 0 || d > 4) d = 0
        const hoy = (data || []).filter(h => h.dia === d)
        
        const mapped = hoy.map((h, i) => {
          const matchedAnio = h.curso_nombre?.match(/^(\d+)/)
          const anio = matchedAnio ? parseInt(matchedAnio[1], 10) : 1
          const franjas = (anio >= 4) ? FRANJAS_CS : FRANJAS_CB
          const times = franjas[h.franja] || { inicio: '07:30', fin: '08:50' }
          return {
            id: h.id || i,
            hora: times.inicio,
            materia: h.materia_nombre,
            curso: h.curso_nombre || 'Curso',
            aula: h.aula || 'Sin aula'
          }
        })
        setHorariosHoy(mapped)
      })
      .catch(() => {})

    // Fetch comunicados
    apiFetch(`${API_BASE}/comunicados/`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setComunicadosList(data.map(c => ({
          id: c.id,
          tipo: c.tipo_destinatario === 'Todos' ? 'INSTITUCIONAL' : 'COMUNICADO',
          titulo: c.titulo,
          cuerpo: c.cuerpo,
          fecha: c.fecha ? new Date(c.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '—'
        })))
      })
      .catch(() => {})
  }, [])

  const nombreMostrar = username || USUARIO.nombre;

  // Navegación directa sin pasar por Inicio
  useEffect(() => {
    if (initialSection) {
      onClearPendingSection && onClearPendingSection();
    }
  }, [initialSection, onClearPendingSection]);

  useEffect(() => {
    const tick = () => setHora(new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
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

  const fechaHoy = new Date().toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).replace(/^\w/, c => c.toUpperCase());

  const NAV_ITEMS = [
    { id: 'inicio', icon: Home, label: 'Inicio' },
    { id: 'comunicados', icon: Mail, label: 'Comunicados' },
    { id: 'calendario', icon: CalendarDays, label: 'Calendario' },
    { id: 'horarios', icon: Clock, label: 'Horarios' },
    { id: 'cursos', icon: FolderOpen, label: 'Cursos' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'perfil', icon: User, label: 'Perfil' },
  ];

  const navSections = [
    { titulo: "MENÚ PRINCIPAL", items: NAV_ITEMS },
  ];

  const handleNav = (id) => {
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
      return <ChatScreen userRole="ematp" />;
    }

    if (navActiva === "calendario") {
      return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'var(--sh-bg)' }}>
          <CalendarioBase
            onLogout={onLogout}
            username={username}
            navSections={navSections}
            activeNav="calendario"
            onNav={handleNav}
            rolLabel="EMATP"
            canAddEvent={false}
            events={events}
            roles={roles}
            onSwitchRole={onSwitchRole}
          />
        </div>
      );
    }

    if (navActiva === 'perfil') {
      return <PerfilGenerico userRole="ematp" />;
    }

    if (navActiva === 'horarios') return <EmatpHorarios />;
    if (navActiva === 'cursos') return <EmatpCursos />;

    if (navActiva !== "inicio") {
      const activeItem = NAV_ITEMS.find(i => i.id === navActiva);
      return <SectionPlaceholder title={activeItem?.label || navActiva} icon={activeItem?.icon} />
    }

    return (
      <>
        {/* Hero */}
        <div className="sh-hero">
          <div className="sh-hero-left">
            <p className="sh-hero-welcome">Bienvenido</p>
            <h1 className="sh-hero-name">{nombreMostrar}</h1>
            <p className="sh-hero-date">
              <Calendar size={13} /> {fechaHoy}
            </p>
            <div className="sh-hero-tags">
              <span className="sh-hero-tag">{USUARIO.rol}</span>
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
              <span className="sh-btn-action-desc">Ver comunicados</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => setNavActiva('horarios')}>
            <div className="sh-btn-action-icon" style={{ background: '#eef2ff', color: '#4a63e0' }}><Clock size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Horarios</span>
              <span className="sh-btn-action-desc">Ver horarios</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => setNavActiva('cursos')}>
            <div className="sh-btn-action-icon" style={{ background: '#ecfdf5', color: '#059669' }}><BookOpen size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Cursos</span>
              <span className="sh-btn-action-desc">Ver cursos</span>
            </div>
          </button>
        </div>

        {/* Grid principal */}
        <div className="em-grid">

          {/* Columna izquierda */}
          <div className="em-col">

            {/* Horarios del día */}
            <div className="sh-card" style={{ marginBottom: 0 }}>
              <h2 className="sh-card-title">
                <Clock size={17} /> Horarios del día
              </h2>
              <div className="em-horarios-lista">
                {horariosHoy.length === 0 ? (
                  <p className="sh-empty-text">No hay clases registradas hoy.</p>
                ) : (
                  horariosHoy.map((h) => (
                    <div key={h.id} className="em-horario-item">
                      <span className="em-horario-hora">{h.hora}</span>
                      <span className="em-horario-materia">{h.materia}</span>
                      <span className="em-horario-dot">•</span>
                      <span className="em-horario-curso">{h.curso}</span>
                      <span className="em-horario-aula">{h.aula}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Eventos próximos */}
            <div className="sh-card" style={{ marginBottom: 0 }}>
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
              <button className="sh-ver-todos" onClick={() => setNavActiva("calendario")}>
                Ver calendario completo <ChevronRight size={13} />
              </button>
            </div>

            {/* Comunicados recibidos */}
            <div className="sh-card" style={{ marginBottom: 0 }}>
              <h2 className="sh-card-title">
                <Megaphone size={17} /> Comunicados recibidos
              </h2>
              <div className="em-comunicados-lista">
                {comunicadosList.length === 0 ? (
                  <p className="sh-empty-text">No hay comunicados recientes.</p>
                ) : (
                  comunicadosList.map((c) => (
                    <div key={c.id} className="em-comunicado-item">
                      <div className="em-comunicado-header">
                        <span className={`em-comunicado-badge em-comunicado-badge--${c.tipo.toLowerCase().replace(/[^a-z]/g, '')}`}>
                          {c.tipo}
                        </span>
                        <span className="em-comunicado-fecha">{c.fecha}</span>
                      </div>
                      <p className="em-comunicado-titulo">{c.titulo}</p>
                      <p className="em-comunicado-cuerpo">{c.cuerpo}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Columna derecha */}
          <div className="em-col">

            {/* Acceso rápido */}
            <div className="sh-card" style={{ marginBottom: 0 }}>
              <h2 className="sh-card-title">Acceso rápido</h2>
              <div className="em-acceso-lista">
                <button 
                  className="em-acceso-btn em-acceso-btn--primary"
                  onClick={() => setNavActiva("horarios")}
                >
                  <Calendar size={17} />
                  Ver horarios completos
                </button>
                <button 
                  className="em-acceso-btn em-acceso-btn--outline"
                  onClick={() => handleNav("comunicados")}
                >
                  <Mail size={17} />
                  Ver comunicados
                </button>
              </div>
            </div>

            {/* Cursos asignados */}
            <div className="sh-card" style={{ marginBottom: 0 }}>
              <h2 className="sh-card-title">
                <GraduationCap size={17} /> Cursos asignados
              </h2>
              <div className="em-cursos-grid">
                {cursosAssigned.length === 0 ? (
                  <p className="sh-empty-text">No hay cursos asignados.</p>
                ) : (
                  cursosAssigned.map((c) => (
                    <div key={c.id} className="em-curso-card">
                      <p className="em-curso-nombre">{c.curso}</p>
                      <p className="em-curso-alumnos">{c.alumnos || 0} alumnos</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </>
    )
  }

  return (
    <div className="sh-layout">

      {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
      <aside className={`sh-sidebar ${isSidebarOpen ? "sh-sidebar--open" : ""}`}>
        <div className="sh-sidebar-header">
          <div className="sh-sidebar-logo">
            <img src="https://eestn1.com.ar/src/assets/img/logo.webp" alt="Logo E.E.S.T. Nº1" />
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
              className={`sh-nav-item ${navActiva === id ? "sh-nav-item--active" : ""}`}
              onClick={() => handleNav(id)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sh-sidebar-footer">
          <div className="sh-footer-user">
            <div className="sh-user-avatar">{username[0].toUpperCase()}</div>
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
                    <button key={r} className={`sh-role-dropdown-item ${r === 'ematp' ? 'sh-role-dropdown-item--active' : ''}`}
                      onClick={() => { onSwitchRole && onSwitchRole(r); setRolDropdownOpen(false); }}>
                      {getRoleLabel(r)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button className="sh-logout" onClick={onLogout}>
            <LogOut size={13} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────── */}
      <main className="sh-main">
        {/* Mobile Topbar */}
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
                        <div className="sh-user-avatar">{nombreMostrar[0].toUpperCase()}</div>
                        <span className="sh-mobile-username">{nombreMostrar}</span>
                      </div>
                      </div>
        </div>

        {/* Desktop Topbar */}
        <header className="sh-desktop-topbar">
          <div className="sh-desktop-topbar-title">
            <img src="https://eestn1.com.ar/src/assets/img/logo.webp" className="sh-desktop-topbar-logo" alt="logo" />
            E.E.S.T. N°1 — EMATP
          </div>
          <div className="sh-desktop-topbar-actions">
              <button className="sh-desktop-topbar-notif" onClick={() => setNavActiva("chat")} aria-label="Abrir chat">
                <MessageSquare size={20} />
              </button>
            <NotificationBell />
            <div className="sh-desktop-topbar-user">
              <div className="sh-user-avatar">{nombreMostrar.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}</div>
              <span className="sh-user-name-desktop">{nombreMostrar}</span>
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
