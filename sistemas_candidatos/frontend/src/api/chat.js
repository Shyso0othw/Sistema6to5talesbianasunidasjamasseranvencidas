import { apiFetch } from './http.js'
import { API_BASE } from '../config';

const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `Bearer ${token}`,
});

export async function fetchContactos(token) {
  const response = await apiFetch(`${API_BASE}/usuarios/`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error('Error fetching contactos');
  return response.json();
}

export async function fetchMensajes(token, userId, { beforeId, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (beforeId) params.append('before_id', beforeId);
  if (limit) params.append('limit', limit);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await apiFetch(`${API_BASE}/chat/${userId}/${query}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error('Error fetching mensajes');
  return response.json();
}

export async function fetchGrupos(token) {
  const response = await apiFetch(`${API_BASE}/chat/grupos/`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error('Error fetching grupos');
  return response.json();
}

export async function createGrupo(token, data) {
  const response = await apiFetch(`${API_BASE}/chat/grupos/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(Object.values(err).flat().join('. ') || 'Error al crear grupo');
  }
  return response.json();
}

export async function fetchGrupoMensajes(token, grupoId, { beforeId, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (beforeId) params.append('before_id', beforeId);
  if (limit) params.append('limit', limit);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await apiFetch(`${API_BASE}/chat/grupos/${grupoId}/${query}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error('Error fetching mensajes del grupo');
  return response.json();
}

export async function fetchDashboardStats(token) {
  const response = await apiFetch(`${API_BASE}/dashboard/stats/`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error('Error fetching dashboard stats');
  return response.json();
}

export async function fetchComunicados(token) {
  const response = await apiFetch(`${API_BASE}/comunicados/`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error('Error fetching comunicados');
  return response.json();
}

export async function fetchDocentes(token) {
  const response = await apiFetch(`${API_BASE}/docentes/`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error('Error fetching docentes');
  return response.json();
}

export async function fetchMaterias(token) {
  const response = await apiFetch(`${API_BASE}/materias/`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error('Error fetching materias');
  return response.json();
}

export async function fetchPerfil(token) {
  const response = await apiFetch(`${API_BASE}/perfil/`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error('Error fetching perfil');
  return response.json();
}

export async function fetchHorarios(token) {
  const response = await apiFetch(`${API_BASE}/horarios/`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error('Error fetching horarios');
  return response.json();
}

export async function fetchCursos(token) {
  const response = await apiFetch(`${API_BASE}/cursos/`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error('Error fetching cursos');
  return response.json();
}

export async function fetchAlumnos(token) {
  const response = await apiFetch(`${API_BASE}/alumnos/`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error('Error fetching alumnos');
  return response.json();
}
