import { apiFetch } from './http.js'
import { API_BASE } from '../config';

const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const headers = () => {
  const t = getToken();
  const h = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
};

export const fetchNotas = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const r = await apiFetch(`${API_BASE}/notas/${qs ? '?' + qs : ''}`, { headers: headers() });
  if (!r.ok) throw new Error('Error al cargar notas');
  return r.json();
};

export const createNota = async (data) => {
  const r = await apiFetch(`${API_BASE}/notas/`, { method: 'POST', headers: headers(), body: JSON.stringify(data) });
  if (!r.ok) { const e = await r.json(); throw new Error(Object.values(e).flat().join('. ') || 'Error al crear nota'); }
  return r.json();
};

export const updateNota = async (id, data) => {
  const r = await apiFetch(`${API_BASE}/notas/${id}/`, { method: 'PUT', headers: headers(), body: JSON.stringify(data) });
  if (!r.ok) { const e = await r.json(); throw new Error(Object.values(e).flat().join('. ') || 'Error al actualizar nota'); }
  return r.json();
};

export const deleteNota = async (id) => {
  const r = await apiFetch(`${API_BASE}/notas/${id}/`, { method: 'DELETE', headers: headers() });
  if (!r.ok) throw new Error('Error al eliminar nota');
};

export const fetchAsistencias = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const r = await apiFetch(`${API_BASE}/asistencias/${qs ? '?' + qs : ''}`, { headers: headers() });
  if (!r.ok) throw new Error('Error al cargar asistencias');
  return r.json();
};

export const createAsistencia = async (data) => {
  const r = await apiFetch(`${API_BASE}/asistencias/`, { method: 'POST', headers: headers(), body: JSON.stringify(data) });
  if (!r.ok) { const e = await r.json(); throw new Error(Object.values(e).flat().join('. ') || 'Error al crear asistencia'); }
  return r.json();
};

export const updateAsistencia = async (id, data) => {
  const r = await apiFetch(`${API_BASE}/asistencias/${id}/`, { method: 'PUT', headers: headers(), body: JSON.stringify(data) });
  if (!r.ok) { const e = await r.json(); throw new Error(Object.values(e).flat().join('. ') || 'Error al actualizar asistencia'); }
  return r.json();
};

export const deleteAsistencia = async (id) => {
  const r = await apiFetch(`${API_BASE}/asistencias/${id}/`, { method: 'DELETE', headers: headers() });
  if (!r.ok) throw new Error('Error al eliminar asistencia');
};
