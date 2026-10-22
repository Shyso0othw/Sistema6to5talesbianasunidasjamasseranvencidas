/**
 * Frontend permissions helper - mirrors backend permissions.py
 * Uses user roles from localStorage/sessionStorage
 */

export const ROLE_PERMISSIONS = {
  canManageUsers: ['admin', 'secretario', 'director', 'directivo', 'jefe_area', 'jefe_departamento', 'jefe_preceptores'],
  canManagePersonalStaff: ['admin', 'secretario', 'director', 'directivo'],
  canCreateEvent: ['admin', 'secretario', 'director', 'directivo', 'jefe_area', 'preceptor', 'jefe_preceptores', 'jefe_departamento'],
  canEditEvent: ['preceptor', 'admin', 'secretario', 'director', 'directivo', 'jefe_area', 'jefe_preceptores'],
  canDeleteEvent: ['admin', 'secretario', 'director', 'directivo', 'jefe_area', 'jefe_preceptores'],
  canManageComunicados: ['preceptor', 'director', 'directivo', 'admin', 'secretario', 'profesor', 'jefe_area', 'jefe_preceptores', 'jefe_departamento'],
  canManageAcademic: ['profesor', 'preceptor', 'director', 'directivo', 'admin', 'secretario'],
  canManageHorarios: ['admin', 'secretario', 'director', 'directivo', 'jefe_area', 'jefe_departamento'],
  canViewHorarios: ['admin', 'secretario', 'director', 'directivo', 'jefe_area', 'jefe_departamento', 'jefe_preceptores', 'preceptor', 'profesor', 'estudiante', 'familia', 'bibliotecario', 'auxiliar', 'ematp', 'eoe'],
  canManageLibrary: ['admin', 'bibliotecario'],
  canManageAsistenciaPersonal: ['admin', 'secretario', 'director', 'directivo'],
}

export function getUserRoles() {
  const rolesStr = localStorage.getItem('roles') || sessionStorage.getItem('roles') || '[]'
  try {
    const roles = JSON.parse(rolesStr)
    if (Array.isArray(roles) && roles.length) return roles
    const role = localStorage.getItem('rol') || sessionStorage.getItem('rol') || ''
    return role ? [role] : []
  } catch {
    const singleRole = localStorage.getItem('rol') || sessionStorage.getItem('rol') || ''
    return singleRole ? [singleRole] : []
  }
}

export function normalizeRole(rol) {
  const ROLE_ALIASES = {
    'administrador': 'admin',
    'preceptoria': 'preceptor',
    'docente': 'profesor',
    'familias': 'familia',
    'directivo': 'director',
    'vicedirector': 'vicedirector',
    'secretaria': 'secretario',
    'j_preceptores': 'jefe_preceptores',
    'jefe_de_preceptores': 'jefe_preceptores',
    'eoe': 'eoe',
  }
  const n = (rol || '').toLowerCase().trim()
  return ROLE_ALIASES[n] || n
}

export function hasPermission(permissionKey) {
  const userRoles = getUserRoles().map(normalizeRole)
  const allowedRoles = ROLE_PERMISSIONS[permissionKey] || []
  return userRoles.some(r => allowedRoles.includes(r) || (r === 'vicedirector' && allowedRoles.includes('director')))
}

export function hasAnyPermission(permissionKeys) {
  return permissionKeys.some(key => hasPermission(key))
}
const BASE_ASSIGNMENTS = ['profesor','preceptor','estudiante','familia','auxiliar','bibliotecario','ematp','eoe']
const ALL_ASSIGNMENTS = [...BASE_ASSIGNMENTS,'admin','director','vicedirector','secretario','jefe_area','jefe_departamento','jefe_preceptores']
export function allowedAssignments(roles = getUserRoles()) {
  const matrix = {
    admin: ALL_ASSIGNMENTS,
    director: ALL_ASSIGNMENTS.filter(r => !['admin','director','vicedirector'].includes(r)),
    vicedirector: ALL_ASSIGNMENTS.filter(r => !['admin','director','vicedirector'].includes(r)),
    secretario: BASE_ASSIGNMENTS,
    jefe_area: ['profesor','estudiante','familia'],
    jefe_departamento: ['profesor','estudiante','familia'],
    jefe_preceptores: ['preceptor','estudiante','familia'],
  }
  return new Set(roles.flatMap(role => matrix[normalizeRole(role)] || []))
}
