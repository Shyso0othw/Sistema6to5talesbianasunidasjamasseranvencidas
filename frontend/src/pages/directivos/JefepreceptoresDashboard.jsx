import { apiFetch } from '../../api/http'
import { useState, useEffect, useRef } from 'react'
import { Home, Calendar, FolderOpen, MessageSquare, Mail, User, LogOut, Menu, Clock, Clock3, ArrowRight, ArrowLeft, Users, ClipboardList, AlertTriangle, FileText, FileBarChart, CalendarDays, Shield, PhoneCall, BookOpen, ChevronDown, Pin, ChevronRight } from 'lucide-react';
import ChatScreen from '../../components/specific/ChatScreen';
import StudentSearch from '../../components/common/StudentSearch';
import { fetchEvents } from '../../api/events'
import { fetchDashboardStats } from '../../api/chat'
import NotificationBell from '../../components/NotificationBell'

import { eventBus } from '../../stores/eventBus'
import '../../shared.css'
import './JefepreceptoresDashboard.css'
import { getRoleLabel } from '../../utils/roleLabels'
import PerfilGenerico from '../auth/PerfilGenerico';
import JefePrecepAsistencia from './JefePrecepAsistencia';
import JefePrecepPreceptores from './JefePrecepPreceptores';
import JefePrecepCursos from './JefePrecepCursos';
import JefePrecepReportes from './JefePrecepReportes';
import JefePrecepCitaciones from './JefePrecepCitaciones';
import JefePrecepHorarios from './JefePrecepHorarios';
import CalendarioDireccion from '../shared/CalendarioDireccion';

const __sidebarPos = {};

const NAV_ITEMS = [
  { id: 'inicio',       icon: Home,          label: 'Inicio' },
  { id: 'comunicados',  icon: Mail,          label: 'Comunicados' },
  { id: 'asistencia',   icon: ClipboardList, label: 'Asistencia'      },
  { id: 'preceptores',  icon: Users,         label: 'Preceptores'     },
  { id: 'cursos',       icon: FolderOpen,    label: 'Cursos'          },
  { id: 'reportes',     icon: FileBarChart,      label: 'Reportes'        },
  { id: 'citaciones',   icon: PhoneCall,     label: 'Citaciones'      },
  { id: 'horarios',     icon: Clock,      label: 'Horarios'        },
  { id: 'calendario',   icon: CalendarDays,  label: 'Calendario'      },
  { id: 'chat',         icon: MessageSquare, label: 'Chat'            },
  { id: 'perfil',       icon: User,          label: 'Perfil'          },
]

const ACCESOS = [
  {
    id: 'comunicados',
    icon: Mail,
    titulo: 'Comunicados',
    desc: 'Enviar y ver avisos institucionales',
    badge: 'Acceso completo',
    badgeType: 'full',
    readonly: false,
  },
  {
    id: 'asistencia',
    icon: ClipboardList,
    titulo: 'Control de asistencia',
    desc: 'Registro y seguimiento general de asistencia',
    badge: 'Acceso completo',
    badgeType: 'full',
    readonly: false,
  },
  {
    id: 'preceptores',
    icon: Users,
    titulo: 'Gestión de preceptores',
    desc: 'Organizar turnos, guardias y supervisión',
    badge: 'Acceso completo',
    badgeType: 'full',
    readonly: false,
  },
  {
    id: 'cursos',
    icon: FolderOpen,
    titulo: 'Cursos',
    desc: 'Ver información de todos los cursos activos',
    badge: 'Acceso completo',
    badgeType: 'full',
    readonly: false,
  },
  {
    id: 'reportes',
    icon: FileText,
    titulo: 'Reportes e informes',
    desc: 'Redactar y firmar informes para dirección',
    badge: 'Acceso completo',
    badgeType: 'full',
    readonly: false,
  },
  {
    id: 'citaciones',
    icon: PhoneCall,
    titulo: 'Citaciones a padres/tutores',
    desc: 'Coordinar citaciones ante inasistencias',
    badge: 'Acceso completo',
    badgeType: 'full',
    readonly: false,
  },
  {
    id: 'horarios',
    icon: Calendar,
    titulo: 'Horarios',
    desc: 'Consulta de horarios institucionales',
    badge: 'Solo consulta',
    badgeType: 'readonly',
    readonly: true,
  },
  {
    id: 'calificaciones',
    icon: BookOpen,
    titulo: 'Calificaciones',
    desc: 'Sin acceso — función exclusiva del docente',
    badge: 'Sin acceso',
    badgeType: 'readonly',
    readonly: true,
  },
]

const STATS_TEMPLATE = [
  { label: 'Preceptores activos',  key: 'total_preceptores', sub: 'En actividad',       color: 'green' },
  { label: 'Cursos supervisados',  key: 'total_cursos',       sub: 'Total institución',  color: 'blue'  },
  { label: 'Alertas inasistencia', key: 'alertas_count',      sub: 'Requieren seguimiento', color: 'alert' },
]



const SectionPlaceholder = ({ title, icon: Icon }) => (
  <StudentSearch title={title} icon={Icon} />
);

export default function JefePreceptoresDashboard({ onLogout, username, onOpenCalendar, initialSection, onClearPendingSection, roles, onSwitchRole, onOpenComunicados }) {
  const nombre = username || 'Usuario'
  const [navActiva, setNavActiva] = useState(initialSection || 'inicio')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [hora, setHora] = useState('')
  const [rolDropdownOpen, setRolDropdownOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [statsData, setStatsData] = useState({})
  const [records,setRecords]=useState({alerts:[],prefects:[]});
  const [recordsError,setRecordsError]=useState('');
  const ALERTAS=records.alerts.map(a=>({nombre:a.estudiante_nombre,curso:a.materia_nombre,inasistencias:a.ausentes,tipo:'red'}));
  const PRECEPTORES=records.prefects.map(p=>({nombre:`${p.apellido}, ${p.nombre}`,turno:p.turno || 'Sin registrar'}));
  useEffect(()=>{
    let active=true;
    Promise.all(['/api/asistencias/','/api/preceptores/'].map(async url=>{
      const response=await apiFetch(url);if(!response.ok)throw new Error('No se pudieron cargar los registros de preceptoría.');return response.json();
    })).then(([attendance,prefects])=>{if(active)setRecords({alerts:attendance.filter(a=>a.ausentes>10),prefects});}).catch(err=>{if(active)setRecordsError(err.message);});
    return ()=>{active=false;};
  },[]);
  const navRef = useRef(null);

  useEffect(() => {
    const t = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!t) return;
    fetchDashboardStats(t)
      .then(data => setStatsData(data))
      .catch(err => console.error('Error fetching stats:', err));
  }, []);

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

  const handleAcceso = (id) => {
    if (id === 'calificaciones') return
    if (id === 'comunicados') {
      handleNav(id)
      return
    }
    setNavActiva(id)
  }

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
      return <ChatScreen userRole="jefe_preceptores" />;
    }

    if (navActiva === 'perfil') {
      return <PerfilGenerico userRole="jefe_preceptores" />;
    }

    if (navActiva === 'asistencia') return <JefePrecepAsistencia />;
    if (navActiva === 'preceptores') return <JefePrecepPreceptores />;
    if (navActiva === 'cursos') return <JefePrecepCursos />;
    if (navActiva === 'reportes') return <JefePrecepReportes />;
    if (navActiva === 'citaciones') return <JefePrecepCitaciones />;
    if (navActiva === 'horarios') return <JefePrecepHorarios />;
    if (navActiva === 'calendario') return <CalendarioDireccion />;

    if (navActiva !== 'inicio') {
      const activeItem = NAV_ITEMS.find(i => i.id === navActiva)
      return <SectionPlaceholder title={activeItem?.label || navActiva} icon={activeItem?.icon} />
    }

    return (
      <>
        {/* Hero */}
        <div className="sh-hero">
          <div className="sh-hero-left">
            <p className="sh-hero-welcome">Gestión Institucional</p>
            <h1 className="sh-hero-name">{nombre}</h1>
            <p className="sh-hero-date"><Calendar size={13} /> {fechaHoy}</p>
            <div className="sh-hero-tags">
              <span className="sh-hero-tag">Jefe de Preceptores</span>
              <span className="sh-hero-tag">Turno Mañana/Tarde</span>
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
          <button className="sh-btn-action" onClick={() => setNavActiva('asistencia')}>
            <div className="sh-btn-action-icon" style={{ background: '#eef2ff', color: '#4a63e0' }}><ClipboardList size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Asistencia</span>
              <span className="sh-btn-action-desc">Control de asistencia</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => setNavActiva('preceptores')}>
            <div className="sh-btn-action-icon" style={{ background: '#ecfdf5', color: '#059669' }}><Users size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Preceptores</span>
              <span className="sh-btn-action-desc">Gestión de personal</span>
            </div>
          </button>
        </div>

        {/* Stats rápidas */}
        <div className="jp-stats-grid">
          {STATS_TEMPLATE.map((s, i) => (
            <div className="sh-card jp-stat-card" key={i}>
              <span className="jp-stat-label">{s.label}</span>
              <span className={`jp-stat-value ${
                s.color === 'alert' ? 'jp-stat-value--alert' :
                s.color === 'green' ? 'jp-stat-value--green' : ''
              }`}>{statsData[s.key] ?? '...'}</span>
              <span className="jp-stat-sub">{s.sub}</span>
            </div>
          ))}
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
                   <div className="sh-evento-content">
                     <span className="sh-evento-fecha">
                       <Calendar size={11} /> {new Date(e.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
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

        <div className="jp-grid">

          {/* Accesos — ancho completo */}
          <div className="sh-card jp-accesos-card" style={{ gridColumn: '1 / -1' }}>
            <h2 className="sh-card-title">
              <Shield size={17} /> Panel de Supervisión y Coordinación
            </h2>
            <p className="jp-panel-sub">Gestión integral de preceptores, asistencia y disciplina</p>
            <div className="jp-accesos-list">
              {ACCESOS.map((acc) => (
                <button
                  key={acc.id}
                  className={`jp-acceso-btn ${acc.readonly ? 'jp-acceso-btn--readonly' : ''}`}
                  onClick={() => handleAcceso(acc.id)}
                  disabled={acc.id === 'calificaciones'}
                >
                  <div className="jp-acceso-icon">
                    <acc.icon size={20} />
                  </div>
                  <div className="jp-acceso-info">
                    <span className="jp-acceso-titulo">{acc.titulo}</span>
                    <span className="jp-acceso-desc">{acc.desc}</span>
                  </div>
                  <span className={`jp-acceso-badge jp-acceso-badge--${acc.badgeType}`}>
                    {acc.badge}
                  </span>
                  {acc.id !== 'calificaciones' && (
                    <ArrowRight size={14} className="jp-acceso-arrow" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Alertas de inasistencia */}
          <div className="sh-card">
            <h2 className="sh-card-title">
              <AlertTriangle size={17} color="var(--danger)" /> Alertas de inasistencia
            </h2>
            <p className="sh-card-subtitle">Casos críticos que requieren seguimiento</p>
            {recordsError && <p role="alert">{recordsError}</p>}<div className="jp-alert-list">
              {ALERTAS.map((a, i) => (
                <div key={i} className={`jp-alert-item ${a.tipo === 'warn' ? 'jp-alert-item--warn' : ''}`}>
                  <div className="jp-alert-icon-wrap">
                    <AlertTriangle size={14} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span className="jp-alert-name">{a.nombre}</span>
                    <p className="jp-alert-detail">{a.curso}</p>
                  </div>
                  <span className={`jp-alert-count ${a.tipo === 'warn' ? 'jp-alert-count--warn' : ''}`}>
                    {a.inasistencias} faltas
                  </span>
                </div>
              ))}
            </div>
            <button className="sh-ver-todos" onClick={() => setNavActiva('asistencia')}>
              Gestionar todas <ArrowRight size={13} />
            </button>
          </div>

          {/* Preceptores registrados */}
          <div className="sh-card">
            <h2 className="sh-card-title">
              <Users size={17} /> Preceptores registrados
            </h2>
            <p className="sh-card-subtitle">Turnos asignados en el legajo</p>
            <div className="jp-prec-list">
              {PRECEPTORES.map((p, i) => (
                <div key={i} className="jp-prec-item">
                  <div className="jp-prec-avatar">{p.nombre[0]}</div>
                  <div style={{ flex: 1 }}>
                    <span className="jp-prec-name">{p.nombre}</span>
                    <p className="jp-prec-turno">Turno {p.turno}</p>
                  </div>

                </div>
              ))}
            </div>
            <button className="sh-ver-todos" onClick={() => setNavActiva('preceptores')}>
              Ver planilla de turnos <ArrowRight size={13} />
            </button>
          </div>

        </div>
      </>
    )
  }

  return (
    <div className="sh-layout">
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
                    <button key={r} className={`sh-role-dropdown-item ${r === 'jefe_preceptores' ? 'sh-role-dropdown-item--active' : ''}`}
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
            E.E.S.T. N°1 — Jefe de Preceptores
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
