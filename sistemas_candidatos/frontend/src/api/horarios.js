import { apiFetch } from './http.js'
import { API_BASE } from '../config'

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''

const authHeaders = (includeJson = true) => {
  const headers = {}
  if (includeJson) {
    headers['Content-Type'] = 'application/json'
    headers['Accept'] = 'application/json'
  }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export const fetchCursos = async () => {
  const response = await apiFetch(`${API_BASE}/cursos/`, {
    headers: authHeaders(false),
  })
  if (!response.ok) {
    throw new Error('No se pudieron cargar los cursos')
  }
  return response.json()
}

export const fetchPerfil = async () => {
  const response = await apiFetch(`${API_BASE}/perfil/`, {
    headers: authHeaders(false),
  })
  if (!response.ok) {
    throw new Error('No se pudo cargar el perfil')
  }
  return response.json()
}

export const fetchHorariosPorCurso = async (cursoId) => {
  if (!cursoId) {
    return []
  }
  const response = await apiFetch(`${API_BASE}/horarios/?curso=${cursoId}`, {
    headers: authHeaders(false),
  })
  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || 'No se pudieron cargar los horarios')
  }
  const data = await response.json()
  return data.map(mapHorarioItem)
}

export const mapHorarioItem = (item) => ({
  id: item.id,
  dia: item.dia,
  franja: item.franja,
  materia: item.materia_nombre || item.materia || '',
  profesor: item.profesor_nombre || '',
  aula: item.aula || '',
  curso_nombre: item.curso_nombre || '',
})

export const getCursoLabel = (curso) => {
  if (!curso) {
    return ''
  }
  const division = curso.division || ''
  const carrera = curso.carrera ? ` - ${curso.carrera}` : ''
  return `${curso.año}° ${division}${carrera}`.trim()
}

export const findCursoByAñoDivision = (cursos, año, division) => {
  if (!cursos || !año || !division) {
    return null
  }
  return cursos.find((curso) => {
    return Number(curso['año']) === Number(año) && String(curso.division).toLowerCase() === String(division).toLowerCase()
  }) || null
}
