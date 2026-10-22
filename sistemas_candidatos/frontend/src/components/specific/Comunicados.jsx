import { apiFetch } from '../../api/http.js'
import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, X, Plus, Trash2, Users, CheckCircle2, Edit2, Menu, LogOut, ChevronDown, ArrowLeft, ChevronUp } from 'lucide-react';
import '../../shared.css';
import '../../components/specific/Comunicados.css';
import { getRoleLabel } from '../../utils/roleLabels';
import NotificationBell from '../../components/NotificationBell'

import { eventBus } from '../../stores/eventBus'
import { API_BASE } from '../../config'

// Persistir scroll del sidebar entre montajes
const _sidebarScrollPos = {};

// Roles que pueden crear comunicados
const ROLES_CON_PERMISO = new Set([
  'preceptor',
  'director',
  'directivo',
  'admin',
  'secretario',
  'secretaria',
  'profesor',
  'jefe_area',
  'jefe_preceptores',
  'jefe_departamento'
]);

// Admin role for full permissions
const ADMIN_ROLES = new Set(['admin']);

const formatCursoLabel = (curso) => `${curso.año}° ${curso.division}`;

const DESTINATARIOS_OPCIONES = [
  { value: 'todos', label: 'Toda la comunidad educativa' },
  { value: 'docentes', label: 'Docentes' },
  { value: 'preceptores', label: 'Preceptores' },
  { value: 'alumnos', label: 'Alumnos' },
  { value: 'familias', label: 'Familias' },
  { value: 'auxiliares', label: 'Auxiliares' },
  { value: 'ciclo_basico', label: 'Ciclo Básico' },
  { value: 'ciclo_superior', label: 'Ciclo Superior' },
  { value: 'cursos_especificos', label: 'Cursos específicos' },
];

const DEST_MAP = {
  'todos': 'Todos', 'docentes': 'Docentes', 'preceptores': 'Preceptores',
  'alumnos': 'Estudiantes', 'familias': 'Familias', 'auxiliares': 'Auxiliares',
  'ciclo_basico': 'CicloBasico', 'ciclo_superior': 'CicloSuperior',
  'cursos_especificos': 'CursosEspecificos',
}
const DEST_MAP_REVERSE = Object.fromEntries(Object.entries(DEST_MAP).map(([k, v]) => [v, k]))

const parseDestinatarios = (str) => {
  if (!str) return ['todos']
  return str.split(',').map(s => DEST_MAP_REVERSE[s.trim()] || s.trim().toLowerCase())
}
const stringifyDestinatarios = (arr) => {
  if (!arr || arr.length === 0) return 'Todos'
  if (arr.includes('todos')) return 'Todos'
  return arr.map(a => DEST_MAP[a] || 'Todos').join(',')
}

function ModalComunicado({ onClose, onSave, initialData = null, userRole, cursosAsignados = [], cursos = [] }) {
  const [form, setForm] = useState({
    titulo: initialData?.titulo || '',
    cuerpo: initialData?.cuerpo || '',
    tipoDestinatario: initialData?.tipoDestinatario || ['todos'],
    cursosSeleccionados: initialData?.cursosSeleccionados || []
  });
  const [error, setError] = useState('');

  // Actualizar formulario
  const handleChange = (campo, valor) => {
    setForm(prev => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const toggleDestinatario = (valor) => {
    setForm(prev => {
      let next = [...prev.tipoDestinatario]
      if (valor === 'todos') {
        next = ['todos']
      } else {
        next = next.filter(v => v !== 'todos')
        if (next.includes(valor)) {
          next = next.filter(v => v !== valor)
        } else {
          next.push(valor)
        }
      }
      if (next.length === 0) next = ['todos']
      return { ...prev, tipoDestinatario: next, ...(valor === 'todos' || (!next.includes('cursos_especificos') && valor === 'cursos_especificos') ? { cursosSeleccionados: [] } : {}) }
    })
  }

  // Toggle para selección de cursos
  const toggleCurso = (cursoId) => {
    setForm(prev => ({
      ...prev,
      cursosSeleccionados: prev.cursosSeleccionados.includes(cursoId)
        ? prev.cursosSeleccionados.filter(id => id !== cursoId)
        : [...prev.cursosSeleccionados, cursoId]
    }));
  };

  // Obtener cursos disponibles según el rol
  const obtenerCursosDisponibles = () => {
    const todosLosCursos = cursos.map(curso => ({
      ...curso,
      nombre: formatCursoLabel(curso),
      ciclo: curso.año >= 4 ? 'superior' : 'basico',
    }));
    
    // Si es profesor, solo mostrar sus cursos asignados
    if (userRole === 'profesor' && cursosAsignados.length > 0) {
      return todosLosCursos.filter(curso => 
        cursosAsignados.some(asignado => curso.nombre.includes(asignado) || asignado.includes(curso.nombre))
      );
    }
    
    return todosLosCursos;
  };

  // Obtener opciones de destinatarios según rol
  const obtenerOpcionesDestinatarios = () => {
    if (userRole === 'profesor') {
      // Profesores solo pueden enviar a sus cursos
      return DESTINATARIOS_OPCIONES.filter(opt => 
        opt.value === 'cursos_especificos' || opt.value === 'todos'
      );
    }
    return DESTINATARIOS_OPCIONES;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.titulo.trim()) {
      setError('Por favor, completa el título del comunicado');
      return;
    }
    if (!form.cuerpo.trim()) {
      setError('Por favor, escribe el cuerpo del comunicado');
      return;
    }
    if (form.tipoDestinatario.includes('cursos_especificos') && form.cursosSeleccionados.length === 0) {
      setError('Por favor, selecciona al menos un curso');
      return;
    }

    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el comunicado.');
    }
  };

  const cursosDisponibles = obtenerCursosDisponibles();
  const cursosBasicos = cursosDisponibles.filter(curso => curso.ciclo === 'basico');
  const cursosSuperiores = cursosDisponibles.filter(curso => curso.ciclo === 'superior');
  const opcionesDestinatarios = obtenerOpcionesDestinatarios();
  const mostrarCursos = form.tipoDestinatario.includes('cursos_especificos');

  return (
    <div className="com-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="com-modal">
        <div className="com-modal-header">
          <h2 className="com-modal-title">{initialData ? 'Editar Comunicado' : 'Nuevo Comunicado'}</h2>
          <button className="com-modal-close tooltip" data-tooltip="Cerrar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="com-error">{error}</div>}

        <form onSubmit={handleSubmit} className="com-form">
          <div className="com-field">
            <label className="com-label">Título <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              className="com-input"
              placeholder="Ingresa el título del comunicado"
              value={form.titulo}
              onChange={(e) => handleChange('titulo', e.target.value)}
            />
          </div>

          <div className="com-field">
            <label className="com-label">Contenido <span style={{ color: '#dc2626' }}>*</span></label>
            <textarea
              className="com-textarea"
              placeholder="Escribe aquí el comunicado"
              value={form.cuerpo}
              onChange={(e) => handleChange('cuerpo', e.target.value)}
              rows={5}
            />
          </div>

          

          <div className="com-field">
            <label className="com-label">Destinatarios <span style={{ color: '#dc2626' }}>*</span></label>
            <div className="com-destinatarios" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {opcionesDestinatarios.map(opcion => (
                <label key={opcion.value} className="com-checkbox-label tooltip" data-tooltip={opcion.label}>
                  <input
                    type="checkbox"
                    name="tipoDestinatario"
                    value={opcion.value}
                    checked={form.tipoDestinatario.includes(opcion.value)}
                    onChange={() => toggleDestinatario(opcion.value)}
                  />
                  <span>{opcion.label}</span>
                </label>
              ))}
            </div>
          </div>

          {mostrarCursos && (
            <>
              <div className="com-field">
                <label className="com-label">Ciclo Básico</label>
                <div className="com-cursos-grid">
                  {cursosBasicos.map(curso => (
                    <label key={curso.id} className="com-checkbox-label tooltip" data-tooltip={`Seleccionar curso ${curso.nombre}`}>
                      <input
                        type="checkbox"
                        checked={form.cursosSeleccionados.includes(curso.nombre)}
                        onChange={() => toggleCurso(curso.nombre)}
                      />
                      <span>{curso.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="com-field">
                <label className="com-label">Ciclo Superior</label>
                <div className="com-cursos-grid">
                  {cursosSuperiores.map(curso => (
                    <label key={curso.id} className="com-checkbox-label tooltip" data-tooltip={`Seleccionar curso ${curso.nombre}`}>
                      <input
                        type="checkbox"
                        checked={form.cursosSeleccionados.includes(curso.nombre)}
                        onChange={() => toggleCurso(curso.nombre)}
                      />
                      <span>{curso.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="com-buttons">
            <button type="button" className="com-btn com-btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="com-btn com-btn-primary tooltip" data-tooltip="Guardar comunicado">
              {initialData ? 'Guardar Cambios' : 'Enviar Comunicado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Alias for backward compatibility


  const apiComunicadoAFormatoLocal = (api) => ({
    id: api.id,
    titulo: api.titulo,
    cuerpo: api.cuerpo,
    fecha: new Date(api.fecha),
    rolCreador: api.rol_creador,
    nombreCreador: api.creado_por_nombre,
    tipoDestinatario: parseDestinatarios(api.tipo_destinatario),
    cursosSeleccionados: api.cursos_seleccionados || [],
  })

function Comunicados({
  userRole = 'director',
  cursosAsignados = [],
  username = 'Usuario',
  navSections = [],
  navItems = [],
  navTitle,
  onNav = () => {},
  onLogout = () => {},
  roles = [],
  onSwitchRole = () => {}
}) {
  const [openSections, setOpenSections] = useState({
    'inicio': false,
    'control-usuarios': false,
    'control-institucional': false,
    'academico': false,
    'gestion-reportes': true
  });
  const [comunicados, setComunicados] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingComunicado, setEditingComunicado] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Comunicado enviado exitosamente!');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rolDropdownOpen, setRolDropdownOpen] = useState(false);
  const navRef = useRef(null);

  const [loadError, setLoadError] = useState('')
  const cargarComunicados = useCallback(() => apiFetch(`${API_BASE}/comunicados/`).then(r => {
    if (!r.ok) throw new Error('No se pudieron cargar los comunicados')
    return r.json()
  }).then(data => {setLoadError('');setComunicados(data.map(apiComunicadoAFormatoLocal))})
    .catch(error => setLoadError(error.message)).finally(() => setLoading(false)), [])

  useEffect(() => { cargarComunicados() }, [cargarComunicados])

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
    const headers = { 'Accept': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    apiFetch(`${API_BASE}/cursos/`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => setCursos(data || []))
      .catch(() => setCursos([]))
  }, [])

  // Preservar scroll del sidebar al montar/remontar
  useEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = _sidebarScrollPos['comunicados'] || 0;
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
    _sidebarScrollPos['comunicados'] = e.target.scrollTop;
  };



  const puedeCrear = ROLES_CON_PERMISO.has(userRole);
  const esAdmin = ADMIN_ROLES.has(userRole);

  // Filtrar comunicados según el rol
  const filtrarComunicados = (lista) => {
    if (esAdmin || userRole === 'directivo' || userRole === 'secretaria' || userRole === 'jefe_area' || userRole === 'jefe_preceptores' || userRole === 'jefe_departamento') {
      return lista;
    }
    return lista.filter(c => {
      if (c.tipoDestinatario.includes('todos')) return true;
      if (userRole === 'estudiante') {
        return c.tipoDestinatario.some(t => ['alumnos', 'ciclo_basico', 'ciclo_superior'].includes(t));
      }
      if (userRole === 'profesor') {
        return c.tipoDestinatario.some(t => ['docentes', 'cursos_especificos'].includes(t));
      }
      if (userRole === 'preceptor') {
        return c.tipoDestinatario.some(t => ['preceptores', 'ciclo_basico', 'ciclo_superior', 'cursos_especificos'].includes(t));
      }
      if (userRole === 'familia') {
        return c.tipoDestinatario.some(t => ['familias', 'ciclo_basico', 'ciclo_superior'].includes(t));
      }
      return false;
    });
  };

  const comunicadosFiltrados = filtrarComunicados(comunicados);

  // Formatear fecha
  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtener label del destinatario
  const obtenerDestinatarioLabel = (tipos) => {
    if (!Array.isArray(tipos)) return tipos;
    if (tipos.includes('todos')) return 'Toda la comunidad';
    const labels = tipos.map(t => {
      const opcion = DESTINATARIOS_OPCIONES.find(opt => opt.value === t);
      return opcion ? opcion.label : t;
    });
    return labels.join(' + ');
  };

  // Obtener color del rol creador
  const obtenerColorRol = (rol) => {
    const colores = {
      director: '#7c3aed',
      directivo: '#7c3aed',
      preceptor: '#059669',
      profesor: '#2563eb',
      admin: '#dc2626',
      jefe_area: '#ca8a04',
      jefe_preceptores: '#0891b2',
      jefe_departamento: '#9333ea',
      secretaria: '#a78bfa',
      secretario: '#a78bfa'
    };
    return colores[rol] || '#6b7280';
  };

  // Obtener label del rol creador
  const obtenerRolLabel = (rol) => {
    const labels = {
      director: 'DIRECCIÓN',
      directivo: 'DIRECTIVO',
      preceptor: 'PRECEPTORÍA',
      profesor: 'DOCENTE',
      admin: 'ADMINISTRACIÓN',
      jefe_area: 'JEFE DE ÁREA',
      jefe_preceptores: 'JEFE DE PRECEPTORES',
      jefe_departamento: 'JEFE DE DEPTO.',
      secretaria: 'SECRETARÍA',
      secretario: 'SECRETARÍA'
    };
    return labels[rol] || rol.toUpperCase();
  };

  // Obtener nombres de cursos seleccionados
  const obtenerNombresCursos = (ids) => {
    const cursoMap = Object.fromEntries(cursos.map(curso => [formatCursoLabel(curso), formatCursoLabel(curso)]));
    return ids.map(id => cursoMap[id] || id).filter(Boolean);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }

  // Crear nuevo comunicado
  const handleCrearComunicado = async (data) => {
      const body = {
        titulo: data.titulo,
        cuerpo: data.cuerpo,
        tipo_destinatario: stringifyDestinatarios(data.tipoDestinatario),
        cursos_seleccionados: data.cursosSeleccionados,
      }
      const r = await apiFetch(`${API_BASE}/comunicados/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const err = await r.json()
        throw new Error(Object.values(err).flat().join('. ') || 'Error al crear comunicado')
      }
      const nuevo = await r.json()
      setComunicados(prev => [apiComunicadoAFormatoLocal(nuevo), ...prev])
      setSuccessMessage('Comunicado enviado exitosamente!')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
  };

  // Editar comunicado
  const handleEditarComunicado = async (data) => {
      const body = {
        titulo: data.titulo,
        cuerpo: data.cuerpo,
        tipo_destinatario: stringifyDestinatarios(data.tipoDestinatario),
        cursos_seleccionados: data.cursosSeleccionados,
      }
      const r = await apiFetch(`${API_BASE}/comunicados/${editingComunicado.id}/`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const err = await r.json()
        throw new Error(Object.values(err).flat().join('. ') || 'Error al actualizar comunicado')
      }
      await cargarComunicados()
      setSuccessMessage('Comunicado actualizado exitosamente!')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
  };

  // Eliminar comunicado
  const handleEliminarComunicado = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este comunicado?')) return
    try {
      const r = await apiFetch(`${API_BASE}/comunicados/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!r.ok) throw new Error('Error al eliminar comunicado')
      setComunicados(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      alert(err.message)
    }
  };

  // Verificar permiso para editar
  const puedeEditar = (comunicado) => {
    if (esAdmin) return true;
    return comunicado.nombreCreador === username;
  };

  // Verificar permiso para eliminar
  const puedeEliminar = (comunicado) => {
    if (esAdmin) return true;
    return comunicado.nombreCreador === username;
  };

  return (
    <div className="sh-layout">
      {/* Sidebar */}
      <aside className={`sh-sidebar ${sidebarOpen ? 'sh-sidebar--open' : ''}`}>
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
            <ArrowLeft size={20} />
          </button>
        </div>

        <nav className="sh-nav" ref={navRef} onScroll={handleNavScroll}>
          {(navSections && navSections.length > 0) ? (
            navSections.map((section) => (
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
                        className={`sh-nav-item ${item.id === 'comunicados' ? 'sh-nav-item--active' : ''}`}
                        onClick={() => {
                          onNav(item.id);
                          setSidebarOpen(false);
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
              {(navItems || []).map((item) => {
                const IconComponent = item.icon || item.Icon;
                return (
                  <button
                    key={item.id}
                    className={`sh-nav-item ${item.id === 'comunicados' ? 'sh-nav-item--active' : ''}`}
                    onClick={() => {
                      onNav(item.id);
                      setSidebarOpen(false);
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
            <div className="sh-user-avatar">{username.charAt(0).toUpperCase()}</div>
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
                  {(roles || []).map((r) => (
                    <button key={r} className={`sh-role-dropdown-item ${r.toLowerCase() === userRole?.toLowerCase() ? 'sh-role-dropdown-item--active' : ''}`}
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

      {/* Main content */}
      <main className="sh-main">
        {/* Barra superior móvil */}
        <div className="sh-mobile-topbar">
          <button className="sh-hamburger" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="sh-topbar-brand">
            <img src="https://eestn1.com.ar/src/assets/img/logo.webp" className="sh-topbar-logo" alt="logo" />
            <span className="sh-topbar-name">EEST N°1</span>
          </div>
          <div className="sh-mobile-topbar-actions">
            <button className="sh-desktop-topbar-notif" onClick={() => onNav('chat')} aria-label="Abrir chat">
              <MessageSquare size={20} />
            </button>
            <NotificationBell />
            <div className="sh-mobile-topbar-user">
              <div className="sh-user-avatar">{username.charAt(0).toUpperCase()}</div>
              <span className="sh-mobile-username">{username}</span>
            </div>
          </div>
        </div>

        <header className="sh-desktop-topbar">
          <div className="sh-desktop-topbar-title">
            <img src="https://eestn1.com.ar/src/assets/img/logo.webp" className="sh-desktop-topbar-logo" alt="logo" />
            E.E.S.T. N°1 — Comunicados
          </div>
          <div className="sh-desktop-topbar-actions">
            <button className="sh-desktop-topbar-notif" onClick={() => onNav('chat')} aria-label="Abrir chat">
              <MessageSquare size={20} />
            </button>
            <NotificationBell />
            <div className="sh-desktop-topbar-user">
              <div className="sh-user-avatar">{username.charAt(0).toUpperCase()}</div>
              <span className="sh-user-name-desktop">{username}</span>
            </div>
          </div>
        </header>

        <div className="sh-content">
          <div className="sh-page">

        <div className="sh-hero">
          <div className="sh-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <h2 className="sh-hero-title">Gestión de Comunicados</h2>
              <p className="sh-hero-subtitle">
                {comunicadosFiltrados.length} comunicado{comunicadosFiltrados.length !== 1 ? 's' : ''} · {new Date().toLocaleDateString('es-AR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                }).replace(/^\w/, c => c.toUpperCase())}
              </p>
            </div>
          </div>
        </div>

          {showSuccess && (
            <div className="com-success" style={{ marginBottom: '16px' }}>
              <CheckCircle2 size={20} />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="com-header">
            <div className="com-header-left">
              <div>
                <p className="com-subtitle" style={{ margin: 0 }}>
                  {puedeCrear 
                    ? 'Crea y gestiona comunicados para la comunidad educativa'
                    : 'Visualiza los comunicados importantes'
                  }
                </p>
              </div>
            </div>
            {puedeCrear && (
              <button
                className="com-btn com-btn-primary com-btn-large"
                onClick={() => setShowModal(true)}
              >
                <Plus size={18} /> Nuevo Comunicado
              </button>
            )}
          </div>

          <div className="com-list">
            {loadError && <p role="alert">{loadError}</p>}
            {loading ? (
              <p className="sh-empty-text" style={{ textAlign: 'center', padding: '3rem' }}>Cargando comunicados...</p>
            ) : comunicadosFiltrados.length === 0 ? (
              <div className="com-empty">
                <MessageSquare size={48} style={{ color: '#d1d5db', marginBottom: '16px' }} />
                <p>No hay comunicados aún</p>
                {puedeCrear && (
                  <p className="com-empty-sub">Crea el primer comunicado para la comunidad</p>
                )}
              </div>
            ) : (
              comunicadosFiltrados.map(comunicado => (
                <div key={comunicado.id} className="com-card">
                  <div className="com-card-header">
                    <div className="com-card-header-left">
                      <span
                        className="com-role-badge"
                        style={{ backgroundColor: obtenerColorRol(comunicado.rolCreador) }}
                      >
                        {obtenerRolLabel(comunicado.rolCreador)}
                      </span>
                      <span className="com-author">{comunicado.nombreCreador}</span>
                    </div>
                    <div className="com-card-header-right">
                      <span className="com-date">{formatearFecha(comunicado.fecha)}</span>
                      <div className="com-card-actions">
                        {puedeEditar(comunicado) && (
                          <button
                            className="com-edit-btn tooltip"
                            data-tooltip="Editar comunicado"
                            onClick={() => {
                              setEditingComunicado(comunicado);
                              setShowModal(true);
                            }}
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {puedeEliminar(comunicado) && (
                          <button
                            className="com-delete-btn tooltip"
                            data-tooltip="Eliminar comunicado"
                            onClick={() => handleEliminarComunicado(comunicado.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <h3 className="com-card-title">{comunicado.titulo}</h3>
                  <p className="com-card-body">{comunicado.cuerpo}</p>

                  <div className="com-card-footer">
                    <div className="com-destinatario-tag">
                      <Users size={14} />
                      <span>{obtenerDestinatarioLabel(comunicado.tipoDestinatario)}</span>
                    </div>
                    {comunicado.cursosSeleccionados && comunicado.cursosSeleccionados.length > 0 && (
                      <div className="com-cursos-tags">
                        {obtenerNombresCursos(comunicado.cursosSeleccionados).map((curso, idx) => (
                          <span key={idx} className="com-curso-tag">{curso}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </div>
      </main>

      {showModal && (
        <ModalComunicado
          onClose={() => {
            setShowModal(false);
            setEditingComunicado(null);
          }}
          onSave={editingComunicado ? handleEditarComunicado : handleCrearComunicado}
          initialData={editingComunicado ? {
            titulo: editingComunicado.titulo,
            cuerpo: editingComunicado.cuerpo,
            fechaPublicacion: editingComunicado.fechaPublicacion,
            tipoDestinatario: editingComunicado.tipoDestinatario,
            cursosSeleccionados: editingComunicado.cursosSeleccionados
          } : null}
          userRole={userRole}
          cursosAsignados={cursosAsignados}
          cursos={cursos}
        />
      )}
    </div>
  );
}

export default Comunicados;
