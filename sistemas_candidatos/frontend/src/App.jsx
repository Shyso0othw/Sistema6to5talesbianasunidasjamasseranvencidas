import { API_BASE } from './config'
import { apiFetch } from './api/http.js'
import { useState, useEffect, useRef } from "react"
import { useNotifications } from './hooks/useNotifications'
import { notificationStore } from './stores/notificationStore'
import { eventBus } from './stores/eventBus'
import { Home, BookOpen, Book, ClipboardCheck, CalendarDays, ClipboardList, MessageSquare, User, LayoutDashboard, Users, Clock, FileBarChart, Bell, FolderOpen, PhoneCall, BarChart3, History, Bookmark, GraduationCap, UserCheck, UserCog, Briefcase, Activity, Settings, UserPlus, Mail } from "lucide-react";

import Login from "./pages/auth/Login"
import Dashboard from "./pages/estudiante/Dashboard"
import PreceptorDashboard from "./pages/preceptor/preceptordashboard"
import AdminDashboard from "./pages/admin/AdminDashboard"
import DocentesDashboard from "./pages/docente/DocentesDashboard"
import FamiliaDashboard from "./pages/familia/FamiliaDashboard"
import DirectorDashboard from "./pages/directivos/DirectorDashboard"
import SecretariaDireccion from "./pages/directivos/SecretariaDireccion"
import JefeArea from "./pages/directivos/JefeArea"
import JefePreceptoresDashboard from "./pages/directivos/JefepreceptoresDashboard"
import JefeDepartamento from "./pages/directivos/jefededepartamento"
import EmatpDashboard from "./pages/directivos/EmatpDashboard"
import AuxiliaresDashboard from "./pages/shared/AuxiliaresDashboard"
import BibliotecaDashboard from "./pages/biblioteca/biblioteca"
import EOEDashboard from "./pages/directivos/eoedashboard"
import CalendarioVisualizer from "./components/specific/CalendarioVisualizer"
import CalendarioDireccion from "./pages/shared/CalendarioDireccion"
import CalendarioPreceptoria from "./pages/shared/CalendarioPreceptoria"
import CalendarioMinima from "./pages/shared/CalendarioMinima"
import Comunicados from "./components/specific/Comunicados"


import "./App.css"
import "./shared.css"

const NAV_ESTUDIANTE = [
  { id: "inicio", icon: Home, label: "Inicio" },
  { id: "notas", icon: BookOpen, label: "Notas" },
  { id: "asistencia", icon: ClipboardCheck, label: "Asistencia" },
  { id: "horario", icon: Clock, label: "Horario" },
  { id: "eventos", icon: CalendarDays, label: "Calendario" },
  { id: "prestamos", icon: BookOpen, label: "Préstamos" },
  { id: "comunicados", icon: Mail, label: "Comunicados" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "perfil", icon: User, label: "Perfil" },
]

const NAV_PRECEPTOR = [
  { id: "inicio", icon: LayoutDashboard, label: "Inicio" },
  { id: "comunicados", icon: Mail, label: "Comunicados" },
  { id: "asistencia", icon: ClipboardCheck, label: "Asistencia" },
  { id: "carga-notas", icon: BookOpen, label: "Carga Notas" },
  { id: "horarios", icon: Clock, label: "Horarios" },
  { id: "eventos", icon: CalendarDays, label: "Calendario" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "perfil", icon: User, label: "Perfil" },
]

const NAV_DOCENTE = [
  { id: "inicio", icon: Home, label: "Inicio" },
  { id: "comunicados", icon: Mail, label: "Comunicados" },
  { id: "asistencia", icon: ClipboardCheck, label: "Asistencia" },
  { id: "notas", icon: BookOpen, label: "Notas" },
  { id: "mis-cursos", icon: FolderOpen, label: "Mis Cursos" },
  { id: "prestamos", icon: BookOpen, label: "Préstamos" },
  { id: "eventos", icon: CalendarDays, label: "Calendario" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "perfil", icon: User, label: "Perfil" },
]

const NAV_FAMILIA = [
  { id: "inicio", icon: Home, label: "Inicio" },
  { id: "comunicados", icon: Mail, label: "Comunicados" },
  { id: "notas", icon: BookOpen, label: "Notas" },
  { id: "asistencia", icon: ClipboardCheck, label: "Asistencia" },
  { id: "horario", icon: Clock, label: "Horario" },
  { id: "eventos", icon: CalendarDays, label: "Calendario" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "perfil", icon: User, label: "Perfil" },
]

const NAV_ADMIN = [
  { id: "dashboard", icon: LayoutDashboard, label: "Inicio" },
  { id: "comunicados", icon: Mail, label: "Comunicados" },
  { id: "estudiantes", icon: GraduationCap, label: "Estudiantes" },
  { id: "docentes", icon: UserCheck, label: "Docentes" },
  { id: "preceptores", icon: UserCog, label: "Preceptores" },
  { id: "agregar-alumno", icon: UserPlus, label: "Agregar Alumno" },
  { id: "agregar-docente", icon: UserPlus, label: "Agregar Docente" },
  { id: "agregar-preceptor", icon: UserPlus, label: "Agregar Preceptor" },
  { id: "agregar-familia", icon: UserPlus, label: "Agregar Tutor/Fam." },
  { id: "tutores-familias", icon: Users, label: "Tutores / Familias" },
  { id: "crear-cuenta", icon: UserPlus, label: "Crear Cuenta" },
  { id: "cursos", icon: FolderOpen, label: "Cursos" },
  { id: "materias", icon: BookOpen, label: "Materias" },
  { id: "horarios", icon: Clock, label: "Horarios" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "reportes", icon: FileBarChart, label: "Reportes / Estad." },
  { id: "asistencia-personal", icon: ClipboardList, label: "Asistencia Personal" },
  { id: "carga-notas", icon: BookOpen, label: "Carga Notas" },
  { id: "carga-asistencia", icon: ClipboardCheck, label: "Carga Asistencia" },
  { id: "eventos", icon: CalendarDays, label: "Calendario" },
  { id: "configuracion", icon: Settings, label: "Configuración" },
]

const NAV_ADMIN_SECTIONS = [
  {
    id: "inicio",
    titulo: "INICIO",
    items: [
      { id: "dashboard", label: "Inicio", icon: LayoutDashboard },
    ]
  },
  {
    id: "control-usuarios",
    titulo: "CONTROL DE USUARIOS",
    items: [
      { id: "estudiantes", label: "Estudiantes", icon: GraduationCap },
      { id: "docentes", label: "Docentes", icon: UserCheck },
      { id: "preceptores", label: "Preceptores", icon: UserCog },
      { id: "personal", label: "Personal Staff", icon: Users },
      { id: "tutores-familias", label: "Tutores / Familias", icon: Users },
      { id: "agregar-usuario", label: "Agregar Usuario", icon: UserPlus },
    ]
  },
  {
    id: "control-institucional",
    titulo: "CONTROL INSTITUCIONAL",
    items: [
      { id: "orientaciones", label: "Orientaciones", icon: BookOpen },
      { id: "cursos", label: "Cursos", icon: FolderOpen },
      { id: "materias", label: "Materias", icon: BookOpen },
      { id: "horarios", label: "Horarios", icon: Clock },
    ]
  },
  {
    id: "academico",
    titulo: "ACADÉMICO",
    items: [
      { id: "asistencia-personal", label: "Asistencia Personal", icon: ClipboardList },
      { id: "carga-notas", label: "Carga Notas", icon: BookOpen },
      { id: "carga-asistencia", label: "Carga Asistencia", icon: ClipboardCheck },
    ]
  },
  {
    id: "gestion-reportes",
    titulo: "GESTIÓN Y REPORTES",
    items: [
      { id: "comunicados", label: "Comunicados", icon: Mail },
      { id: "chat", label: "Chat", icon: MessageSquare },
      { id: "reportes", label: "Reportes / Estad.", icon: FileBarChart },
      { id: "eventos", label: "Calendario", icon: CalendarDays },
      { id: "configuracion", label: "Configuración", icon: Settings },
    ]
  },
]

const NAV_SECRETARIA_DIRECCION = [
  { id: "dashboard", icon: LayoutDashboard, label: "Inicio" },
  { id: "comunicados", icon: Mail, label: "Comunicados" },
  { id: "estudiantes", icon: GraduationCap, label: "Estudiantes" },
  { id: "docentes", icon: UserCheck, label: "Docentes" },
  { id: "preceptores", icon: UserCog, label: "Preceptores" },
  { id: "tutores-familias", icon: Users, label: "Familias" },
  { id: "personal", icon: Briefcase, label: "Personal Staff" },
  { id: "carga-notas", icon: BookOpen, label: "Carga Notas" },
  { id: "carga-asistencia", icon: ClipboardCheck, label: "Carga Asistencia" },
  { id: "horarios", icon: Clock, label: "Horarios" },
  { id: "materias", icon: BookOpen, label: "Materias" },
  { id: "eventos", icon: CalendarDays, label: "Calendario" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "actividad-reciente", icon: Activity, label: "Actividad reciente" },
  { id: "perfil", icon: User, label: "Perfil" },
]

const NAV_DIRECTOR = [
  { id: "inicio", icon: LayoutDashboard, label: "Inicio" },
  { id: "comunicados", icon: Mail, label: "Comunicados" },
  { id: "estudiantes", icon: Users, label: "Estudiantes" },
  { id: "personal", icon: Users, label: "Personal" },
  { id: "reportes", icon: FileBarChart, label: "Reportes" },
  { id: "calendario", icon: CalendarDays, label: "Calendario" },
  { id: "alertas", icon: Bell, label: "Alertas" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
];

const NAV_JEFE_AREA = [
  { id: "inicio", icon: Home, label: "Inicio" },
  { id: "comunicados", icon: Mail, label: "Comunicados" },
  { id: "docentes", icon: Users, label: "Docentes" },
  { id: "horarios", icon: Clock, label: "Horarios" },
  { id: "calendario", icon: CalendarDays, label: "Calendario" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "perfil", icon: User, label: "Perfil" },
]

const NAV_JEFE_PRECEPTORES = [
  { id: "inicio", icon: Home, label: "Inicio" },
  { id: "comunicados", icon: Mail, label: "Comunicados" },
  { id: "asistencia", icon: ClipboardCheck, label: "Asistencia" },
  { id: "preceptores", icon: Users, label: "Preceptores" },
  { id: "cursos", icon: FolderOpen, label: "Cursos" },
  { id: "reportes", icon: FileBarChart, label: "Reportes" },
  { id: "citaciones", icon: PhoneCall, label: "Citaciones" },
  { id: "horarios", icon: Clock, label: "Horarios" },
  { id: "calendario", icon: CalendarDays, label: "Calendario" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "perfil", icon: User, label: "Perfil" },
]

const NAV_JEFE_DEPARTAMENTO = [
  { id: "inicio", icon: Home, label: "Inicio" },
  { id: "comunicados", icon: Mail, label: "Comunicados" },
  { id: "docentes", icon: Users, label: "Docentes" },
  { id: "horarios", icon: Clock, label: "Horarios" },
  { id: "calendario", icon: CalendarDays, label: "Calendario" },
  { id: "materias", icon: BookOpen, label: "Materias" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "perfil", icon: User, label: "Perfil" },
]

const NAV_EMATP = [
  { id: "inicio", icon: Home, label: "Inicio" },
  { id: "comunicados", icon: Mail, label: "Comunicados" },
  { id: "horarios", icon: Clock, label: "Horarios" },
  { id: "calendario", icon: CalendarDays, label: "Calendario" },
  { id: "cursos", icon: FolderOpen, label: "Cursos" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "perfil", icon: User, label: "Perfil" },
]

const NAV_EMATP_SECTIONS = [
  {
    titulo: "MENÚ PRINCIPAL",
    items: [
      { id: "inicio", icon: Home, label: "Inicio" },
      { id: "comunicados", icon: Mail, label: "Comunicados" },
      { id: "calendario", icon: CalendarDays, label: "Calendario" },
      { id: "horarios", icon: Clock, label: "Horarios" },
      { id: "cursos", icon: FolderOpen, label: "Cursos" },
      { id: "chat", icon: MessageSquare, label: "Chat" },
      { id: "perfil", icon: User, label: "Perfil" },
    ],
  },
]

const NAV_AUXILIAR = [
  { id: "inicio", icon: Home, label: "Inicio" },
  { id: "comunicados", icon: Mail, label: "Comunicados" },
  { id: "horarios", icon: Clock, label: "Horarios" },
  { id: "calendario", icon: CalendarDays, label: "Calendario" },
  { id: "cursos", icon: FolderOpen, label: "Cursos" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "perfil", icon: User, label: "Perfil" },
]

const NAV_SECRETARIA_SECTIONS = [
  {
    titulo: "MENÚ PRINCIPAL",
    items: [
      { id: "dashboard", icon: LayoutDashboard, label: "Inicio" },
      { id: "comunicados", icon: Mail, label: "Comunicados" },
      { id: "eventos", icon: CalendarDays, label: "Calendario" },
      { id: "estudiantes", icon: GraduationCap, label: "Estudiantes" },
      { id: "docentes", icon: UserCheck, label: "Docentes" },
      { id: "preceptores", icon: UserCog, label: "Preceptores" },
      { id: "tutores-familias", icon: Users, label: "Familias" },
      { id: "personal", icon: Users, label: "Personal Staff" },
      { id: "horarios", icon: Clock, label: "Horarios" },
      { id: "materias", icon: BookOpen, label: "Materias" },
      { id: "chat", icon: MessageSquare, label: "Chat" },
      { id: "actividad-reciente", icon: Activity, label: "Actividad reciente" },
      { id: "perfil", icon: User, label: "Perfil" },
    ],
  },
]

const NAV_BIBLIOTECA = [
  { id: "inicio", icon: LayoutDashboard, label: "Inicio" },
  { id: "comunicados", icon: Mail, label: "Comunicados" },
  { id: "calendario", icon: CalendarDays, label: "Calendario" },
  { id: "agregar-libro", icon: Book, label: "Agregar Libro" },
  { id: "todos-libros", icon: Book, label: "Todos los Libros" },
  { id: "prestamos", icon: Bookmark, label: "Préstamos" },
  { id: "cola-prestamos", icon: Clock, label: "Cola Préstamos" },
  { id: "lectores", icon: Users, label: "Lectores" },
  { id: "historial", icon: History, label: "Historial" },
  { id: "estadisticas", icon: BarChart3, label: "Estadísticas" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "perfil", icon: User, label: "Perfil" },
];

const NAV_EOE = [
  { id: "inicio", icon: Home, label: "Inicio" },
  { id: "comunicados", icon: Mail, label: "Comunicados" },
  { id: "horarios", icon: Clock, label: "Horarios" },
  { id: "cursos", icon: FolderOpen, label: "Cursos" },
  { id: "calendario", icon: CalendarDays, label: "Calendario" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "perfil", icon: User, label: "Perfil" },
]

const NAV_FALLBACK = [
  { id: "inicio", icon: Home, label: "Inicio" },
  { id: "calendario", icon: CalendarDays, label: "Calendario" },
]

const normalizeRole = (rol = "") => {
  const normalized = rol
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\s]/g, "_")
  
  // Mapeos específicos para que coincidan con nuestras claves internas
  const mapping = {
    'administrador': 'admin',
    'preceptoria': 'preceptor',
    'docente': 'profesor',
    'familia': 'familia',
    'familias': 'familia',
    'directivo': 'director',
    'secretaria': 'secretario',
    'jefe_de_preceptores': 'jefe_preceptores',
    'j_preceptores': 'jefe_preceptores',
  }
  
  return mapping[normalized] || normalized
}

const ROLES_DASHBOARD = {
  estudiante: Dashboard,
  preceptor: PreceptorDashboard,
  admin: AdminDashboard,
  profesor: DocentesDashboard,
  familia: FamiliaDashboard,
  familias: FamiliaDashboard,
  director: DirectorDashboard,
  vicedirector: DirectorDashboard,
  directivo: DirectorDashboard,
  secretario: SecretariaDireccion,
  secretaria: SecretariaDireccion,
  jefe_area: JefeArea,
  jefe_preceptores: JefePreceptoresDashboard,
  j_preceptores: JefePreceptoresDashboard,
  jefe_departamento: JefeDepartamento,
  ematp: EmatpDashboard,
  auxiliar: AuxiliaresDashboard,
  bibliotecario: BibliotecaDashboard,
  eoe: EOEDashboard,
}

const ROLES_NAVIGATION = {
  estudiante: NAV_ESTUDIANTE,
  preceptor: NAV_PRECEPTOR,
  admin: NAV_ADMIN,
  profesor: NAV_DOCENTE,
  familia: NAV_FAMILIA,
  familias: NAV_FAMILIA,
  director: NAV_DIRECTOR,
  vicedirector: NAV_DIRECTOR,
  directivo: NAV_DIRECTOR,
  secretario: NAV_SECRETARIA_DIRECCION,
  secretaria: NAV_SECRETARIA_DIRECCION,
  jefe_area: NAV_JEFE_AREA,
  jefe_preceptores: NAV_JEFE_PRECEPTORES,
  j_preceptores: NAV_JEFE_PRECEPTORES,
  jefe_departamento: NAV_JEFE_DEPARTAMENTO,
  ematp: NAV_EMATP,
  auxiliar: NAV_AUXILIAR,
  bibliotecario: NAV_BIBLIOTECA,
  eoe: NAV_EOE,
}

const ROLES_NAVIGATION_SECTIONS = {
  admin: NAV_ADMIN_SECTIONS,
  ematp: NAV_EMATP_SECTIONS,
  secretario: NAV_SECRETARIA_SECTIONS,
  secretaria: NAV_SECRETARIA_SECTIONS,
}



const ROLES_SIDEBAR_META = {
  estudiante: { navTitle: "MENÚ PRINCIPAL", roleLabel: "Estudiante" },
  preceptor: { navTitle: "MENÚ PRINCIPAL", roleLabel: "Preceptoría" },
  admin: { navTitle: "MENÚ PRINCIPAL", roleLabel: "Administrador" },
  profesor: { navTitle: "MENÚ PRINCIPAL", roleLabel: "Docente" },
  familia: { navTitle: "MENÚ PRINCIPAL", roleLabel: "Familia" },
  familias: { navTitle: "MENÚ PRINCIPAL", roleLabel: "Familia" },
  vicedirector: { navTitle: "MENÚ PRINCIPAL", roleLabel: "Vicedirección" },
  director: { navTitle: "MENÚ PRINCIPAL", roleLabel: "Dirección" },
  directivo: { navTitle: "MENÚ PRINCIPAL", roleLabel: "Dirección" },
  secretario: { navTitle: "MENÚ PRINCIPAL", roleLabel: "Secretaría / Dirección" },
  secretaria: { navTitle: "MENÚ PRINCIPAL", roleLabel: "Secretaría / Dirección" },
  jefe_area: { navTitle: "MENÚ PRINCIPAL", roleLabel: "Jefe de Área" },
  jefe_preceptores: { navTitle: "MENÚ PRINCIPAL", roleLabel: "Jefe de Preceptores" },
  j_preceptores: { navTitle: "MENÚ PRINCIPAL", roleLabel: "Jefe de Preceptores" },
  jefe_departamento: { navTitle: "MENÚ PRINCIPAL", roleLabel: "Jefe de Departamento" },
  ematp: { navTitle: "MENÚ PRINCIPAL", roleLabel: "EMATP / AUX / BIBLIO" },
  auxiliar: { navTitle: "MENÚ PRINCIPAL", roleLabel: "Auxiliar" },
  bibliotecario: { navTitle: "MENÚ PRINCIPAL", roleLabel: "Bibliotecario/a" },
  eoe: { navTitle: "MENÚ PRINCIPAL", roleLabel: "Equipo de Orientación", schoolSubs: ["Manuel Belgrano"] },
}

const ROLES_CALENDARIO_DIRECCION = new Set([
  "admin",
  "secretario",
  "secretaria",
  "director",
  "vicedirector",
  "directivo",
  "jefe_area",
])

const ROLES_CALENDARIO_PRECEPTORIA = new Set([
  "preceptor",
  "jefe_preceptores",
  "j_preceptores",
])

const ROLES_CALENDARIO_MINIMA = new Set([
  "profesor",
  "jefe_departamento",
])

function readSession(key, fallback = '') {
  return localStorage.getItem(key) || sessionStorage.getItem(key) || fallback
}
function initialRoles() {
  try { return JSON.parse(readSession('roles', '[]')) }
  catch { return [readSession('rol')] }
}
const CALENDAR_COMPONENTS = Object.fromEntries([
  ...Array.from(ROLES_CALENDARIO_DIRECCION, role => [role, CalendarioDireccion]),
  ...Array.from(ROLES_CALENDARIO_PRECEPTORIA, role => [role, CalendarioPreceptoria]),
  ...Array.from(ROLES_CALENDARIO_MINIMA, role => [role, CalendarioMinima]),
])

function App() {
  const [token, setToken] = useState(() => readSession("token"))
  const [rol, setRol] = useState(() => readSession("rol"))
  const [roles, setRoles] = useState(initialRoles)
  const [nombre, setNombre] = useState(() => readSession("nombre"))
  const [, setUserId] = useState(() => readSession("user_id"));
  const [mostrarCalendario, setMostrarCalendario] = useState(false)
  const [mostrarComunicados, setMostrarComunicados] = useState(false)
  const [pendingSection, setPendingSection] = useState(null)
  const savedSectionRef = useRef(null)


  // Única conexión WebSocket para toda la app
  useNotifications({
    enabled: !!token,
    onEventoUpdate: (data) => eventBus.emit('evento_update', data),
    onNewComunicado: (data) => eventBus.emit('new_comunicado', data),
    onNewAlumno: (data) => eventBus.emit('new_alumno', data),
    onNewPreceptor: (data) => eventBus.emit('new_preceptor', data),
    onNewDocente: (data) => eventBus.emit('new_docente', data),
    onNewFamilia: (data) => eventBus.emit('new_familia', data),
    onAsistenciaUpdated: (data) => eventBus.emit('asistencia_updated', data),
    onNotification: (data) => {
      if (data.notification) notificationStore.addNotification(data.notification)
    },
  })

  // Registrar Service Worker y suscribir Push (se ejecuta una vez al montar App)
  useEffect(() => {
    if (!token) return
    const register = async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
        const configuration = await apiFetch(`${API_BASE}/notificaciones/push/subscribe/`)
        if (!configuration.ok) return
        const {public_key: publicKey} = await configuration.json()
        if (!publicKey) return
        const reg = await navigator.serviceWorker.register('/sw.js')
        const existingSub = await reg.pushManager.getSubscription()
        const subInfo = existingSub ? await existingSub.toJSON() : null
        if (existingSub && subInfo?.endpoint) {
          apiFetch(`${API_BASE}/notificaciones/push/subscribe/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ endpoint: subInfo.endpoint, keys: subInfo.keys }),
          }).catch(() => {})
          return
        }
        const newSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey,
        })
        const result = await newSub.toJSON()
        if (result.endpoint) {
          apiFetch(`${API_BASE}/notificaciones/push/subscribe/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ endpoint: result.endpoint, keys: result.keys }),
          }).catch(() => {})
        }
      } catch {
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    console.warn('Push/SW requieren HTTPS en producción');
  }
}
    }
    register()
  }, [token])

  // Navegación global desde notificaciones (calendario, comunicados)
  useEffect(() => {
    const unsub = eventBus.on('notification-navigate', ({ section }) => {
      if (section === 'calendario' || section === 'eventos') {
        setMostrarCalendario(true)
      } else if (section === 'comunicados') {
        setMostrarComunicados(true)
      }
    })
    return unsub
  }, [])

  const handleLogin = ({ token: t, refresh, rol: r, roles: rs, nombre: n, user_id: uid, remember }) => {
    setToken(t)
    setRol(r)
    setRoles(rs || [r])
    setNombre(n)
    setMostrarCalendario(false)
    setMostrarComunicados(false)
    setPendingSection(null)

    // Limpiar token anterior en ambos storages para evitar usar un token inválido guardado
    localStorage.removeItem("token")
    localStorage.removeItem("refresh")
    localStorage.removeItem("rol")
    localStorage.removeItem("roles")
    localStorage.removeItem("nombre")
    localStorage.removeItem("user_id")
    sessionStorage.removeItem("token")
    sessionStorage.removeItem("refresh")
    sessionStorage.removeItem("rol")
    sessionStorage.removeItem("roles")
    sessionStorage.removeItem("nombre")
    sessionStorage.removeItem("user_id")

    const storage = remember ? localStorage : sessionStorage
    storage.setItem("token", t)
    if (refresh) storage.setItem("refresh", refresh)
    storage.setItem("rol", r)
    storage.setItem("roles", JSON.stringify(rs || [r]))
    storage.setItem("nombre", n)
    storage.setItem("user_id", uid)
  }

  const handleLogout = () => {
    notificationStore.reset()
    setToken("")
    setRol("")
    setRoles([])
    setNombre("")
    setUserId("")
    setMostrarCalendario(false)
    setMostrarComunicados(false)
    setPendingSection(null)
    localStorage.removeItem("token")
    localStorage.removeItem("refresh")
    localStorage.removeItem("rol")
    localStorage.removeItem("roles")
    localStorage.removeItem("nombre")
    localStorage.removeItem("user_id")
    sessionStorage.removeItem("token")
    sessionStorage.removeItem("refresh")
    sessionStorage.removeItem("rol")
    sessionStorage.removeItem("roles")
    sessionStorage.removeItem("nombre")
    sessionStorage.removeItem("user_id")
  }

  const handleSwitchRole = (newRol) => {
    setRol(newRol)
    setMostrarCalendario(false)
    setMostrarComunicados(false)
    setPendingSection(null)
    // Actualizar en storage
    const storage = localStorage.getItem("token") ? localStorage : sessionStorage
    storage.setItem("rol", newRol)
  }



  if (token && rol) {
    const rolNormalizado = normalizeRole(rol)
    const DashboardComponent = ROLES_DASHBOARD[rolNormalizado]
    if (!DashboardComponent) {
      handleLogout()
      return null
    }

    // Handle pending section navigation
    if (pendingSection === "comunicados") {
      setPendingSection(null)
      setMostrarComunicados(true)
      setMostrarCalendario(false)
    }

    if (mostrarCalendario) {
      const CalendarioComponent = (CALENDAR_COMPONENTS[rolNormalizado] || CalendarioVisualizer)
      const navSections = ROLES_NAVIGATION_SECTIONS[rolNormalizado]
      const navItems = navSections
        ? navSections.flatMap((section) => section.items)
        : (ROLES_NAVIGATION[rolNormalizado] || NAV_FALLBACK)
      const sidebarMeta = ROLES_SIDEBAR_META[rolNormalizado] || {}
      const activeNavId =
        navItems.find((item) => item.id === "calendario" || item.id === "eventos")?.id || "calendario"
      return (
        <>
          <CalendarioComponent
            onLogout={handleLogout}
            username={nombre}
            navItems={navItems}
            navSections={navSections}
            navTitle={sidebarMeta.navTitle ?? null}
            schoolSubs={sidebarMeta.schoolSubs}
            activeNav={activeNavId}
            onNav={(id) => {
              if (id === activeNavId) {
                setPendingSection(savedSectionRef.current || 'inicio')
                setMostrarCalendario(false)
              } else if (id === "comunicados") {
                setMostrarCalendario(false)
                setMostrarComunicados(true)
              } else {
                setPendingSection(id)
                setMostrarCalendario(false)
              }
            }}
            rolLabel={sidebarMeta.roleLabel || rol}
            roles={roles}
            onSwitchRole={handleSwitchRole}
          />
        </>
      )
    }

    if (mostrarComunicados) {
      const navSections = ROLES_NAVIGATION_SECTIONS[rolNormalizado]
      const navItems = navSections
        ? navSections.flatMap((section) => section.items)
        : (ROLES_NAVIGATION[rolNormalizado] || NAV_FALLBACK)
      const sidebarMeta = ROLES_SIDEBAR_META[rolNormalizado] || {}
      
      // Mock cursos asignados para docentes
      let cursosAsignados = []
      if (rolNormalizado === "profesor") {
        cursosAsignados = []
      }
      
      return (
        <>
          <Comunicados
            navTitle={sidebarMeta.navTitle ?? null}
            onBack={() => setMostrarComunicados(false)}
            userRole={rolNormalizado}
            cursosAsignados={cursosAsignados}
            username={nombre || "Usuario"}
            navSections={navSections}
            navItems={navItems}
            onNav={(id) => {
              if (id === "eventos" || id === "calendario") {
                setMostrarComunicados(false)
                setMostrarCalendario(true)
              } else if (id === "comunicados") {
                setPendingSection(savedSectionRef.current || "inicio")
                setMostrarComunicados(false)
              } else {
                setPendingSection(id)
                setMostrarComunicados(false)
              }
            }}
            onLogout={handleLogout}
            roles={roles}
            onSwitchRole={handleSwitchRole}
          />
        </>
      )
    }

    return (
      <>
        <DashboardComponent
          onLogout={handleLogout}
          username={nombre}
          onOpenCalendar={(section) => {
            const sec = section || 'inicio';
            savedSectionRef.current = sec;
            setPendingSection(sec);
            setMostrarCalendario(true);
          }}
          onOpenComunicados={(section) => {
            if (section) {
              savedSectionRef.current = section;
              setPendingSection(section);
            }
            setMostrarComunicados(true)
          }}
          initialSection={pendingSection}
          onClearPendingSection={() => setPendingSection(null)}
          roles={roles}
          onSwitchRole={handleSwitchRole}
        />
      </>
    )
  }

  return (
    <>
      <Login onLogin={handleLogin} />
    </>
  )
}

export default App
