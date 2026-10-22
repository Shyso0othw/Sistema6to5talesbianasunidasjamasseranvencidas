import { apiFetch } from '../../api/http.js'
import { useState } from "react"
import { User, Lock, Eye, EyeOff, LogIn } from "lucide-react"
import "../../shared.css"
import './Login.css'
import { API_BASE } from "../../config"

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMensaje("")

    if (!username.trim() || !password.trim()) {
      setMensaje("Completá usuario y contraseña para continuar.")
      return
    }

    try {
      setLoading(true)
      const response = await apiFetch(`${API_BASE}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        const receivedToken = data.token || data.access || ""
        const receivedRol = data.rol || "sin_rol"
        const receivedRoles = data.roles || [receivedRol]
        const receivedNombre = data.nombre || username
        const receivedUserId = data.user_id || ""

        setMensaje("Login exitoso. Redirigiendo...")
        setIsSuccess(true)

        setTimeout(() => {
          onLogin({
            refresh: data.refresh,
            token: receivedToken,
            rol: receivedRol,
            roles: receivedRoles,
            nombre: receivedNombre,
            user_id: receivedUserId,
            remember,
          })
        }, 1500)
      } else {
        setMensaje(data.error || data.detail || "Usuario o contraseña incorrectos.")
      }
    } catch {
  setMensaje("No se pudo conectar con el servidor.");
} finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-container">
        <section className="brand">
          <img
            src="https://eestn1.com.ar/src/assets/img/logo.webp"
            alt="Logo EEST N°1"
            className="brand-logo"
          />
          <h1>E.E.S.T. N°1</h1>
          <p>Sistema de Gestión Escolar</p>
        </section>

        <form className="login-card" onSubmit={handleSubmit}>
          <h2>Iniciar Sesión</h2>
          <p className="login-subtitle">Ingresá tus credenciales para continuar</p>

          {/* Campo de Usuario */}
          <div className="field">
            <label htmlFor="login-username">Usuario</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <User size={18} />
              </span>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nombre de usuario"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Campo de Contraseña */}
          <div className="field">
            <label htmlFor="login-password">Contraseña</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <Lock size={18} />
              </span>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Opciones */}
          <div className="login-options">
            <label className="remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Recordarme</span>
            </label>
            <button
              type="button"
              className="forgot-button"
              onClick={() => setMensaje("Solicitá el cambio de contraseña en administración.")}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button className={`login-button ${loading ? 'loading' : ''}`} type="submit" disabled={loading}>
            {loading ? (
              "Ingresando..."
            ) : (
              <>
                <LogIn size={18} /> Ingresar
              </>
            )}
          </button>

          {mensaje && (
            <p className={`message ${isSuccess ? "success" : "error"}`}>{mensaje}</p>
          )}
        </form>

        <p className="footer-note">
          EEST N°1 · Manuel Belgrano · Tres de Febrero
        </p>
      </div>
    </main>
  )
}
