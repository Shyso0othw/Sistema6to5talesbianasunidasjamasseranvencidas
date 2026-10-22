import { apiFetch } from '../../api/http.js'
/* 
   BLOQUE 1: IMPORTACIONES
   Se importan los hooks de React y la librería lucide-react para los iconos.
   También se incluyen los archivos de estilos compartidos y específicos.
*/
import { useState, useEffect, useRef } from "react";
import { Home, BookOpen, ClipboardCheck, Calendar, CalendarDays, Mail, MessageSquare, User, LogOut, Clock, MapPin, AlertTriangle, GraduationCap, Building2, Star, Menu, ArrowRight, ArrowLeft, Clock3, ChevronDown } from "lucide-react";
import "../../shared.css";
import './Dashboard.css';
import { fetchEvents } from "../../api/events";
import ChatScreen from '../../components/specific/ChatScreen';
import StudentSearch from '../../components/common/StudentSearch';
import EstudianteNotas from './EstudianteNotas';
import EstudianteHorarios from './EstudianteHorarios';
import EstudiantePerfil from './EstudiantePerfil';
import EstudianteAsistencia from './EstudianteAsistencia';
import EstudiantePrestamos from './EstudiantePrestamos';
import { getRoleLabel } from '../../utils/roleLabels';
import NotificationBell from '../../components/NotificationBell'

import { eventBus } from '../../stores/eventBus'
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
  { id: "inicio",      icon: Home,          label: "Inicio"           },
  { id: "notas",       icon: BookOpen,       label: "Notas"        },
  { id: "asistencia",  icon: ClipboardCheck, label: "Asistencia"   },
  { id: "horario",     icon: Clock,       label: "Horario"      },
  { id: "eventos",     icon: CalendarDays,   label: "Calendario"   },
  { id: "prestamos",   icon: BookOpen,       label: "Préstamos"   },
  { id: "comunicados", icon: Mail,            label: "Comunicados"  },
  { id: "chat",        icon: MessageSquare,  label: "Chat"         },
  { id: "perfil",      icon: User,           label: "Perfil"       },
];

/* 
   BLOQUE 3: FUNCIONES DE UTILIDAD (HELPERS)
   Hooks y funciones para manejar el reloj y formatear fechas/horas de forma legible.
*/
function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function formatTime(date) {
  return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(date) {
  const str = date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function SectionPlaceholder({ title }) {
  return <StudentSearch title={title} />;
}

/* 
   BLOQUE 5: COMPONENTE PRINCIPAL (Dashboard Estudiante)
   Contiene la lógica de navegación y renderiza los paneles de información.
*/
export default function Dashboard({ onLogout, username, onOpenCalendar, initialSection, onClearPendingSection, roles, onSwitchRole, onOpenComunicados }) {
  const [activeNav, setActiveNav] = useState(initialSection || "inicio");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedComunicado, setExpandedComunicado] = useState(null);
  const [asistLoaded, setAsistLoaded] = useState(false);
  const [rolDropdownOpen, setRolDropdownOpen] = useState(false);
  const [events, setEvents] = useState([])
  const [perfil, setPerfil] = useState(null)
  const [clasesHoy, setClasesHoy] = useState([])
  const [asistenciasCriticas, setAsistenciasCriticas] = useState([])
  const [comunicadosList, setComunicadosList] = useState([])
  const navRef = useRef(null);
  const time = useClock();

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

  // Load student profile & daily data
  useEffect(() => {
    const t = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!t) return

    // 1. Fetch profile
    apiFetch(`${API_BASE}/perfil/`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : null)
      .then((pData) => {
        if (!pData) return
        setPerfil(pData)
        const alumno = pData.perfil_especifico
        if (!alumno) return

        // 2. Fetch courses to find matching cursoId
        apiFetch(`${API_BASE}/cursos/`, { headers: { Authorization: `Bearer ${t}` } })
          .then(r => r.ok ? r.json() : [])
          .then((cursosData) => {
            const match = (cursosData || []).find(c => c.año === alumno.año && c.division === alumno.division)
            if (match) {
              // 3. Fetch horarios for this curso
              apiFetch(`${API_BASE}/horarios/?curso=${match.id}`, { headers: { Authorization: `Bearer ${t}` } })
                .then(r => r.ok ? r.json() : [])
                .then((horarios) => {
                  let d = new Date().getDay() - 1 // 0: Lunes, 1: Martes...
                  if (d < 0 || d > 4) d = 0 // Fallback to Lunes if weekend
                  const hoy = (horarios || []).filter(h => h.dia === d)

                  const mapped = hoy.map((h, i) => {
                    const franjas = (alumno.año >= 4) ? FRANJAS_CS : FRANJAS_CB
                    const times = franjas[h.franja] || { inicio: '07:30', fin: '08:50' }
                    const colors = ["#6366f1", "#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6"]
                    return {
                      id: h.id || i,
                      time: times.inicio,
                      end: times.fin,
                      subject: h.materia_nombre,
                      teacher: h.profesor_nombre || 'Sin docente asignado',
                      room: h.aula || 'Sin aula',
                      color: colors[i % colors.length]
                    }
                  })
                  setClasesHoy(mapped)
                })
            }
          })

        // 4. Fetch asistencias
        apiFetch(`${API_BASE}/asistencias/?estudiante=${alumno.id}`, { headers: { Authorization: `Bearer ${t}` } })
          .then(r => r.ok ? r.json() : [])
          .then((asisData) => {
            const mapped = (asisData || [])
              .map(a => {
                const total = a.total || 0
                const pres = a.presentes || 0
                const pct = total > 0 ? Math.round((pres / total) * 100) : 100
                return {
                  subject: a.materia_nombre,
                  pct,
                  colorClass: pct < 75 ? 'warn' : pct < 85 ? 'med' : 'ok'
                }
              })
              .sort((a, b) => a.pct - b.pct)
              .slice(0, 3)
            setAsistenciasCriticas(mapped)
          })
      })
      .catch((err) => console.error('Error loading student profile:', err))

    // 5. Fetch announcements
    apiFetch(`${API_BASE}/comunicados/`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : [])
      .then((comData) => {
        const mapped = (comData || []).map(c => {
          const d = c.fecha ? new Date(c.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '—'
          return {
            tipo: c.tipo_destinatario === 'Todos' ? 'admin' : 'preceptor',
            label: c.tipo_destinatario === 'Todos' ? 'Administrador' : 'Preceptor',
            date: d,
            title: c.titulo,
            body: c.cuerpo
          }
        })
        setComunicadosList(mapped.slice(0, 3))
      })
      .catch((err) => console.error('Error loading student announcements:', err))
  }, [])

  // Navigation direct handling
  useEffect(() => {
    if (initialSection) {
      onClearPendingSection && onClearPendingSection();
    }
  }, [initialSection, onClearPendingSection]);

  useEffect(() => {
    const t = setTimeout(() => setAsistLoaded(true), 200);
    return () => clearTimeout(t);
  }, []);

  // Preserve scroll
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

  const nombre = username || "Estudiante";

  const handleNav = (id) => {
    if (id === "eventos") {
      onOpenCalendar && onOpenCalendar(activeNav);
      setIsSidebarOpen(false);
      return;
    }
    if (id === "comunicados") {
      onOpenComunicados && onOpenComunicados();
      setIsSidebarOpen(false);
      return;
    }
    setActiveNav(id);
    setIsSidebarOpen(false);
  };

  const renderContent = () => {
    if (activeNav === 'chat') {
      return <ChatScreen userRole="estudiante" />;
    }

    if (activeNav === 'notas') {
      return <EstudianteNotas nombre={nombre} />;
    }

    if (activeNav === 'horario') {
      return <EstudianteHorarios nombre={nombre} />;
    }

    if (activeNav === 'perfil') {
      const a = perfil?.perfil_especifico
      return <EstudiantePerfil nombre={nombre} curso={a?.año && a?.division ? `${a.año}° Año ${a.division}` : ''} />;
    }

    if (activeNav === 'asistencia') {
      return <EstudianteAsistencia nombre={nombre} />;
    }

    if (activeNav === 'prestamos') {
      return <EstudiantePrestamos userRole="estudiante" />;
    }

    if (activeNav !== "inicio") {
      const activeItem = NAV_ITEMS.find(i => i.id === activeNav);
      return <SectionPlaceholder title={activeItem?.label || activeNav} />;
    }

    return (
      <>
        {/* Encabezado Hero */}
        <div className="sh-hero">
          <div className="sh-hero-left">
            <p className="sh-hero-welcome">Bienvenido</p>
            <h1 className="sh-hero-name">{nombre}</h1>
            <p className="sh-hero-date">
              <Calendar size={13} /> {formatDate(time)}
            </p>
            {perfil?.perfil_especifico && (
              <div className="sh-hero-tags">
                <span className="sh-hero-tag">
                  <GraduationCap size={13} /> {perfil.perfil_especifico.año}° Año {perfil.perfil_especifico.division}
                </span>
                {perfil.perfil_especifico.grupo && (
                  <span className="sh-hero-tag">
                    <Building2 size={13} /> Grupo de Taller: {perfil.perfil_especifico.grupo}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="sh-hero-right">
            <div className="sh-hero-clock">
              <Clock3 size={16} /> {formatTime(time)}
            </div>
          </div>
        </div>

        {/* Rejilla de Acciones Rápidas */}
        <div className="db-acciones-grid">
          <button className="sh-btn-action tooltip" data-tooltip="Ver tus calificaciones del trimestre" onClick={() => handleNav("notas")}>
            <div className="sh-btn-action-icon" style={{ background: '#eef2ff', color: '#4a63e0' }}><BookOpen size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Mis Notas</span>
              <span className="sh-btn-action-desc">Calificaciones del trimestre</span>
            </div>
          </button>
          <button className="sh-btn-action tooltip" data-tooltip="Ver tu reporte de asistencia" onClick={() => handleNav("asistencia")}>
            <div className="sh-btn-action-icon" style={{ background: '#fff7ed', color: '#d97706' }}><ClipboardCheck size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Asistencia</span>
              <span className="sh-btn-action-desc">Registro diario y justificaciones</span>
            </div>
          </button>
          <button className="sh-btn-action tooltip" data-tooltip="Consultar tus horarios de clase" onClick={() => handleNav("horario")}>
            <div className="sh-btn-action-icon" style={{ background: '#ecfdf5', color: '#059669' }}><Clock size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Horarios</span>
              <span className="sh-btn-action-desc">Distribución de materias por día</span>
            </div>
          </button>
        </div>

        {/* Rejilla de Información */}
        <div className="db-grid">

          {/* Listado de Clases del Día */}
          <div className="sh-card">
            <h2 className="sh-card-title">
              <BookOpen size={17} /> Clases de hoy
            </h2>
            <div className="db-class-list">
              {clasesHoy.length === 0 ? (
                <p className="sh-empty-text">No hay clases registradas para hoy.</p>
              ) : (
                clasesHoy.map((c, i) => (
                  <div className="db-class-item" key={c.id || i}>
                    <div className="db-class-time">
                      <span className="db-time-start">{c.time}</span>
                      <span className="db-time-end">{c.end}</span>
                    </div>
                    <div className="db-class-dot" style={{ background: c.color }} />
                    <div className="db-class-info">
                      <span className="db-class-name">{c.subject}</span>
                      <span className="db-class-meta">{c.teacher} · {c.room}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Próximos Eventos */}
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
                    <div className="sh-comunicado-header">
                      <span className="sh-evento-fecha">
                        <Star size={11} /> {new Date(e.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        {e.hora_inicio && ` · ${e.hora_inicio}`}
                      </span>
                    </div>
                    <p className="sh-evento-nombre">{e.titulo}</p>
                    {e.lugar && <p className="sh-evento-lugar"><MapPin size={10} /> {e.lugar}</p>}
                  </div>
                ))
              )}
            </div>
            <button className="sh-ver-todos tooltip" data-tooltip="Ver el calendario completo de eventos" onClick={() => onOpenCalendar && onOpenCalendar(activeNav)}>
              Ver calendario completo <ArrowRight size={13} />
            </button>
          </div>

          {/* Comunicados */}
          <div className="sh-card db-comunicados-card">
            <h2 className="sh-card-title">
              <MessageSquare size={17} /> Comunicados
            </h2>
            <div className="db-comunicados-list">
              {comunicadosList.length === 0 ? (
                <p className="sh-empty-text">No hay comunicados recientes.</p>
              ) : (
                comunicadosList.map((c, i) => (
                  <div
                    key={i}
                    className={`sh-comunicado-item sh-comunicado-item--${c.tipo} tooltip`}
                    data-tooltip="Haz clic para expandir/ocultar el comunicado"
                    onClick={() => setExpandedComunicado(expandedComunicado === i ? null : i)}
                  >
                    <div className="sh-comunicado-header">
                      <span className={`sh-comunicado-tag sh-comunicado-tag--${c.tipo}`}>
                        <span className="sh-unread-dot" />
                        {c.label}
                      </span>
                      <span className="sh-comunicado-date">{c.date}</span>
                    </div>
                    <p className="sh-comunicado-title">{c.title}</p>
                    <p className={`sh-comunicado-body ${expandedComunicado === i ? "sh-comunicado-body--expanded" : ""}`}>
                      {c.body}
                    </p>
                  </div>
                ))
              )}
            </div>
            <button className="sh-ver-todos tooltip" data-tooltip="Ver todos los comunicados" onClick={() => handleNav('comunicados')}>
              Ver todos <ArrowRight size={13} />
            </button>
          </div>

          {/* Alertas de Asistencia */}
          <div className="sh-card">
            <h2 className="sh-card-title">
              <AlertTriangle size={17} /> Materias con asistencia crítica
            </h2>
            <div className="db-asist-list">
              {asistenciasCriticas.length === 0 ? (
                <p className="sh-empty-text" style={{ padding: '10px 0' }}>Tu asistencia está al día en todas las materias.</p>
              ) : (
                asistenciasCriticas.map((a, i) => (
                  <div className="db-asist-item" key={i}>
                    <div className="db-asist-header">
                      <span className="db-asist-subject">{a.subject}</span>
                      <span className={`db-asist-pct db-asist-pct--${a.colorClass}`}>{a.pct}%</span>
                    </div>
                    <div className="db-progress-bg">
                      <div
                        className={`db-progress-fill db-progress-fill--${a.colorClass}`}
                        style={{ width: asistLoaded ? `${a.pct}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
            <button className="sh-ver-todos tooltip" data-tooltip="Ver el detalle completo de tus asistencias" onClick={() => setActiveNav('asistencia')}>
              Ver todas mis asistencias <ArrowRight size={13} />
            </button>
          </div>

        </div>
      </>
    );
  };

  return (
    <div className="sh-layout">
      {/* Menu Lateral (Sidebar) */}
      <aside className={`sh-sidebar ${isSidebarOpen ? "sh-sidebar--open" : ""}`}>
        <div className="sh-sidebar-header">
          <div className="sh-sidebar-logo">
            <img src="https://eestn1.com.ar/src/assets/img/logo.webp" alt="Logo EEST N°1" />
          </div>
          <div className="sh-sidebar-school">
            <span className="sh-school-name">E.E.S.T. N°1</span>
            <span className="sh-school-sub">Escuela de Educación Secundaria Técnica N°1 Manuel Belgrano</span>
          </div>
          <button className="sh-hamburger" style={{ marginLeft: "auto", color: "rgba(255,255,255,0.5)" }} onClick={() => setIsSidebarOpen(false)}>
            <ArrowLeft size={20} />
          </button>
        </div>

        <nav className="sh-nav" ref={navRef} onScroll={handleNavScroll}>
          <p className="sh-nav-section-title">MENÚ PRINCIPAL</p>
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              className={`sh-nav-item ${activeNav === id ? "sh-nav-item--active" : ""}`}
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
                    <button key={r} className={`sh-role-dropdown-item ${r === 'estudiante' ? 'sh-role-dropdown-item--active' : ''}`}
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

      <main className="sh-main">
        {/* Topbar movil */}
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
            E.E.S.T. N°1 — Estudiante
          </div>
          <div className="sh-desktop-topbar-actions">
            <button className="sh-desktop-topbar-notif" onClick={() => setActiveNav("chat")} aria-label="Abrir chat">
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
