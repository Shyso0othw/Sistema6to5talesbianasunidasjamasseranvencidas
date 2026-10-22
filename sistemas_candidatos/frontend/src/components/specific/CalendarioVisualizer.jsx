/*
  CalendarioVisualizer.jsx
  Calendario de solo lectura.
  Recibe props: onLogout, username, navItems, activeNav, onNav, rolLabel
*/
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Menu, X, Star, Pin, ChevronDown, ChevronUp, LogOut, MessageSquare, Edit2, Trash2 } from "lucide-react";
import { getRoleLabel } from '../../utils/roleLabels';
import "../../shared.css";
import '../../components/specific/CalendarioVisualizer.css';
import { fetchEvents } from "../../api/events";
import NotificationBell from '../../components/NotificationBell'

import { eventBus } from '../../stores/eventBus'

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_SEMANA = ["DOM","LUN","MAR","MIÉ","JUE","VIE","SÁB"];

function buildCalendar(year, month) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const days  = [];
  for (let i = 0; i < first.getDay(); i++) {
    const d = new Date(year, month, -first.getDay() + i + 1);
    days.push({ date: d, current: false });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push({ date: new Date(year, month, d), current: true });
  }
  while (days.length % 7 !== 0) {
    const d = new Date(year, month + 1, days.length - last.getDate() - first.getDay() + 1);
    days.push({ date: d, current: false });
  }
  return days;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

function isToday(d) { return sameDay(d, new Date()); }





// Persistir scroll del sidebar entre montajes
const sidebarScrollPos = {};

function dotsForDay(date, events = []) {
  return events.filter(e => e.fecha && sameDay(e.fecha, date));
}

function proximosEventos(events = []) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return events
    .filter(e => e.fecha && e.fecha >= hoy)
    .sort((a, b) => a.fecha - b.fecha)
    .slice(0, 5);
}

/* ── Componente base del calendario (reutilizado por todas las variantes) ── */
export function CalendarioBase({
  onLogout,
  username,
  navItems,
  navSections,
  navTitle,
  activeNav,
  onNav,
  rolLabel,
  canAddEvent,
  onAddEvent,
  legendaExtra,
  events = [],
  roles,
  onSwitchRole,
  onEditEvent,
  onDeleteEvent,
  canModifyEvent
}) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rolDropdownOpen, setRolDropdownOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [openSections, setOpenSections] = useState({
    'inicio': false,
    'control-usuarios': false,
    'control-institucional': false,
    'academico': false,
    'gestion-reportes': true
  });
  const navRef = useRef(null);

  const days    = buildCalendar(viewYear, viewMonth);
  const proximos = proximosEventos(events);
  const eventosDia = selectedDate
    ? events.filter(e => e.fecha && sameDay(e.fecha, selectedDate))
    : [];
  const ahora = new Date();
  ahora.setHours(0, 0, 0, 0);
  const ultimosEventos = [...events].filter(e => e.fecha).reverse();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const nombre = username || "Usuario";
  const navItemsToRender = (navSections || []).length > 0
    ? navSections.flatMap(s => s.items || [])
    : (navItems || []);

  // Preservar scroll del sidebar al navegar entre pantallas
  useEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = sidebarScrollPos['calendario'] || 0;
    }
  }, []);

  useEffect(() => {
    const unsub = eventBus.on('notification-navigate', ({ section }) => {
      if (section === 'chat') { onNav?.('chat'); return }
      if (section === 'notas') { onNav?.('notas'); return }
      if (section && !['calendario', 'eventos', 'comunicados'].includes(section)) {
        onNav?.(section)
      }
    })
    return unsub
  }, [onNav])

  const handleNavScroll = (e) => {
    sidebarScrollPos['calendario'] = e.target.scrollTop;
  };

  return (
    <div className="cal-layout sh-layout">

      {/* ── SIDEBAR (siempre visible) ── */}
      <aside className={`sh-sidebar ${sidebarOpen ? "sh-sidebar--open" : ""}`}>
        <div className="sh-sidebar-header">
          <div className="sh-sidebar-logo">
            <img src="https://eestn1.com.ar/src/assets/img/logo.webp" alt="Logo EEST N°1" />
          </div>
          <div className="sh-sidebar-school">
            <span className="sh-school-name">E.E.S.T. N°1</span>
            <span className="sh-school-sub">Escuela de Educación Secundaria Técnica N°1 Manuel Belgrano</span>
          </div>
          <button className="sh-hamburger" style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", marginLeft:"auto" }}
            onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="sh-nav" ref={navRef} onScroll={handleNavScroll}>
          {navSections && navSections.length > 0 ? (
            (navSections || []).map((section) => (
              <div key={section.id} style={{ marginBottom: section.id !== 'inicio' ? 4 : 0 }}>
                {section.id !== 'inicio' && (
                  <div 
                    className="sh-nav-section-title" 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '8px 12px', marginTop: 12, borderRadius: 6 }}
                    onClick={() => setOpenSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                  >
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                      {section.titulo}
                    </span>
                    {openSections[section.id] ? <ChevronUp size={14} style={{ color: 'rgba(255,255,255,0.4)' }} /> : <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />}
                  </div>
                )}
                
                <div style={{ display: section.id === 'inicio' || openSections[section.id] ? 'block' : 'none' }}>
                  {(section.items || []).map((item) => {
                    const IconComponent = item.icon || item.Icon;
                    return (
                      <button
                        key={item.id}
                        className={`sh-nav-item ${activeNav === item.id ? "sh-nav-item--active" : ""}`}
                        onClick={() => {
                          onNav && onNav(item.id)
                          setSidebarOpen(false)
                        }}
                      >
                        {IconComponent && <IconComponent size={16} />} {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <>
              {navTitle && <p className="sh-nav-section-title">{navTitle}</p>}
              {(navItemsToRender || []).map((item) => {
                  const IconComponent = item.icon || item.Icon;
                  return (
                    <button
                      key={item.id}
                      className={`sh-nav-item ${activeNav === item.id ? "sh-nav-item--active" : ""}`}
                      onClick={() => {
                        onNav && onNav(item.id)
                        setSidebarOpen(false)
                      }}
                    >
                      {IconComponent && <IconComponent size={16} />} {item.label}
                    </button>
                  );
                })}
            </>
          )}
        </nav>

        <div className="sh-sidebar-footer">
          <div className="sh-footer-user">
            <div className="sh-user-avatar">{(nombre || "Usuario")[0].toUpperCase()}</div>
            <div className="sh-user-info">
              <span className="sh-user-name">{nombre}</span>
            </div>
          </div>
          {Array.isArray(roles) && roles.length > 1 && (
            <div className="sh-role-switcher">
              <button className="sh-role-switcher-btn" onClick={() => setRolDropdownOpen(!rolDropdownOpen)}>
                <span className="sh-role-switcher-label">Cambiar rol</span>
                <ChevronDown size={14} style={{ transform: rolDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {rolDropdownOpen && (
                <div className="sh-role-dropdown">
                  {roles.map((r) => (
                    <button key={r} className={`sh-role-dropdown-item ${r.toLowerCase() === rolLabel?.toLowerCase() ? 'sh-role-dropdown-item--active' : ''}`}
                      onClick={() => { onSwitchRole && onSwitchRole(r); setRolDropdownOpen(false); }}>
                      {getRoleLabel(r)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button className="sh-logout" onClick={onLogout}>
            <LogOut size={13} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="cal-main sh-main">

        {/* Topbar móvil */}
        <div className="cal-mobile-topbar">
          <button className="cal-hamburger" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
          <div className="cal-topbar-brand">
            <img src="https://eestn1.com.ar/src/assets/img/logo.webp" className="cal-topbar-logo" alt="logo" />
            <span className="cal-topbar-name">EEST N°1</span>
          </div>
          <div className="cal-mobile-topbar-actions">
            <button className="sh-desktop-topbar-notif" onClick={() => onNav && onNav('chat')}>
              <MessageSquare size={18} />
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
            E.E.S.T. N°1
          </div>
          <div className="sh-desktop-topbar-actions">
            <button
              className="sh-desktop-topbar-notif"
              onClick={() => onNav && onNav('chat')}
            >
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
          <div className="cal-content">

            {/* Encabezado */}
          <div className="cal-page-header">
            <div>
              <h1 className="cal-page-title">Calendario{legendaExtra ? ` — ${legendaExtra}` : ""}</h1>
              <p className="cal-page-subtitle">
                {canAddEvent ? `Gestión de eventos${legendaExtra ? " de " + legendaExtra.toLowerCase() : ""}` : "Visualización del calendario institucional"}
              </p>
              {/* Leyenda */}
              <div className="cal-legend" style={{ marginTop: 8 }}>
                <span className="cal-legend-item"><span className="cal-legend-dot cal-legend-dot--admin" />Administración</span>
                <span className="cal-legend-item"><span className="cal-legend-dot cal-legend-dot--preceptor" />Preceptoría</span>
                <span className="cal-legend-item"><span className="cal-legend-dot cal-legend-dot--docente" />Docente</span>
              </div>
            </div>
          </div>

          {/* Grid calendario + próximos */}
          <div className="cal-grid">

            {/* Calendario mensual */}
            <div className="cal-card">
              <div className="cal-month-header">
                <button className="cal-nav-btn" onClick={prevMonth}><ChevronLeft size={18} /></button>
                <span className="cal-month-title">{MESES[viewMonth]} {viewYear}</span>
                <button className="cal-nav-btn" onClick={nextMonth}><ChevronRight size={18} /></button>
              </div>

              <div className="cal-weekdays">
                {DIAS_SEMANA.map((d, i) => (
                  <div key={d} className={`cal-weekday ${i === 0 ? "cal-weekday--sunday" : ""}`}>{d}</div>
                ))}
              </div>

              <div className="cal-days">
                {days.map((day, i) => {
                  const dots = dotsForDay(day.date, events);
                  const eventType = dots.length > 0 ? (dots[0].tipo || 'otro') : null;
                  let eventBorder = 'transparent';
                  if (eventType === 'admin' || eventType === 'direccion') eventBorder = '#f59e0b';
                  else if (eventType === 'preceptor') eventBorder = '#3b82f6';
                  else if (eventType === 'docente') eventBorder = '#22c55e';
                  else if (eventType) eventBorder = '#6366f1';
                  
                  return (
                    <div key={i} className={`cal-day ${!day.current ? "cal-day--other-month" : ""} ${isToday(day.date) ? "cal-day--today" : ""} ${selectedDate && sameDay(day.date, selectedDate) ? 'cal-day--selected' : ''}`}
                      onClick={() => setSelectedDate(day.date)}
                      style={{ cursor: 'pointer', outline: eventType ? `2px solid ${eventBorder}` : 'none', outlineOffset: '-2px' }}>
                      <span className="cal-day-num">{day.date.getDate()}</span>
                      {dots.length > 0 && (
                        <div className="cal-day-dots">
                          {dots.map((e, j) => (
                            <span key={j} className={`cal-day-dot cal-day-dot--${e.tipo}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {canAddEvent && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="sh-btn-primary" style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px", borderRadius:10, fontSize:14, whiteSpace:"nowrap" }}
                    onClick={onAddEvent}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Agregar Evento
                  </button>
                </div>
              )}
              {/* Día seleccionado */}
              {selectedDate && (
                <div className="cal-card">
                  <h2 className="cal-upcoming-title">
                    Día {selectedDate.toLocaleDateString("es-AR", { day:"numeric", month:"numeric", year:"numeric" })}
                  </h2>
                  {eventosDia.length === 0 ? (
                    <p style={{ color:"var(--text-muted)", fontSize:13, textAlign:"center", padding:"20px 0" }}>No hay eventos este día.</p>
                  ) : (
                    <div className="db-events-list">
                      {(eventosDia || []).map(ev => (
                        <div key={ev.id} className={`db-evento-card db-evento-card--${ev.tipo || 'admin'}`}>
                          <div className="db-evento-indicator" />
                          <div className="sh-evento-content">
                            <span className="sh-evento-fecha">
                              <Star size={11} /> {ev.fecha.toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric" })}
                              {ev.hora_inicio && ` · ${ev.hora_inicio}`}
                            </span>
                            <h3 className="sh-evento-nombre">{ev.titulo}</h3>
                            {ev.lugar && (
                              <span className="sh-evento-ubicacion"><Pin size={12} /> {ev.lugar}</span>
                            )}
                            {canAddEvent && (onEditEvent || onDeleteEvent) && (!canModifyEvent || canModifyEvent(ev)) && (
                              <div className="cal-event-actions" style={{ display:'flex', gap:6, marginTop:6 }}>
                                {onEditEvent && (
                                  <button className="com-edit-btn tooltip" data-tooltip="Editar evento"
                                    onClick={(e) => { e.stopPropagation(); onEditEvent(ev); }}
                                    style={{ padding:'3px 6px', fontSize:12 }}>
                                    <Edit2 size={13} />
                                  </button>
                                )}
                                {onDeleteEvent && (
                                  <button className="com-delete-btn tooltip" data-tooltip="Eliminar evento"
                                    onClick={(e) => { e.stopPropagation(); onDeleteEvent(ev); }}
                                    style={{ padding:'3px 6px', fontSize:12 }}>
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Próximos eventos */}
              <div className="cal-card">
              <h2 className="cal-upcoming-title">Próximos eventos</h2>
              {proximos.length === 0 ? (
                <p style={{ color:"var(--text-muted)", fontSize:13, textAlign:"center", padding:"20px 0" }}>No hay eventos este mes.</p>
              ) : (
                <div className="db-events-list">
                    {(proximos || []).map(ev => (
                    <div key={ev.id} className={`db-evento-card db-evento-card--${ev.tipo || 'admin'}`}>
                      <div className="db-evento-indicator" />
                      <div className="sh-evento-content">
                        <span className="sh-evento-fecha">
                          <Star size={11} /> {ev.fecha.toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric" })}
                          {ev.hora_inicio && ` · ${ev.hora_inicio}`}
                        </span>
                        <h3 className="sh-evento-nombre">{ev.titulo}</h3>
                        {ev.lugar && (
                          <span className="sh-evento-ubicacion">
                            <Pin size={12} /> {ev.lugar}
                          </span>
                        )}
                        {canAddEvent && (onEditEvent || onDeleteEvent) && (!canModifyEvent || canModifyEvent(ev)) && (
                          <div className="cal-event-actions" style={{ display:'flex', gap:6, marginTop:6 }}>
                            {onEditEvent && (
                              <button className="com-edit-btn tooltip" data-tooltip="Editar evento"
                                onClick={(e) => { e.stopPropagation(); onEditEvent(ev); }}
                                style={{ padding:'3px 6px', fontSize:12 }}>
                                <Edit2 size={13} />
                              </button>
                            )}
                            {onDeleteEvent && (
                              <button className="com-delete-btn tooltip" data-tooltip="Eliminar evento"
                                onClick={(e) => { e.stopPropagation(); onDeleteEvent(ev); }}
                                style={{ padding:'3px 6px', fontSize:12 }}>
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>

              <div className="cal-card">
                <h2 className="cal-upcoming-title">Últimos eventos</h2>
                {ultimosEventos.length === 0 ? (
                  <p style={{ color:"var(--text-muted)", fontSize:13, textAlign:"center", padding:"20px 0" }}>No hay eventos.</p>
                ) : (
                  <div className="db-events-list">
                    {(ultimosEventos || []).map(ev => (
                      <div key={ev.id} className={`db-evento-card db-evento-card--${ev.tipo || 'admin'}`}>
                        <div className="db-evento-indicator" />
                        <div className="sh-evento-content">
                          <span className="sh-evento-fecha">
                            <Star size={11} /> {ev.fecha.toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric" })}
                            {ev.hora_inicio && ` · ${ev.hora_inicio}`}
                          </span>
                          <h3 className="sh-evento-nombre">{ev.titulo}</h3>
                          {ev.lugar && (
                            <span className="sh-evento-ubicacion"><Pin size={12} /> {ev.lugar}</span>
                          )}
                          {canAddEvent && (onEditEvent || onDeleteEvent) && (!canModifyEvent || canModifyEvent(ev)) && (
                            <div className="cal-event-actions" style={{ display:'flex', gap:6, marginTop:6 }}>
                              {onEditEvent && (
                                <button className="com-edit-btn tooltip" data-tooltip="Editar evento"
                                  onClick={(e) => { e.stopPropagation(); onEditEvent(ev); }}
                                  style={{ padding:'3px 6px', fontSize:12 }}>
                                  <Edit2 size={13} />
                                </button>
                              )}
                              {onDeleteEvent && (
                                <button className="com-delete-btn tooltip" data-tooltip="Eliminar evento"
                                  onClick={(e) => { e.stopPropagation(); onDeleteEvent(ev); }}
                                  style={{ padding:'3px 6px', fontSize:12 }}>
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
  );
};

/* ── Exportación por defecto: solo visualización ── */
export default function CalendarioVisualizer({
  onLogout,
  username,
  navItems,
  navSections,
  navTitle,
  activeNav,
  onNav,
  roles,
  onSwitchRole,
  rolLabel,
  schoolSubs
}) {
  const [events, setEvents] = useState([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents()
      .then((data) => setEvents(data))
      .catch((err) => {
        console.error("Error cargando eventos:", err);
      })
      .finally(() => setLoading(false));

    const unsub = eventBus.on('evento_update', () => {
      fetchEvents()
        .then((data) => setEvents(data))
        .catch((err) => console.error("Error actualizando eventos:", err));
    });
    return unsub;
  }, []);

  return (
    <CalendarioBase
      onLogout={onLogout}
      username={username}
      navItems={navItems}
      navSections={navSections}
      navTitle={navTitle}
      schoolSubs={schoolSubs}
      activeNav={activeNav}
      onNav={onNav}
      rolLabel={rolLabel}
      canAddEvent={false}
      events={events}
      roles={roles}
      onSwitchRole={onSwitchRole}
    />
  );
}
