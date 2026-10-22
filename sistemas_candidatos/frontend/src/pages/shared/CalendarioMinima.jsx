/*
  CalendarioMinima.jsx
  Calendario con permisos Mínimos (Docente).
  Modal: Título, Descripción, Fecha, Hora inicio/fin, Lugar, Cursos (radio).
  SIN campo Ciclo a diferencia de Preceptoría.
*/
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import "../../shared.css";
import '../../components/specific/CalendarioVisualizer.css';
import './CalendarioDireccion.css';
import './CalendarioPreceptoria.css';
import './CalendarioMinima.css';
import { CalendarioBase } from '../../components/specific/CalendarioVisualizer';
import { fetchEvents, createEvent, updateEvent, deleteEvent } from "../../api/events";
import { eventBus } from '../../stores/eventBus';

function ModalMinima({ onClose, onSave, initialData = null }) {
  const [form, setForm] = useState(
    initialData ? {
      titulo: initialData.titulo || "",
      descripcion: initialData.descripcion || "",
      fecha: initialData.fecha ? (typeof initialData.fecha === 'string' ? initialData.fecha : initialData.fecha.toISOString().split('T')[0]) : "",
      horaInicio: initialData.hora_inicio || "",
      horaFin: initialData.hora_fin || "",
      lugar: initialData.lugar || "",
    } : {
      titulo: "",
      descripcion: "",
      fecha: "",
      horaInicio: "",
      horaFin: "",
      lugar: ""
    }
  );
  const [error, setError] = useState("");
  const isEditing = !!initialData;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.titulo.trim()) {
      setError("Por favor, completa el título del evento.");
      return;
    }
    if (!form.fecha) {
      setError("Por favor, selecciona una fecha.");
      return;
    }

    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo crear el evento.");
    }
  };

  return (
    <div className="cd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cd-modal">
        <div className="cd-modal-header">
          <h2 className="cd-modal-title">{isEditing ? "Editar Evento" : "Nuevo Evento"}</h2>
          <button className="cd-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {error && <div className="cd-error">{error}</div>}

        <form onSubmit={handleSubmit} className="cd-form">
          <div className="cd-field">
            <label className="cd-label">Título <span style={{color: "#e74c3c"}}>*</span></label>
            <input className="cd-input" placeholder="Ej: Entrega de TPs"
              value={form.titulo} onChange={e => set("titulo", e.target.value)} required />
          </div>

          <div className="cd-field">
            <label className="cd-label">Descripción <span className="cd-optional">(opcional)</span></label>
            <textarea className="cd-textarea" placeholder="Detalles..."
              value={form.descripcion} onChange={e => set("descripcion", e.target.value)} />
          </div>

          <div className="cd-field">
            <label className="cd-label">Fecha <span style={{color: "#e74c3c"}}>*</span></label>
            <input type="date" className="cd-input"
              value={form.fecha} onChange={e => set("fecha", e.target.value)} required />
          </div>

          <div className="cd-row">
            <div className="cd-field">
              <label className="cd-label">Hora inicio <span className="cd-optional">(opcional)</span></label>
              <input type="time" className="cd-input"
                value={form.horaInicio} onChange={e => set("horaInicio", e.target.value)} />
            </div>
            <div className="cd-field">
              <label className="cd-label">Hora fin <span className="cd-optional">(opcional)</span></label>
              <input type="time" className="cd-input"
                value={form.horaFin} onChange={e => set("horaFin", e.target.value)} />
            </div>
          </div>

          <div className="cd-submit-wrap">
            <button type="submit" className="cd-btn-submit">{isEditing ? "Guardar Cambios" : "Crear Evento"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CalendarioMinima({
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

  const buildEventPayload = (data) => ({
    titulo: data.titulo,
    descripcion: data.descripcion,
    fecha: data.fecha,
    hora_inicio: data.horaInicio,
    hora_fin: data.horaFin,
    lugar: data.lugar,
  });

  const handleSave = async (data) => {
    const payload = buildEventPayload(data);
    if (editingEvent) {
      const updated = await updateEvent(editingEvent.id, payload);
      setEvents((prev) => prev.map(e => e.id === updated.id ? updated : e));
      setEditingEvent(null);
    } else {
      const created = await createEvent(payload);
      setEvents((prev) => [...prev, created]);
    }
  };

  const handleOpenModal = () => {
    setEditingEvent(null);
    setModalOpen(true);
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
    try {
      await deleteEvent(event.id);
      setEvents((prev) => prev.filter(e => e.id !== event.id));
    } catch (err) {
      alert(err.message);
    }
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
        rolLabel="Docente"
        legendaExtra=""
        canAddEvent={false}
        canModifyEvent={() => false}
        onAddEvent={handleOpenModal}
        onEditEvent={handleEditEvent}
        onDeleteEvent={handleDeleteEvent}
        events={events}
        roles={roles}
        onSwitchRole={onSwitchRole}
      />
      {modalOpen && (
        <ModalMinima onClose={handleCloseModal} onSave={handleSave} initialData={editingEvent} />
      )}
    </>
  );
}
