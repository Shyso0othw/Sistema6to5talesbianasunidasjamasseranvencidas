import { apiFetch } from '../../api/http.js'
/*
  CalendarioPreceptoria.jsx
  Calendario con permisos de Preceptoría.
  Modal: Título, Descripción, Fecha, Hora inicio/fin, Lugar, Ciclo, Cursos (radio).
*/
/*
  CalendarioPreceptoria.jsx
  Calendario con permisos de Preceptoría.
  Modal: Título, Descripción, Fecha, Hora inicio/fin, Lugar, Ciclo, Cursos (radio).
*/
import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import "../../shared.css";
import '../../components/specific/CalendarioVisualizer.css';
import './CalendarioDireccion.css';
import './CalendarioPreceptoria.css';
import { CalendarioBase } from '../../components/specific/CalendarioVisualizer';
import { fetchEvents, createEvent, updateEvent, deleteEvent } from "../../api/events";
import { API_BASE } from "../../config";
import { eventBus } from '../../stores/eventBus';

const LUGARES = ["Salón de Actos","Aula Magna","Patio Central","Sala de Reuniones","Biblioteca","Aula 12","Aula 8","Laboratorio","Gimnasio","Otro"];

const formatCursoLabel = (curso) => `${curso.año}° ${curso.division}`;

function ModalPreceptoria({ onClose, onSave, initialData = null, cursos = [] }) {
  const [storedForm, setForm] = useState(
    initialData ? {
      titulo: initialData.titulo || "",
      descripcion: initialData.descripcion || "",
      fecha: initialData.fecha ? (typeof initialData.fecha === 'string' ? initialData.fecha : initialData.fecha.toISOString().split('T')[0]) : "",
      horaInicio: initialData.hora_inicio || "",
      horaFin: initialData.hora_fin || "",
      lugar: initialData.lugar || "",
      lugarPersonalizado: "",
      destinatarios: initialData.ciclo
        ? initialData.ciclo.split(',').map(s => s.trim())
        : initialData.curso ? ["cursos"] : ["todos"],
      cursosSeleccionados: null,
    } : {
      titulo: "",
      descripcion: "",
      fecha: "",
      horaInicio: "",
      horaFin: "",
      lugar: "",
      lugarPersonalizado: "",
      destinatarios: ["todos"],
      cursosSeleccionados: []
    }
  );
  const [error, setError] = useState("");

  const isEditing = !!initialData;
  const submitLock = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const form = {...storedForm, cursosSeleccionados: storedForm.cursosSeleccionados ?? cursos.filter(c => (initialData?.curso || '').split(',').some(label => label.replace(/\s/g,'') === formatCursoLabel(c).replace(/\s/g,''))).map(c => c.id)};

  const toggleCurso = (id) => {
    set("cursosSeleccionados",
      form.cursosSeleccionados.includes(id)
        ? form.cursosSeleccionados.filter(c => c !== id)
        : [...form.cursosSeleccionados, id]
    );
  };

  const toggleDestinatario = (valor) => {
    setForm(prev => {
      let next = [...prev.destinatarios]
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
      return { ...prev, destinatarios: next, ...((valor === 'todos' || (!next.includes('cursos') && valor === 'cursos')) ? { cursosSeleccionados: [] } : {}) }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLock.current) return;
    setError("");

    if (!form.titulo.trim()) {
      setError("Por favor, completa el título del evento.");
      return;
    }
    if (!form.fecha) {
      setError("Por favor, selecciona una fecha.");
      return;
    }

    if (form.destinatarios.includes("cursos") && form.cursosSeleccionados.length === 0) {
      setError("Por favor, selecciona al menos un curso.");
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo crear el evento.");
    } finally { submitLock.current = false; setSubmitting(false); }
  };

  const allCursos = cursos.map(curso => ({
    id: curso.id,
    label: formatCursoLabel(curso),
    ciclo: curso.año >= 4 ? 'superior' : 'basico',
  }));
  const cursosBasicos = allCursos.filter(curso => curso.ciclo === 'basico');
  const cursosSuperiores = allCursos.filter(curso => curso.ciclo === 'superior');
  const mostrarCursos = form.destinatarios.includes("cursos");
  const mostrarLugarPersonalizado = form.lugar === "Otro";

  return (
    <div className="cd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cd-modal cd-modal-largo">
        <div className="cd-modal-header">
          <h2 className="cd-modal-title">{isEditing ? "Editar Evento" : "Nuevo Evento"} — Preceptoría</h2>
          <button className="cd-modal-close tooltip" data-tooltip="Cerrar modal" onClick={onClose}><X size={18} /></button>
        </div>

        {error && <div className="cd-error">{error}</div>}

        <form onSubmit={handleSubmit} className="cd-form">
          <div className="cd-field">
            <label className="cd-label">Título <span style={{color: "#e74c3c"}}>*</span></label>
            <input className="cd-input tooltip" data-tooltip="Ingrese el título del evento" placeholder="Ej: Entrega de libretas"
              value={form.titulo} onChange={e => set("titulo", e.target.value)} required />
          </div>

          <div className="cd-field">
            <label className="cd-label">Descripción <span className="cd-optional">(opcional)</span></label>
            <textarea className="cd-textarea tooltip" data-tooltip="Ingrese detalles del evento" placeholder="Detalles..."
              value={form.descripcion} onChange={e => set("descripcion", e.target.value)} />
          </div>

          <div className="cd-field">
            <label className="cd-label">Fecha <span style={{color: "#e74c3c"}}>*</span></label>
            <input className="tooltip cd-input" data-tooltip="Seleccione la fecha del evento" type="date"
              value={form.fecha} onChange={e => set("fecha", e.target.value)} required />
          </div>

          <div className="cd-row">
            <div className="cd-field">
              <label className="cd-label">Hora inicio <span className="cd-optional">(opcional)</span></label>
              <input className="tooltip cd-input" data-tooltip="Seleccione la hora de inicio" type="time"
                value={form.horaInicio} onChange={e => set("horaInicio", e.target.value)} />
            </div>
            <div className="cd-field">
              <label className="cd-label">Hora fin <span className="cd-optional">(opcional)</span></label>
              <input className="tooltip cd-input" data-tooltip="Seleccione la hora de fin" type="time"
                value={form.horaFin} onChange={e => set("horaFin", e.target.value)} />
            </div>
          </div>

          <div className="cd-field">
            <label className="cd-label">Lugar <span className="cd-optional">(opcional)</span></label>
            <select className="cd-select tooltip" data-tooltip="Seleccione el lugar del evento" value={form.lugar} onChange={e => set("lugar", e.target.value)}>
              <option value="">Seleccionar lugar</option>
              {LUGARES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Lugar personalizado cuando se selecciona "Otro" */}
          {mostrarLugarPersonalizado && (
            <div className="cd-field">
              <label className="cd-label">Especificar lugar <span style={{color: "#e74c3c"}}>*</span></label>
              <input className="cd-input tooltip" data-tooltip="Escriba el nombre del lugar" placeholder="Ej: Sala de profesores"
                value={form.lugarPersonalizado} onChange={e => set("lugarPersonalizado", e.target.value)} required />
            </div>
          )}

          {/* Sección de Destinatarios */}
          <div className="cd-field">
            <label className="cd-label">Destinatarios <span style={{color: "#e74c3c"}}>*</span></label>
            <div className="cd-destinatarios-opciones">
              <label className="cd-checkbox-label tooltip" data-tooltip="Todos los cursos del colegio">
                <input
                  type="checkbox"
                  name="destinatarios"
                  value="todos"
                  checked={form.destinatarios.includes("todos")}
                  onChange={() => toggleDestinatario("todos")}
                />
                <span>Todos los cursos</span>
              </label>
              <label className="cd-checkbox-label tooltip" data-tooltip="Solo ciclo básico">
                <input
                  type="checkbox"
                  name="destinatarios"
                  value="basico"
                  checked={form.destinatarios.includes("basico")}
                  onChange={() => toggleDestinatario("basico")}
                />
                <span>Ciclo Básico</span>
              </label>
              <label className="cd-checkbox-label tooltip" data-tooltip="Solo ciclo superior">
                <input
                  type="checkbox"
                  name="destinatarios"
                  value="superior"
                  checked={form.destinatarios.includes("superior")}
                  onChange={() => toggleDestinatario("superior")}
                />
                <span>Ciclo Superior</span>
              </label>
              <label className="cd-checkbox-label tooltip" data-tooltip="Seleccionar cursos específicos">
                <input
                  type="checkbox"
                  name="destinatarios"
                  value="cursos"
                  checked={form.destinatarios.includes("cursos")}
                  onChange={() => toggleDestinatario("cursos")}
                />
                <span>Cursos específicos</span>
              </label>
            </div>
          </div>

          {/* Grid de cursos cuando se selecciona "Cursos específicos" */}
          {mostrarCursos && (
            <>
              <div className="cd-field">
                <label className="cd-label">Ciclo Básico</label>
                <div className="cd-cursos-grid">
                  {cursosBasicos.map(curso => (
                    <label key={curso.id} className="cd-checkbox-label tooltip" data-tooltip={`Seleccionar curso ${curso.label}`}>
                      <input
                        type="checkbox"
                        checked={form.cursosSeleccionados.includes(curso.id)}
                        onChange={() => toggleCurso(curso.id)}
                      />
                      <span>{curso.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="cd-field">
                <label className="cd-label">Ciclo Superior</label>
                <div className="cd-cursos-grid">
                  {cursosSuperiores.map(curso => (
                    <label key={curso.id} className="cd-checkbox-label tooltip" data-tooltip={`Seleccionar curso ${curso.label}`}>
                      <input
                        type="checkbox"
                        checked={form.cursosSeleccionados.includes(curso.id)}
                        onChange={() => toggleCurso(curso.id)}
                      />
                      <span>{curso.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="cd-submit-wrap">
            <button type="submit" disabled={submitting} className="cd-btn-submit tooltip" data-tooltip={isEditing ? "Guardar cambios" : "Crear nuevo evento"}>{isEditing ? "Guardar Cambios" : "Crear Evento"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CalendarioPreceptoria({
  onLogout,
  username,
  navItems,
  navSections,
  navTitle,
  schoolSubs,
  activeNav,
  onNav,
  roles,
  onSwitchRole,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [, setLoading] = useState(true);
  const [cursos, setCursos] = useState([]);

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

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    const headers = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    apiFetch(`${API_BASE}/cursos/`, { headers })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setCursos(data || []))
      .catch((err) => {
        console.error('Error cargando cursos:', err);
        setCursos([]);
      });
  }, []);

  const buildEventPayload = (data) => {
    let lugarFinal = data.lugar;
    if (data.lugar === "Otro" && data.lugarPersonalizado) {
      lugarFinal = data.lugarPersonalizado;
    }

    let ciclo = null;
    let curso = null;

    if (data.destinatarios.includes("todos")) {
      ciclo = "todos";
    } else {
      const ciclos = [];
      if (data.destinatarios.includes("basico")) ciclos.push("basico");
      if (data.destinatarios.includes("superior")) ciclos.push("superior");
      if (ciclos.length > 0) ciclo = ciclos.join(",");

      if (data.destinatarios.includes("cursos")) {
        const allCursos = cursos.map(curso => ({
          id: curso.id,
          label: formatCursoLabel(curso),
        }));
        curso = data.cursosSeleccionados
          .map(id => allCursos.find(c => c.id === id)?.label)
          .filter(Boolean)
          .join(", ");

        if (!ciclo) ciclo = "cursos";
      }
    }

    return {
      titulo: data.titulo,
      descripcion: data.descripcion,
      fecha: data.fecha,
      hora_inicio: data.horaInicio,
      hora_fin: data.horaFin,
      lugar: lugarFinal,
      ciclo,
      curso,
    };
  };

  const handleSave = async (data) => {
    const payload = buildEventPayload(data);
    if (editingEvent) {
      const updated = await updateEvent(editingEvent.id, payload);
      setEvents((prev) => prev.map(e => e.id === updated.id ? updated : e));
      setEditingEvent(null);
    } else {
      const created = await createEvent(payload);
      setEvents((prev) => [...prev.filter(event => event.id !== created.id), created]);
    }
  };



  const handleCloseModal = () => {
    setEditingEvent(null);
    setModalOpen(false);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setModalOpen(true);
  };

  const handleDeleteEvent = async (event) => {
    if (!window.confirm(`¿Eliminar el evento "${event.titulo}"?`)) return;
      await deleteEvent(event.id);
      setEvents((prev) => prev.filter(e => e.id !== event.id));
  };

  return (
    <>
      <CalendarioBase
        onLogout={onLogout}
        username={username}
        navItems={navItems}
        navSections={navSections}
        navTitle={navTitle}
        schoolSubs={schoolSubs}
        activeNav={activeNav}
        onNav={onNav}
        rolLabel="Preceptoría"
        legendaExtra="Preceptoría"
        canAddEvent={true}
        onAddEvent={() => setModalOpen(true)}
        onEditEvent={handleEditEvent}
        onDeleteEvent={handleDeleteEvent}
        canModifyEvent={(ev) => ev.tipo !== 'admin' && ev.tipo !== 'direccion'}
        events={events}
        roles={roles}
        onSwitchRole={onSwitchRole}
      />
      {modalOpen && (
        <ModalPreceptoria onClose={handleCloseModal} onSave={handleSave} initialData={editingEvent} cursos={cursos} />
      )}
    </>
  );
}
