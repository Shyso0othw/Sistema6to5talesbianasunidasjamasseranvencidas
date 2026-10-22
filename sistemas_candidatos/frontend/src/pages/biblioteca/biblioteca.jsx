import { apiFetch } from '../../api/http.js'
import { useState, useEffect, useCallback, useRef } from 'react'
import { LayoutDashboard, Book, Bookmark, Users, History, BarChart3, User, LogOut, Menu, X, Clock3, Calendar, CalendarDays, Search, Plus, ArrowRight, CheckCircle2, AlertCircle, Mail, UserCheck, GraduationCap, ChevronRight, ChevronDown, Pin, MessageSquare, ArrowLeft } from 'lucide-react';
import ChatScreen from '../../components/specific/ChatScreen';
import StudentSearch from '../../components/common/StudentSearch';
import { fetchEvents } from '../../api/events'
import '../../shared.css'
import { getRoleLabel } from '../../utils/roleLabels'
import NotificationBell from '../../components/NotificationBell'

import { eventBus } from '../../stores/eventBus'
import PerfilGenerico from '../auth/PerfilGenerico';
import './biblioteca.css'
import BibliotecaPrestamos from './BibliotecaPrestamos';
import BibliotecaLectores from './BibliotecaLectores';
import BibliotecaHistorial from './BibliotecaHistorial';
import BibliotecaEstadisticas from './BibliotecaEstadisticas';
import { API_BASE } from '../../config'

const __sidebarPos = {};

/*
   BLOQUE 2: DATOS DE PRUEBA (MOCK DATA)
*/
const NAV_ITEMS = [
  { id: "inicio", icon: LayoutDashboard, label: "Inicio" },
  { id: "comunicados", icon: Mail, label: "Comunicados" },
  { id: "calendario", icon: CalendarDays, label: "Calendario" },
  { id: "agregar-libro", icon: Plus, label: "Agregar Libro" },
  { id: "todos-libros", icon: Book, label: "Todos los Libros" },
  { id: "prestamos", icon: Bookmark, label: "Préstamos" },
  { id: "cola-prestamos", icon: Clock3, label: "Cola Préstamos" },
  { id: "lectores", icon: Users, label: "Lectores" },
  { id: "historial", icon: History, label: "Historial" },
  { id: "estadisticas", icon: BarChart3, label: "Estadísticas" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "perfil", icon: User, label: "Perfil" },
];








/*
   BLOQUE 3: COMPONENTES AUXILIARES
*/
const SectionPlaceholder = ({ title, icon: Icon }) => (
  <StudentSearch title={title} icon={Icon} />
);

/*
   BLOQUE 4: COMPONENTE PRINCIPAL (BibliotecaDashboard)
*/
export default function BibliotecaDashboard({ onLogout, username, onOpenCalendar, initialSection, onClearPendingSection, roles, onSwitchRole, onOpenComunicados }) {
  const [navActiva, setNavActiva] = useState(initialSection || 'inicio')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [hora, setHora] = useState('')
  const [rolDropdownOpen, setRolDropdownOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [busquedaLibro, setBusquedaLibro] = useState('')
  const [prestarModal, setPrestarModal] = useState(null)
  const [editingBook,setEditingBook] = useState(null)
  const [librosList, setLibrosList] = useState([])
  const [prestamosActivos, setPrestamosActivos] = useState([])
  const [, setLoadingStats] = useState(true);
  const ACTIVIDAD_RECIENTE = prestamosActivos.slice(0,5).map(p => ({id:p.id,texto:`${p.libro} — ${p.lector} (${p.raw.estado})`,tiempo:p.raw.fecha_prestamo}));
  const navRef = useRef(null);

  const fetchCatalogAndLoans = () => {
    const t = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
    if (!t) return
    Promise.all([
      apiFetch(`${API_BASE}/libros/`, { headers: { 'Authorization': `Bearer ${t}` } }).then(r => r.ok ? r.json() : []),
      apiFetch(`${API_BASE}/prestamos/`, { headers: { 'Authorization': `Bearer ${t}` } }).then(r => r.ok ? r.json() : [])
    ])
      .then(([librosData, prestamosData]) => {
        const colors = ['#4a63e0', '#7c3aed', '#059669', '#dc2626', '#ca8a04', '#2563eb', '#db2777', '#16a34a']
        setLibrosList((librosData || []).map((l, i) => ({
          ...l,
          id: l.id,
          titulo: l.titulo,
          autor: l.autor,
          copias: l.copias ?? 0,
          disponibles: l.disponibles !== undefined ? l.disponibles : l.copias || 1,
          color: colors[i % colors.length],
          ubicacion: l.ubicacion || 'Sin ubicación registrada'
        })))

        const active = (prestamosData || []).filter(p => p.estado !== 'Devuelto' && p.estado !== 'Rechazado')

        setPrestamosActivos(active.map(p => {
          const isOverdue = new Date(p.fecha_entrega) < new Date() && p.estado !== 'Devuelto';
          return {
            id: p.id,
            libro: p.libro_titulo || 'Libro sin título',
            lector: p.usuario_nombre || 'Lector desconocido',
            curso: p.curso_materia || 'General',
            fecha: p.fecha_entrega ? new Date(p.fecha_entrega).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '—',
            estado: isOverdue ? 'demorado' : 'al-dia',
            raw: p
          }
        }))
      })
      .finally(() => setLoadingStats(false))
  }

  useEffect(() => {
    fetchCatalogAndLoans()
  }, [navActiva])

  const abrirPrestar = (libro) => {
    setBusquedaLibro('')
    setPrestarModal(libro)
  }

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
    if (initialSection) {
      onClearPendingSection && onClearPendingSection();
    }
  }, [initialSection, onClearPendingSection]);

  const nombre = username || 'Bibliotecario/a'

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
      onOpenComunicados && onOpenComunicados(navActiva);
      setIsSidebarOpen(false);
      return;
    }
    setNavActiva(id);
    setIsSidebarOpen(false);
  };



  const renderContent = () => {
    if (editingBook) return <AgregarLibroModal key={editingBook.id} initialData={editingBook} onClose={() => setEditingBook(null)} onSaved={() => {setEditingBook(null);fetchCatalogAndLoans();}} />;
    if (navActiva === "chat") {
      return <ChatScreen userRole="bibliotecario" />;
    }

    if (navActiva === "todos-libros") {
      const librosFiltrados = librosList.filter(l =>
        !busquedaLibro || l.titulo.toLowerCase().includes(busquedaLibro.toLowerCase()) || l.autor.toLowerCase().includes(busquedaLibro.toLowerCase())
      )
      return (
        <>
          <div className="sh-hero">
            <div className="sh-hero-left">
              <p className="sh-hero-welcome">CATÁLOGO COMPLETO</p>
              <h1 className="sh-hero-name">Todos los Libros</h1>
              <p className="sh-hero-date"><Calendar size={13} /> {fechaHoy}</p>
            </div>
            <div className="sh-hero-right">
              <div className="sh-hero-clock">
                <Clock3 size={16} /> {hora}
              </div>
            </div>
          </div>

          <div className="sh-filters-container">
            <div className="sh-filters-grid">
              <div className="sh-filter-group" style={{ gridColumn: '1 / -1' }}>
                <label className="sh-filter-label">Buscar por título o autor</label>
                <div className="sh-input-group">
                  <Search size={18} className="sh-input-icon" />
                  <input className="sh-input sh-input-with-icon" placeholder="Buscar libro..." value={busquedaLibro} onChange={e => setBusquedaLibro(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="bi-grid">
            <div className="sh-card bi-full-width">
              <h2 className="sh-card-title">
                <Book size={17} /> Biblioteca Completa
              </h2>
              <p className="sh-card-subtitle">{librosFiltrados.length} títulos disponibles</p>
              <div className="bi-libros-completo-grid">
                {librosFiltrados.map((libro) => (
                  <div key={libro.id} className="bi-libro-completo-card">
                    <div className="bi-libro-completo-cover" style={{ background: libro.color }}>
                      <Book size={24} color="#fff" />
                    </div>
                    <div className="bi-libro-completo-info">
                      <h3 className="bi-libro-completo-titulo">{libro.titulo}</h3>
                      <p className="bi-libro-completo-autor">{libro.autor}</p>
                      <div className="bi-libro-completo-meta">
                        <span className="bi-libro-meta-item">
                          <span className="bi-meta-label">Copias:</span> {libro.copias}
                        </span>
                        <span className={`bi-libro-meta-item ${libro.disponibles === 0 ? 'bi-agotado' : ''}`}>
                          <span className="bi-meta-label">Disponibles:</span> {libro.disponibles}
                        </span>
                      </div>
                      <div className="bi-libro-completo-ubicacion">
                        <Pin size={12} /> {libro.ubicacion}
                      </div>
                      <button className="sh-btn-action-small" onClick={() => setEditingBook(libro)}>Editar libro</button>
                      <button className="sh-btn-action-small" disabled={libro.disponibles === 0} onClick={() => libro.disponibles > 0 && abrirPrestar(libro)}>
                        {libro.disponibles > 0 ? 'Prestar' : 'No disponible'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {prestarModal && <PrestarModal libro={prestarModal} onClose={() => setPrestarModal(null)} onPrestado={() => { setPrestarModal(null); setNavActiva('prestamos') }} />}
        </>
      );
    }

    if (navActiva === 'perfil') {
      return <PerfilGenerico userRole="bibliotecario" />;
    }

    if (navActiva === 'agregar-libro') return <AgregarLibroModal onClose={() => setNavActiva('inicio')} onSaved={() => { fetchCatalogAndLoans(); setNavActiva('inicio'); }} />;

    if (navActiva === 'prestamos') return <BibliotecaPrestamos />;
    if (navActiva === 'cola-prestamos') return <ColaPrestamos />;
    if (navActiva === 'lectores') return <BibliotecaLectores />;
    if (navActiva === 'historial') return <BibliotecaHistorial />;
    if (navActiva === 'estadisticas') return <BibliotecaEstadisticas />;
    if (navActiva !== 'inicio') {
      const activeItem = NAV_ITEMS.find(i => i.id === navActiva);
      return <SectionPlaceholder title={activeItem?.label || navActiva} icon={activeItem?.icon} />;
    }

    return (
      <>
        {/* Hero Section */}
        <div className="sh-hero">
          <div className="sh-hero-left">
            <p className="sh-hero-welcome">BIBLIOTECA INSTITUCIONAL</p>
            <h1 className="sh-hero-name">Resumen de Biblioteca</h1>
            <p className="sh-hero-date"><Calendar size={13} /> {fechaHoy}</p>
            <div className="bi-hero-stats">
              <span className="bi-hero-stat"><strong>{librosList.length}</strong> Libros</span>
              <span className="bi-hero-stat"><strong>{prestamosActivos.length}</strong> Préstamos activos</span>
            </div>
          </div>
          <div className="sh-hero-right">
            <div className="sh-hero-clock">
              <Clock3 size={16} /> {hora}
            </div>
          </div>
        </div>

        {/* Botones de Acceso Rápido */}
        <div className="bi-acciones-grid">
          <button className="sh-btn-action" onClick={() => handleNav('comunicados')}>
            <div className="sh-btn-action-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}><Mail size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Comunicados</span>
              <span className="sh-btn-action-desc">Ver comunicados</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => setNavActiva('prestamos')}>
            <div className="sh-btn-action-icon" style={{ background: '#eef2ff', color: '#4a63e0' }}><Plus size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Nuevo Préstamo</span>
              <span className="sh-btn-action-desc">Registrar salida de material</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => setNavActiva('agregar-libro')}>
            <div className="sh-btn-action-icon" style={{ background: '#ecfdf5', color: '#059669' }}><Plus size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Agregar Libro</span>
              <span className="sh-btn-action-desc">Nuevo ejemplar al catálogo</span>
            </div>
          </button>
          <button className="sh-btn-action" onClick={() => setNavActiva('catalogo')}>
            <div className="sh-btn-action-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}><Search size={20} /></div>
            <div>
              <span className="sh-btn-action-label">Buscar Libro</span>
              <span className="sh-btn-action-desc">Consulta de stock y ubicación</span>
            </div>
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="bi-grid">

          {/* Préstamos Activos (Libros retirados) */}
          <div className="sh-card bi-main-card">
            <h2 className="sh-card-title">
              <Bookmark size={17} /> Préstamos Activos
            </h2>
            <p className="sh-card-subtitle">Material pendiente de devolución</p>
            <div className="bi-prestamos-list">
              {prestamosActivos.length === 0 ? (
                <p className="sh-empty-text">No hay préstamos activos.</p>
              ) : (
                prestamosActivos.slice(0, 4).map((p) => (
                  <div key={p.id} className="bi-prestamo-row">
                    <div className="bi-prestamo-info">
                      <span className="bi-libro-nombre">{p.libro}</span>
                      <span className="bi-lector-nombre">{p.lector} — {p.curso}</span>
                    </div>
                    <div className="bi-prestamo-meta">
                      <span className="bi-fecha-entrega">Entrega: {p.fecha}</span>
                      <span className={`bi-estado-badge bi-estado-badge--${p.estado}`}>
                        {p.estado === 'al-dia' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        {p.estado === 'al-dia' ? 'Al día' : 'Demorado'}
                      </span>
                    </div>
                    <button className="sh-btn-ghost sh-btn-sm" onClick={() => setNavActiva('prestamos')}>
                      Devolver <ArrowRight size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <button className="sh-ver-todos" onClick={() => setNavActiva('prestamos')}>
              Ver todos los préstamos <ArrowRight size={13} />
            </button>
          </div>

          {/* Más solicitados */}
          <div className="sh-card">
            <h2 className="sh-card-title">
              <BarChart3 size={17} /> Más solicitados
            </h2>
            <div className="bi-populares-list">
              {librosList.length === 0 ? (
                <p className="sh-empty-text">No hay libros registrados.</p>
              ) : (
                librosList.slice(0, 3).map((l) => (
                  <div key={l.id} className="bi-libro-card">
                    <div className="bi-libro-cover" style={{ background: l.color }}>
                      <Book size={20} color="#fff" />
                    </div>
                    <div className="bi-libro-detalles">
                      <span className="bi-libro-titulo">{l.titulo}</span>
                      <span className="bi-libro-autor">{l.autor}</span>
                      <span className="bi-libro-copias">{l.disponibles} copias disponibles</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button className="sh-ver-todos" onClick={() => setNavActiva('catalogo')}>
              Ver catálogo completo <ArrowRight size={13} />
            </button>
          </div>

          {/* Actividad Reciente */}
          <div className="sh-card">
            <h2 className="sh-card-title">
              <History size={17} /> Actividad reciente
            </h2>
            <div className="bi-actividad-list">
              {ACTIVIDAD_RECIENTE.map((act) => (
                <div key={act.id} className="bi-actividad-item">
                  <div className="bi-actividad-line" />
                  <div className="bi-actividad-info">
                    <p className="bi-actividad-texto">{act.texto}</p>
                    <span className="bi-actividad-tiempo">{act.tiempo}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="sh-ver-todos" onClick={() => setNavActiva('historial')}>
              Ver historial completo <ArrowRight size={13} />
            </button>
          </div>

          {/* Gestión de Lectores (Cursos y Profesores) */}
          <div className="sh-card bi-full-width">
            <h2 className="sh-card-title">
              <Users size={17} /> Gestión de Lectores
            </h2>
            <div className="bi-lectores-grid">
              <button className="bi-lector-btn" onClick={() => setNavActiva('lectores')}>
                <div className="bi-lector-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
                  <GraduationCap size={20} />
                </div>
                <span>Cursos / Alumnos</span>
                <ChevronRight size={16} />
              </button>
              <button className="bi-lector-btn" onClick={() => setNavActiva('lectores')}>
                <div className="bi-lector-icon-wrap" style={{ background: '#eef2ff', color: '#4a63e0' }}>
                  <UserCheck size={20} />
                </div>
                <span>Profesores / Personal</span>
                <ChevronRight size={16} />
              </button>
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
                         <Calendar size={11} /> {new Date(e.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
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
                    <button key={r} className={`sh-role-dropdown-item ${r === 'bibliotecario' ? 'sh-role-dropdown-item--active' : ''}`}
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
            E.E.S.T. N°1 — Biblioteca
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

function PrestarModal({ libro, onClose, onPrestado }) {
  const [busqueda, setBusqueda] = useState('')
  const [usuarios, setUsuarios] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [cursoMateria, setCursoMateria] = useState('')
  const [horaDesde, setHoraDesde] = useState('07:45')
  const [horaHasta, setHoraHasta] = useState('21:50')
  const [dias, setDias] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const dropdownRef = useRef(null)

  const buscarUsuarios = async (q) => {
    setBusqueda(q)
    if (q.length < 2) { setUsuarios([]); return }
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
      const headers = { 'Accept': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const r = await apiFetch(`${API_BASE}/usuarios/?search=${encodeURIComponent(q)}`, { headers })
      if (r.ok) {
        const data = await r.json()
        setUsuarios(data.results || data)
      }
    } catch { /* ignore */ }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!selectedUser) { setError('Seleccioná un usuario'); return }
    if (!horaDesde || !horaHasta) { setError('Completá la franja horaria'); return }
    setLoading(true)
    try {
      const r = await apiFetch(`${API_BASE}/prestamos/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          libro: libro.id,
          usuario: selectedUser.id,
          fecha_prestamo: new Date().toISOString().split('T')[0],
          fecha_entrega: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
          hora_desde: horaDesde,
          hora_hasta: horaHasta,
          dias,
          curso_materia: cursoMateria,
          estado: 'Pendiente',
        }),
      })
      if (!r.ok) {
        const err = await r.json()
        throw new Error(Object.values(err).flat().join('. '))
      }
      setSuccess(true)
      setTimeout(onPrestado, 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="sh-modal-overlay" onClick={onClose}>
        <div className="sh-modal" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <CheckCircle2 size={48} style={{ color: '#059669', marginBottom: '1rem' }} />
            <h3>Préstamo registrado</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '.5rem' }}>Se notificó al usuario para que acepte</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sh-modal-overlay" onClick={onClose}>
      <div className="sh-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="sh-modal-header">
          <h3><Book size={18} /> Prestar: {libro.titulo}</h3>
          <button className="sh-btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="agregar-alumno-field" style={{ position: 'relative' }}>
            <label className="agregar-alumno-label">Buscar Usuario</label>
            <input className="agregar-alumno-input" placeholder="Nombre, apellido o DNI..." value={busqueda} onChange={e => buscarUsuarios(e.target.value)} />
            {usuarios.length > 0 && (
              <div ref={dropdownRef} style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 8, zIndex: 100, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }}>
                {usuarios.map(u => (
                  <button key={u.id} type="button" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: selectedUser?.id === u.id ? 'var(--gray-100)' : 'transparent', cursor: 'pointer' }}
                    onClick={() => { setSelectedUser(u); setCursoMateria(u.perfil_especifico?.año ? `${u.perfil_especifico.año}° ${u.perfil_especifico.division || ''}` : u.perfil_especifico?.materia || ''); setUsuarios([]); setBusqueda(u.get_full_name?.() || u.nombre_completo || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username) }}>
                    {u.get_full_name?.() || u.nombre_completo || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="agregar-alumno-field">
            <label className="agregar-alumno-label">Curso / Materia</label>
            <input className="agregar-alumno-input" placeholder="Ej: 3° Año A o Matemática" value={cursoMateria} onChange={e => setCursoMateria(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="agregar-alumno-field">
              <label className="agregar-alumno-label">Hora Desde</label>
              <input type="time" className="agregar-alumno-input" value={horaDesde} onChange={e => setHoraDesde(e.target.value)} min="07:45" max="21:50" required />
            </div>
            <div className="agregar-alumno-field">
              <label className="agregar-alumno-label">Hora Hasta</label>
              <input type="time" className="agregar-alumno-input" value={horaHasta} onChange={e => setHoraHasta(e.target.value)} min="07:45" max="21:50" required />
            </div>
          </div>
          <div className="agregar-alumno-field">
            <label className="agregar-alumno-label">Días (opcional)</label>
            <input className="agregar-alumno-input" placeholder="Ej: Lunes, Miércoles, Viernes" value={dias} onChange={e => setDias(e.target.value)} />
          </div>
          {error && <div className="agregar-alumno-error" style={{ margin: 0 }}><AlertCircle size={16} /> {error}</div>}
          <div className="agregar-alumno-buttons" style={{ marginTop: '.5rem' }}>
            <button type="button" className="agregar-alumno-btn agregar-alumno-btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="agregar-alumno-btn agregar-alumno-btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : <><CheckCircle2 size={18} /> Prestar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ColaPrestamos() {
  const [pendientes, setPendientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [prestarData, setPrestarData] = useState(null)
  const [formFecha, setFormFecha] = useState('')
  const [formHoraDesde, setFormHoraDesde] = useState('07:45')
  const [formHoraHasta, setFormHoraHasta] = useState('21:50')
  const [formDias, setFormDias] = useState('')

  const [loadError, setLoadError] = useState('')
  const cargar = useCallback(() => apiFetch(`${API_BASE}/prestamos/pendientes/`).then(r => {
    if (!r.ok) throw new Error('No se pudieron cargar los préstamos')
    return r.json()
  }).then(setPendientes).catch(error => setLoadError(error.message)).finally(() => setLoading(false)), [])
  useEffect(() => { cargar() }, [cargar])

  const handleAceptar = (prestamo) => {
    setPrestarData(prestamo)
    const delivery = new Date()
    delivery.setDate(delivery.getDate() + 7)
    setFormFecha(delivery.toLocaleDateString('en-CA'))
    setFormHoraDesde('07:45')
    setFormHoraHasta('21:50')
    setFormDias('')
  }

  const handleAceptarConForm = async () => {
    if (!prestarData) return
    try {
      const body = {}
      if (formFecha) body.fecha_entrega = formFecha
      if (formHoraDesde) body.hora_desde = formHoraDesde
      if (formHoraHasta) body.hora_hasta = formHoraHasta
      if (formDias) body.dias = formDias
      const r = await apiFetch(`${API_BASE}/prestamos/${prestarData.id}/aceptar/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body),
      })
      if (r.ok) { setPrestarData(null); cargar() }
    } catch { /* ignore */ }
  }

  const handleRechazar = async (id) => {
    try {
      const r = await apiFetch(`${API_BASE}/prestamos/${id}/rechazar/`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } })
      if (r.ok) cargar()
    } catch { /* ignore */ }
  }



  return (
    <div className="sh-page">
      <div className="sh-hero">
        <div className="sh-hero-content">
          <h2 className="sh-hero-title"><Clock3 size={24} /> Cola de Préstamos</h2>
          <p className="sh-hero-subtitle">Solicitudes pendientes de procesar</p>
        </div>
      </div>

      {prestarData && (
        <div className="sh-modal-overlay" onClick={() => setPrestarData(null)}>
          <div className="sh-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="sh-modal-header">
              <h3><Book size={18} /> Procesar: {prestarData.libro_titulo}</h3>
              <button className="sh-btn-ghost" onClick={() => setPrestarData(null)}><X size={18} /></button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p><strong>Usuario:</strong> {prestarData.usuario_nombre || '—'}</p>
              <p><strong>Estado:</strong> {prestarData.estado}</p>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Fecha límite de devolución (opcional)</label>
                <input type="date" className="agregar-alumno-input" value={formFecha} onChange={e => setFormFecha(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="agregar-alumno-field">
                  <label className="agregar-alumno-label">Hora Desde</label>
                  <input type="time" className="agregar-alumno-input" value={formHoraDesde} onChange={e => setFormHoraDesde(e.target.value)} min="07:45" max="21:50" />
                </div>
                <div className="agregar-alumno-field">
                  <label className="agregar-alumno-label">Hora Hasta</label>
                  <input type="time" className="agregar-alumno-input" value={formHoraHasta} onChange={e => setFormHoraHasta(e.target.value)} min="07:45" max="21:50" />
                </div>
              </div>
              <div className="agregar-alumno-field">
                <label className="agregar-alumno-label">Días (opcional)</label>
                <input className="agregar-alumno-input" placeholder="Ej: Lunes, Miércoles, Viernes" value={formDias} onChange={e => setFormDias(e.target.value)} />
              </div>
              <div className="agregar-alumno-buttons" style={{ marginTop: '.5rem' }}>
                <button type="button" className="agregar-alumno-btn agregar-alumno-btn-secondary" onClick={() => setPrestarData(null)}>Cancelar</button>
                <button className="agregar-alumno-btn agregar-alumno-btn-primary" onClick={handleAceptarConForm}><CheckCircle2 size={18} /> Aceptar Préstamo</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sh-card">
        {loadError && <p role="alert">{loadError}</p>}
        {loading ? <p className="sh-empty-text">Cargando...</p> : pendientes.length === 0 ? (
          <p className="sh-empty-text">No hay solicitudes pendientes</p>
        ) : (
          <table className="en-table">
            <thead className="en-thead">
              <tr className="en-tr">
                <th className="en-th">Libro</th>
                <th className="en-th">Usuario</th>
                <th className="en-th">Estado</th>
                <th className="en-th">Acción</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.map(p => (
                <tr key={p.id} className="en-tr">
                  <td className="en-td">{p.libro_titulo}</td>
                  <td className="en-td">{p.usuario_nombre}</td>
                  <td className="en-td">
                    <span style={{
                      display: 'inline-flex', padding: '3px 12px', borderRadius: 20,
                      fontSize: 12, fontWeight: 700,
                      background: p.estado === 'Solicitado' ? '#fffbeb' : '#eff6ff',
                      color: p.estado === 'Solicitado' ? '#d97706' : '#2563eb'
                    }}>{p.estado}</span>
                  </td>
                  <td className="en-td">
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="sh-btn-action-small" style={{ background: '#ecfdf5', color: '#059669', border: 'none' }} onClick={() => handleAceptar(p)}>Aceptar</button>
                      <button className="sh-btn-action-small" style={{ background: '#fef2f2', color: '#dc2626', border: 'none' }} onClick={() => handleRechazar(p.id)}>Rechazar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function AgregarLibroModal({ onClose, onSaved, initialData }) {
  const [form, setForm] = useState({
    titulo: '', autor: '', isbn: '', editorial: '', anio: '',
    categoria: '', copias: 1, disponibles: 1, ubicacion: '', imagen: '', ...initialData
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo || !form.autor) {
      setError('Título y autor son obligatorios');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const t = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await apiFetch(`${API_BASE}/libros/${initialData ? initialData.id+'/' : ''}`, {
        method: initialData ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` },
        body: JSON.stringify({...form, anio: form.anio === '' ? null : Number(form.anio)})
      });
      if (res.ok) {
        onSaved && onSaved();
        onClose && onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || err.message || Object.values(err).flat().join('. ') || 'Error al guardar el libro');
      }
    } catch {
  setError('Error de conexión');
} finally {
      setSaving(false);
    }
  };

  return (
    <div className="sh-modal-overlay" onClick={onClose}>
      <div className="sh-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="sh-modal-header">
          <h2 className="sh-modal-title"><Plus size={20} /> Agregar Libro</h2>
          <button className="sh-modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="sh-modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && <div className="sh-alert sh-alert--danger">{error}</div>}
            <div className="sh-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="sh-form-group">
                <label className="sh-form-label">Título *</label>
                <input className="sh-input" name="titulo" value={form.titulo} onChange={handleChange} placeholder="Título del libro" required />
              </div>
              <div className="sh-form-group">
                <label className="sh-form-label">Autor *</label>
                <input className="sh-input" name="autor" value={form.autor} onChange={handleChange} placeholder="Autor" required />
              </div>
            </div>
            <div className="sh-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="sh-form-group">
                <label className="sh-form-label">ISBN</label>
                <input className="sh-input" name="isbn" value={form.isbn} onChange={handleChange} placeholder="ISBN-13" />
              </div>
              <div className="sh-form-group">
                <label className="sh-form-label">Editorial</label>
                <input className="sh-input" name="editorial" value={form.editorial} onChange={handleChange} placeholder="Editorial" />
              </div>
            </div>
            <div className="sh-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="sh-form-group">
                <label className="sh-form-label">Año</label>
                <input className="sh-input" name="anio" type="number" value={form.anio} onChange={handleChange} placeholder="2024" min="1500" max={new Date().getFullYear() + 1} />
              </div>
              <div className="sh-form-group">
                <label className="sh-form-label">Categoría</label>
                <input className="sh-input" name="categoria" value={form.categoria} onChange={handleChange} placeholder="Ej: Matemática, Física, Literatura" />
              </div>
              <div className="sh-form-group">
                <label className="sh-form-label">Ubicación</label>
                <input className="sh-input" name="ubicacion" value={form.ubicacion} onChange={handleChange} placeholder="Ej: Estante A1" />
              </div>
            </div>
            <div className="sh-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="sh-form-group">
                <label className="sh-form-label">Copias totales</label>
                <input className="sh-input" name="copias" type="number" value={form.copias} onChange={handleChange} min="1" />
              </div>
              <div className="sh-form-group">
                <label className="sh-form-label">Disponibles</label>
                <input className="sh-input" name="disponibles" type="number" value={form.disponibles} onChange={handleChange} min="0" />
              </div>
              <div className="sh-form-group">
                <label className="sh-form-label">Imagen URL</label>
                <input className="sh-input" name="imagen" value={form.imagen} onChange={handleChange} placeholder="https://..." />
              </div>
            </div>
          </div>
          <div className="sh-modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="sh-btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="sh-btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Libro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
