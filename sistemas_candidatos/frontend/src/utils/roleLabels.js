export const ROLE_LABELS = {
  estudiante: "Estudiante",
  preceptor: "Preceptoría",
  preceptoria: "Preceptoría",
  admin: "Administrador",
  administrador: "Administrador",
  profesor: "Docente",
  docente: "Docente",
  familia: "Familia",
  familias: "Familia",
  director: "Dirección",
  directivo: "Dirección",
  vicedirector: "Vice Dirección",
  secretario: "Secretaría / Dirección",
  secretaria: "Secretaría / Dirección",
  jefe_area: "Jefe de Área",
  jefe_preceptores: "Jefe de Preceptores",
  j_preceptores: "Jefe de Preceptores",
  jefe_departamento: "Jefe de Departamento",
  ematp: "EMATP",
  auxiliar: "Auxiliar",
  bibliotecario: "Bibliotecario/a",
  eoe: "Equipo de Orientación",
}

export const getRoleLabel = (rol = "") => {
  if (!rol) return ""
  return ROLE_LABELS[rol.toLowerCase()] || rol
}
