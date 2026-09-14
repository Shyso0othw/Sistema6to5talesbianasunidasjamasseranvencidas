import { apiFetch } from './http.js'
import { API_BASE } from '../config';

const getToken = () => {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
};

const buildHeaders = (includeJson = true) => {
  const headers = {};
  const token = getToken();
  if (includeJson) {
    headers["Content-Type"] = "application/json";
    headers["Accept"] = "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

const parseEvent = (event) => ({
  ...event,
  fecha: event.fecha ? new Date(`${event.fecha}T00:00:00`) : null,
});

const translateError = (errorMessage) => {
  if (!errorMessage) return "Ocurrió un error inesperado."

  const translations = {
    "Given token not valid for any token type": "Por favor, inicia sesión nuevamente. Tu sesión ha expirado.",
    "Token is invalid or expired": "Por favor, inicia sesión nuevamente. Tu sesión ha expirado.",
    "Authentication credentials were not provided": "Por favor, inicia sesión para continuar.",
    "You do not have permission to perform this action": "No tienes permiso para realizar esta acción.",
    "Not authenticated": "Por favor, inicia sesión para continuar.",
    "No active account found with the given credentials": "Usuario o contraseña incorrectos.",
  };

  for (const [en, es] of Object.entries(translations)) {
    if (errorMessage.includes(en)) return es;
  }
  return errorMessage;
};

export const fetchEvents = async () => {
  const response = await apiFetch(`${API_BASE}/eventos/`, {
    method: "GET",
    headers: buildHeaders(false),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || "No se pudieron cargar los eventos.");
  }

  const data = await response.json();
  return data.map(parseEvent);
};

export const createEvent = async (payload) => {
  const token = getToken();
  if (!token) {
    throw new Error("No se encontró sesión activa. Inicia sesión nuevamente.");
  }

  const response = await apiFetch(`${API_BASE}/eventos/`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(async () => {
      const text = await response.text().catch(() => "")
      return { _rawText: text }
    });

    const rawMessage =
      errorData.detail ||
      errorData.error ||
      (errorData.non_field_errors && errorData.non_field_errors[0]) ||
      (errorData.fecha && errorData.fecha[0]) ||
      (errorData.hora_inicio && errorData.hora_inicio[0]) ||
      (errorData.hora_fin && errorData.hora_fin[0]) ||
      (errorData.titulo && errorData.titulo[0]) ||
      (errorData.lugar && errorData.lugar[0]) ||
      (errorData.ciclo && errorData.ciclo[0]) ||
      (errorData.curso && errorData.curso[0]) ||
      errorData._rawText ||
      response.statusText ||
      `Error ${response.status}`;

    const errorMessage = translateError(rawMessage.toString());
    throw new Error(errorMessage || "No se pudo crear el evento.");
  }

  const data = await response.json();
  return parseEvent(data);
};

export const updateEvent = async (id, payload) => {
  const token = getToken();
  if (!token) throw new Error("No se encontró sesión activa. Inicia sesión nuevamente.");

  const response = await apiFetch(`${API_BASE}/eventos/${id}/`, {
    method: "PUT",
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(async () => {
      const text = await response.text().catch(() => "")
      return { _rawText: text }
    });
    const rawMessage =
      errorData.detail ||
      errorData.error ||
      (errorData.non_field_errors && errorData.non_field_errors[0]) ||
      (errorData.fecha && errorData.fecha[0]) ||
      (errorData.titulo && errorData.titulo[0]) ||
      errorData._rawText ||
      response.statusText ||
      `Error ${response.status}`;
    throw new Error(translateError(rawMessage.toString()) || "No se pudo actualizar el evento.");
  }

  const data = await response.json();
  return parseEvent(data);
};

export const deleteEvent = async (id) => {
  const token = getToken();
  if (!token) throw new Error("No se encontró sesión activa.");

  const response = await apiFetch(`${API_BASE}/eventos/${id}/delete/`, {
    method: "DELETE",
    headers: buildHeaders(false),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || "No se pudo eliminar el evento.");
  }
};

