import { useEffect, useState, useRef, useCallback } from 'react'
import { Send, MessageSquare, ArrowLeft, MoreVertical, Search, Menu, Plus, Users, X, Check } from 'lucide-react'
import { fetchContactos, fetchMensajes, fetchGrupos, createGrupo, fetchGrupoMensajes } from '../../api/chat'
import { useWebSocket } from '../../hooks/useWebSocket'
import { Bell, BellOff } from 'lucide-react'
import '../../shared.css'
import '../../components/specific/ChatScreen.css'

const avatarColors = ['#4a63e0', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2', '#6366f1']

const GROUP_CREATION_ROLES = ['admin', 'jefe_area', 'jefe_departamento', 'jefe_preceptores']

function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token')
}

function getUserId() {
  return localStorage.getItem('user_id') || sessionStorage.getItem('user_id')
}

function canCreateGroup(userRole) {
  if (!userRole) return false
  const r = userRole.toLowerCase().replace(/ /g, '_')
  return GROUP_CREATION_ROLES.some(role => r.includes(role) || role.includes(r))
}

function getInitials(name) {
  return (name || '?')
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

  const sortContactsByLastMessage = (list) =>
    [...list].sort((a, b) => {
      const dateA = a.ultimo_mensaje?.fecha_creacion ? new Date(a.ultimo_mensaje.fecha_creacion) : new Date(0)
      const dateB = b.ultimo_mensaje?.fecha_creacion ? new Date(b.ultimo_mensaje.fecha_creacion) : new Date(0)
      return dateB - dateA
    })

// ---- Create Group Modal ----
function CreateGroupModal({ contacts, onClose, onCreated }) {
  const [nombre, setNombre] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('estudiante')

  const TABS = [
    { id: 'estudiante', label: 'Estudiantes' },
    { id: 'docente', label: 'Docentes' },
    { id: 'preceptor', label: 'Preceptores' },
    { id: 'familia', label: 'Familias' },
    { id: 'staff', label: 'Personal' }
  ]

  const filtered = contacts.filter(c => {
    // Filter by tab role
    let matchesTab;
    const r = (c.rol || '').toLowerCase();
    if (activeTab === 'estudiante') matchesTab = r.includes('estudiante') || r.includes('alumno');
    else if (activeTab === 'docente') matchesTab = r.includes('docente') || r.includes('profesor');
    else if (activeTab === 'preceptor') matchesTab = r.includes('preceptor');
    else if (activeTab === 'familia') matchesTab = r.includes('familia') || r.includes('tutor');
    else matchesTab = !r.includes('estudiante') && !r.includes('alumno') && !r.includes('docente') && !r.includes('profesor') && !r.includes('preceptor') && !r.includes('familia') && !r.includes('tutor'); // staff

    if (!matchesTab) return false;
    if (search.trim()) {
      return (c.nombre_completo || c.username || '').toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const toggleMember = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) { setError('Ingresá un nombre para el grupo'); return }
    if (selectedIds.length === 0) { setError('Seleccioná al menos un miembro'); return }
    setLoading(true)
    setError('')
    try {
      const t = getToken()
      const grupo = await createGrupo(t, { nombre: nombre.trim(), miembros: selectedIds })
      onCreated(grupo)
    } catch (err) {
      setError(err.message || 'Error al crear grupo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div role="dialog" aria-label="Nuevo Grupo"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          border: '1px solid #d1d7db',
          borderRadius: '16px',
          padding: '28px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111b21', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} style={{ color: '#00a884' }} /> Nuevo Grupo
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667781', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input
            autoFocus
            type="text"
            placeholder="Nombre del grupo..."
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #d1d7db',
              background: '#f0f2f5',
              color: '#111b21',
              fontSize: '14px',
              outline: 'none',
            }}
          />

          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#667781' }} />
            <input
              type="text"
              placeholder="Buscar miembros..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '8px 12px 8px 34px',
                borderRadius: '10px',
                border: '1px solid #d1d7db',
                background: '#f0f2f5',
                color: '#111b21',
                fontSize: '13px',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: 'none',
                  background: activeTab === tab.id ? '#00a884' : '#f0f2f5',
                  color: activeTab === tab.id ? '#fff' : '#667781',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {selectedIds.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {selectedIds.map(id => {
                const c = contacts.find(x => x.id === id)
                if (!c) return null
                return (
                  <span
                    key={id}
                    onClick={() => toggleMember(id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 600,
                      background: '#e7f8f0', color: '#00a884', cursor: 'pointer',
                      border: '1px solid #b8ebd4', transition: 'all 0.15s',
                    }}
                  >
                    {(c.nombre_completo || c.username || '').split(' ')[0]}
                    <X size={12} />
                  </span>
                )
              })}
            </div>
          )}

          <div style={{ overflowY: 'auto', maxHeight: '260px', display: 'flex', flexDirection: 'column', gap: '2px', border: '1px solid #e9edef', borderRadius: '10px' }}>
            {filtered.map(c => {
              const sel = selectedIds.includes(c.id)
              return (
                <div
                  key={c.id}
                  onClick={() => toggleMember(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', cursor: 'pointer',
                    background: sel ? '#e7f8f0' : '#fff',
                    borderBottom: '1px solid #f0f2f5',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#f5f6f6' }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = '#fff' }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: avatarColors[c.id % avatarColors.length],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {getInitials(c.nombre_completo || c.username)}
                  </div>
                  <span style={{ flex: 1, fontSize: '14px', color: '#111b21' }}>{c.nombre_completo || c.username}</span>
                  {sel && <Check size={16} style={{ color: '#00a884' }} />}
                </div>
              )
            })}
          </div>

          {selectedIds.length > 0 && (
            <div style={{ fontSize: '12px', color: '#00a884', fontWeight: 600 }}>
              {selectedIds.length} miembro{selectedIds.length !== 1 ? 's' : ''} seleccionado{selectedIds.length !== 1 ? 's' : ''}
            </div>
          )}

          {error && <p style={{ margin: 0, color: '#ef4444', fontSize: '13px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 20px', borderRadius: '9px',
                border: '1px solid #d1d7db',
                background: '#fff', color: '#3b4a54', cursor: 'pointer', fontSize: '13px',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || selectedIds.length === 0 || !nombre.trim()}
              style={{
                padding: '9px 20px', borderRadius: '9px',
                border: 'none', background: '#00a884', color: '#fff',
                cursor: (loading || selectedIds.length === 0 || !nombre.trim()) ? 'not-allowed' : 'pointer',
                fontSize: '13px', fontWeight: 600,
                opacity: (loading || selectedIds.length === 0 || !nombre.trim()) ? 0.5 : 1,
              }}
            >
              {loading ? 'Creando...' : 'Crear Grupo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


// ---- Main ChatScreen ----
export default function ChatScreen({
  userRole
}) {
  const [selectedContact, setSelectedContact] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const selectedGroupRef = useRef(null)
  const selectedContactRef = useRef(null)
  
  // Update ref whenever selectedGroup changes
  useEffect(() => {
    selectedGroupRef.current = selectedGroup
  }, [selectedGroup])

  // Update ref whenever selectedContact changes
  useEffect(() => {
    selectedContactRef.current = selectedContact
  }, [selectedContact])
  const [contacts, setContacts] = useState([])
  const [groups, setGroups] = useState([])
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasOlder, setHasOlder] = useState(true)
  const [chatError, setChatError] = useState('')
  const prepending = useRef(false)
  const [showGroupMembers, setShowGroupMembers] = useState(false)
  const [showContactsPanel, setShowContactsPanel] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [pendingCounts, setPendingCounts] = useState({})
  const [groupPendingCounts, setGroupPendingCounts] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [mutedContacts, setMutedContacts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mutedContacts')) || [] } catch { return [] }
  })
  const messagesEndRef = useRef(null)
  const sendingTimeoutRef = useRef(null)
  const pendingMessagesRef = useRef({})

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (prepending.current) { prepending.current = false; return }
    scrollToBottom()
  }, [messages])

  // Load contacts and groups
  useEffect(() => {
    async function loadAll() {
      setLoadingContacts(true)
      try {
        const t = getToken()
        if (!t) return

        const [contactData, groupData] = await Promise.allSettled([
          fetchContactos(t),
          fetchGrupos(t),
        ])

        if (contactData.status === 'fulfilled') {
          const normalized = contactData.value.map(c => ({
            ...c,
            nombre_completo: c.nombre_completo || c.username,
            iniciales: getInitials(c.nombre_completo || c.username),
            _type: 'contact',
          }))
          const sorted = sortContactsByLastMessage(normalized)
          setContacts(sorted)
          if (sorted.length > 0 && !selectedGroupRef.current) {
            setSelectedContact(previous => previous || sorted[0])
          }
        }

        if (groupData.status === 'fulfilled') {
          const gNorm = groupData.value.map(g => ({
            ...g,
            _type: 'group',
            iniciales: getInitials(g.nombre),
          }))
          setGroups(gNorm)
        }
      } catch (error) {
        console.error('Error cargando contactos:', error)
      } finally {
        setLoadingContacts(false)
      }
    }
    loadAll()
  }, [])

  // Load messages on contact/group change
  useEffect(() => {
    let isActive = true
    async function loadInitialMessages() {
      const t = getToken()
      if (!t) return
      if (!selectedContact && !selectedGroup) return

      setLoadingMessages(true)
      try {
        let data
        if (selectedGroup) {
          data = await fetchGrupoMensajes(t, selectedGroup.id)
        } else {
          data = await fetchMensajes(t, selectedContact.id)
          const pending = pendingMessagesRef.current[selectedContact.id] || []
          delete pendingMessagesRef.current[selectedContact.id]
          setPendingCounts(prev => { const n = { ...prev }; delete n[selectedContact.id]; return n })
          if (isActive) { setHasOlder(data.length === 50); setMessages([...new Map([...data, ...pending].map(m => [m.id,m])).values()]) }
          return
        }
        if (isActive) {
          setHasOlder(data.length === 50)
          setMessages(data)
          setGroupPendingCounts(prev => { const n = { ...prev }; delete n[selectedGroup.id]; return n })
        }
      } catch (error) {
        console.error('Error cargando mensajes:', error)
        if (isActive) setMessages([])
      } finally {
        if (isActive) setLoadingMessages(false)
      }
    }
    loadInitialMessages()
    return () => { isActive = false }
  }, [selectedContact, selectedGroup])

  const updateContactLastMessage = useCallback((contactId, msg) => {
    setContacts(prev => sortContactsByLastMessage(
      prev.map(c => c.id == contactId
        ? { ...c, ultimo_mensaje: { contenido: msg.contenido, fecha_creacion: msg.fecha_creacion, remitente_id: msg.remitente } }
        : c
      )
    ))
  }, [])

  const updateGroupLastMessage = (grupoId, msg) => {
    setGroups(prev => prev.map(g => g.id == grupoId
      ? { ...g, ultimo_mensaje: { contenido: msg.contenido, fecha_creacion: msg.fecha_creacion, remitente_id: msg.remitente } }
      : g
    ))
  }

  const handleWsMessage = useCallback((data) => {
    const currentUserId = getUserId()

    if (data.type === 'new_message') {
      const msg = data.message

      // Group message
      if (msg.grupo_id) {
        updateGroupLastMessage(msg.grupo_id, msg)
        const currentSelectedGroup = selectedGroupRef.current
        if (currentSelectedGroup?.id == msg.grupo_id) {
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
        } else {
          setGroupPendingCounts(prev => ({ ...prev, [msg.grupo_id]: (prev[msg.grupo_id] || 0) + 1 }))
        }
        return
      }

      // Direct message
      const contactId = msg.remitente == currentUserId ? msg.destinatario : msg.remitente
      updateContactLastMessage(contactId, msg)
      const currentSelectedGroup = selectedGroupRef.current
      const currentSelectedContact = selectedContactRef.current
      if (!currentSelectedGroup && currentSelectedContact?.id == contactId) {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
      } else {
        const pending = pendingMessagesRef.current
        if (!pending[contactId]) pending[contactId] = []
        if (!pending[contactId].some(m => m.id === msg.id)) pending[contactId].push(msg)
        setPendingCounts(prev => ({ ...prev, [contactId]: (prev[contactId] || 0) + 1 }))
      }

    } else if (data.type === 'message_sent') {
      if (sendingTimeoutRef.current) clearTimeout(sendingTimeoutRef.current)
      const msg = data.message
      if (msg.grupo_id) {
        updateGroupLastMessage(msg.grupo_id, msg)
      } else {
        updateContactLastMessage(msg.destinatario, msg)
      }
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
      setMessage('')
      setSendingMessage(false)

    } else if (data.type === 'history') {
      setMessages(data.messages || [])
      setLoadingMessages(false)

    } else if (data.type === 'group_history') {
      setMessages(data.messages || [])
      setLoadingMessages(false)

    } else if (data.type === 'read_receipt') {
      setMessages(prev =>
        prev.map(m =>
          m.remitente == currentUserId && m.destinatario == data.read_by
            ? { ...m, leido: true }
            : m
        )
      )
    } else if (data.type === 'catch_up') {
      const msgs = (data.messages || []).filter(m => selectedGroupRef.current ? m.grupo_id === selectedGroupRef.current.id : !m.grupo_id && (m.remitente == selectedContactRef.current?.id || m.destinatario == selectedContactRef.current?.id))
      if (msgs.length === 0) return
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const newMsgs = msgs.filter(m => !existingIds.has(m.id))
        return [...prev, ...newMsgs].sort((a, b) => new Date(a.fecha_creacion) - new Date(b.fecha_creacion))
      })
    } else if (data.type === 'error') {
      setChatError(data.message || 'No se pudo enviar el mensaje.')
      setSendingMessage(false)
    }
  }, [updateContactLastMessage])

  const { send: wsSend, isConnected } = useWebSocket('/chat/', {
    onMessage: handleWsMessage,
  })

  useEffect(() => {
    return () => { wsSend({ action: 'close_chat' }) }
  }, [wsSend])

  const loadOlder = async () => {
    if (loadingOlder || !messages.length) return
    const contactId = selectedContact?.id, groupId = selectedGroup?.id
    setLoadingOlder(true); setChatError('')
    try {
      const options = {beforeId: Math.min(...messages.map(m => m.id)), limit:50}
      const rows = groupId ? await fetchGrupoMensajes(getToken(), groupId, options) : await fetchMensajes(getToken(), contactId, options)
      if (selectedContactRef.current?.id !== contactId || selectedGroupRef.current?.id !== groupId) return
      prepending.current = true
      setMessages(prev => [...new Map([...rows, ...prev].map(m => [m.id,m])).values()].sort((a,b) => a.id-b.id))
      setHasOlder(rows.length === 50)
    } catch (error) { setChatError(error.message) }
    finally { setLoadingOlder(false) }
  }

  const handleSend = () => {
    if (!message.trim() || sendingMessage) return
    if (!selectedContact && !selectedGroup) return

    setSendingMessage(true)
    if (sendingTimeoutRef.current) clearTimeout(sendingTimeoutRef.current)
    sendingTimeoutRef.current = setTimeout(() => setSendingMessage(false), 10000)

    if (selectedGroup) {
      wsSend({ action: 'send_group_message', grupo_id: selectedGroup.id, contenido: message.trim() })
    } else {
      wsSend({ action: 'send_message', destinatario_id: selectedContact.id, contenido: message.trim() })
    }
  }

  const toggleMute = () => {
    if (!selectedContact && !selectedGroup) return
    const id = selectedGroup ? `g_${selectedGroup.id}` : `c_${selectedContact.id}`
    setMutedContacts(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      localStorage.setItem('mutedContacts', JSON.stringify(next))
      return next
    })
    setShowOptions(false)
  }

  const isMuted = selectedGroup ? mutedContacts.includes(`g_${selectedGroup.id}`) : (selectedContact ? mutedContacts.includes(`c_${selectedContact.id}`) : false)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSend() }
  }

  const handleContactSelect = (contact) => {
    setSelectedContact(contact)
    setSelectedGroup(null)
    setShowOptions(false)
    if (window.innerWidth <= 1024) setShowContactsPanel(false)
    wsSend({ action: 'mark_read', remitente_id: contact.id })
    wsSend({ action: 'open_chat', contact_id: contact.id })
  }

  const handleGroupSelect = (group) => {
    setSelectedGroup(group)
    setSelectedContact(null)
    setShowOptions(false)
    if (window.innerWidth <= 1024) setShowContactsPanel(false)
    wsSend({ action: 'fetch_group_history', grupo_id: group.id })
    setGroupPendingCounts(prev => { const n = { ...prev }; delete n[group.id]; return n })
  }

  const handleGroupCreated = (group) => {
    const normalized = { ...group, _type: 'group', iniciales: getInitials(group.nombre) }
    setGroups(prev => [normalized, ...prev])
    setShowCreateGroup(false)
    handleGroupSelect(normalized)
  }

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch { return dateString }
  }

  const getLastMessagePreview = (contact) => {
    if (contact.ultimo_mensaje) {
      const t = contact.ultimo_mensaje.contenido
      return t.length > 30 ? t.slice(0, 30) + '...' : t
    }
    return `@${contact.username}`
  }

  const getGroupLastMessagePreview = (group) => {
    if (group.ultimo_mensaje) {
      const t = group.ultimo_mensaje.contenido
      return t.length > 30 ? t.slice(0, 30) + '...' : t
    }
    return 'Sin mensajes aún'
  }

  const filteredContacts = searchTerm.trim()
    ? contacts.filter(c =>
        (c.nombre_completo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.username || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : contacts

  const filteredGroups = searchTerm.trim()
    ? groups.filter(g => (g.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()))
    : groups

  const currentName = selectedGroup ? selectedGroup.nombre : (selectedContact?.nombre_completo || '')
  const currentSubtitle = selectedGroup
    ? `${(selectedGroup.miembros_detalle || []).length} miembros`
    : (selectedContact ? `@${selectedContact.username}` : '')
  const currentInitials = selectedGroup ? getInitials(selectedGroup.nombre) : (selectedContact?.iniciales || '?')
  const currentColorId = selectedGroup ? selectedGroup.id + 50 : (selectedContact?.id || 0)

  return (
    <div className="chat-screen">
      {showCreateGroup && (
        <CreateGroupModal
          contacts={contacts}
          onClose={() => setShowCreateGroup(false)}
          onCreated={handleGroupCreated}
        />
      )}

      <div className="chat-layout">
        <aside className={`chat-contacts-panel ${showContactsPanel ? 'chat-contacts-panel--visible' : ''}`}>
          <div className="chat-contacts-header">
            <div className="chat-contacts-header-left">
              <button className="chat-close-panel" onClick={() => setShowContactsPanel(false)}>
                <ArrowLeft size={20} />
              </button>
              <h2 className="chat-contacts-title">Chats</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: isConnected ? '#00a884' : '#dc2626',
                  display: 'inline-block',
                }}
                title={isConnected ? 'Conectado' : 'Desconectado'}
              />
              {canCreateGroup(userRole) && (
                <button
                  onClick={() => setShowCreateGroup(true)}
                  title="Nuevo grupo"
                  style={{
                    background: 'rgba(74,99,224,0.15)',
                    border: '1px solid rgba(74,99,224,0.3)',
                    borderRadius: '8px',
                    padding: '5px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: '#4a63e0',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <Plus size={14} /> Grupo
                </button>
              )}
            </div>
          </div>

          <div className="chat-search-wrapper">
            <Search size={16} className="chat-search-icon" />
            <input
              className="chat-search-input"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="chat-contacts-list">
            {loadingContacts ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#667781' }}>
                Cargando...
              </div>
            ) : (
              <>
                {/* Groups section */}
                {filteredGroups.length > 0 && (
                  <>
                    <div style={{ padding: '8px 16px 4px', fontSize: '11px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                      Grupos
                    </div>
                    {filteredGroups.map(group => {
                      const unread = groupPendingCounts[group.id] || 0
                      const isActive = selectedGroup?.id === group.id
                      return (
                        <div
                          key={`g-${group.id}`}
                          className={`chat-contact-item ${isActive ? 'chat-contact-item--active' : ''}`}
                          onClick={() => handleGroupSelect(group)}
                        >
                          <div
                            className="chat-contact-avatar"
                            style={{ background: avatarColors[(group.id + 3) % avatarColors.length], position: 'relative' }}
                          >
                            {group.iniciales}
                            <span style={{
                              position: 'absolute', bottom: -2, right: -2,
                              background: '#4a63e0', borderRadius: '50%',
                              width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Users size={8} style={{ color: '#fff' }} />
                            </span>
                          </div>
                          <div className="chat-contact-info">
                            <div className="chat-contact-preview">
                              <p className="chat-contact-name">
                                {group.nombre}
                                {mutedContacts.includes(`g_${group.id}`) && <BellOff size={12} style={{ marginLeft: 4, color: '#888', display: 'inline-block', verticalAlign: 'middle' }} />}
                              </p>
                              <span className="chat-contact-time">
                                {group.ultimo_mensaje?.fecha_creacion ? formatTime(group.ultimo_mensaje.fecha_creacion) : ''}
                              </span>
                            </div>
                            <div className="chat-contact-preview">
                              <p className="chat-contact-message">{getGroupLastMessagePreview(group)}</p>
                              {unread > 0 && <span className="chat-unread-badge">{unread}</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}

                {/* Contacts section */}
                {filteredContacts.length > 0 && (
                  <>
                    <div style={{ padding: '8px 16px 4px', fontSize: '11px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                      Contactos
                    </div>
                    {filteredContacts.map(contact => {
                      const unread = pendingCounts[contact.id] || 0
                      return (
                        <div
                          key={contact.id}
                          className={`chat-contact-item ${selectedContact?.id === contact.id && !selectedGroup ? 'chat-contact-item--active' : ''}`}
                          onClick={() => handleContactSelect(contact)}
                        >
                          <div
                            className="chat-contact-avatar"
                            style={{ background: avatarColors[contact.id % avatarColors.length] }}
                          >
                            {contact.iniciales}
                          </div>
                          <div className="chat-contact-info">
                            <div className="chat-contact-preview">
                              <p className="chat-contact-name">
                                {contact.nombre_completo}
                                {mutedContacts.includes(`c_${contact.id}`) && <BellOff size={12} style={{ marginLeft: 4, color: '#888', display: 'inline-block', verticalAlign: 'middle' }} />}
                              </p>
                              <span className="chat-contact-time">
                                {contact.ultimo_mensaje?.fecha_creacion ? formatTime(contact.ultimo_mensaje.fecha_creacion) : ''}
                              </span>
                            </div>
                            <div className="chat-contact-preview">
                              <p className="chat-contact-message">{getLastMessagePreview(contact)}</p>
                              {unread > 0 && <span className="chat-unread-badge">{unread}</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}

                {filteredContacts.length === 0 && filteredGroups.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#667781' }}>
                    {searchTerm.trim() ? 'Sin resultados' : 'No hay contactos disponibles'}
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        <main className="chat-conversation-panel">
          {(selectedContact || selectedGroup) ? (
            <>
              <div className="chat-conversation-header">
                <button className="chat-toggle-btn" onClick={() => setShowContactsPanel(p => !p)} title="Mostrar contactos">
                  <Menu size={20} />
                </button>
                <div
                  className="chat-conversation-avatar"
                  style={{ background: avatarColors[currentColorId % avatarColors.length] }}
                >
                  {currentInitials}
                </div>
                <div className="chat-conversation-info">
                  <h3 className="chat-conversation-name">
                    {currentName}
                    {isMuted && <BellOff size={14} style={{ marginLeft: 8, color: '#888', display: 'inline-block', verticalAlign: 'middle' }} />}
                  </h3>
                  <p className="chat-conversation-status">{currentSubtitle}</p>
                </div>
                <div style={{ position: 'relative' }}>
                  <button className="chat-back-btn" style={{ display: 'flex' }} onClick={() => setShowOptions(!showOptions)}>
                    <MoreVertical size={20} />
                  </button>
                  {showOptions && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                      background: '#fff', border: '1px solid #e2e8f0',
                      borderRadius: '8px', padding: '8px 0', zIndex: 100, minWidth: '200px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      <button onClick={toggleMute} style={{
                        width: '100%', padding: '10px 16px', background: 'none', border: 'none',
                        color: '#334155', textAlign: 'left', cursor: 'pointer', fontSize: '14px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        transition: 'background 0.2s',
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={e => e.currentTarget.style.background = 'none'}>
                        {isMuted ? <Bell size={16} /> : <BellOff size={16} />}
                        {isMuted ? 'Activar notificaciones de contacto' : 'Silenciar contacto'}
                      </button>
                      
                      {selectedGroup && (
                        <button onClick={() => { setShowOptions(false); setShowGroupMembers(true); }} style={{
                          width: '100%', padding: '10px 16px', background: 'none', border: 'none',
                          color: '#334155', textAlign: 'left', cursor: 'pointer', fontSize: '14px',
                          display: 'flex', alignItems: 'center', gap: '8px',
                          transition: 'background 0.2s',
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={e => e.currentTarget.style.background = 'none'}>
                          <Users size={16} /> Ver integrantes
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="chat-messages-container">
                {loadingMessages ? (
                  <div style={{ textAlign: 'center', color: '#667781', padding: '20px' }}>
                    Cargando mensajes...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="chat-empty-state" style={{ background: 'transparent' }}>
                    <div className="chat-empty-icon">
                      <MessageSquare size={48} />
                    </div>
                    <h3 className="chat-empty-title">No hay mensajes aún</h3>
                    <p className="chat-empty-text">¡Enviá el primero!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSent = msg.remitente == getUserId()
                    return (
                      <div
                        key={msg.id}
                        className={`chat-msg-wrapper ${isSent ? 'chat-msg-wrapper--sent' : 'chat-msg-wrapper--received'}`}
                      >
                        <div className={`chat-msg ${isSent ? 'chat-msg--sent' : 'chat-msg--received'}`}>
                          {(!isSent && selectedGroup) && (
                            <div style={{ fontSize: '12px', color: '#00a884', fontWeight: 600, marginBottom: '2px' }}>
                              {msg.remitente_nombre || msg.remitente_username || 'Usuario'}
                            </div>
                          )}
                          <div style={{ wordBreak: 'break-word', paddingRight: '40px' }}>
                            {msg.contenido}
                          </div>
                          <span className="chat-msg-time" style={{ position: 'absolute', bottom: '4px', right: '8px' }}>
                            {formatTime(msg.fecha_creacion)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
                {chatError && <p role="alert">{chatError}</p>}
                  {hasOlder && messages.length >= 50 && <button type="button" onClick={loadOlder} disabled={loadingOlder}>{loadingOlder ? 'Cargando…' : 'Cargar mensajes anteriores'}</button>}
                  <div ref={messagesEndRef} />
              </div>

              <div className="chat-input-wrapper">
                <input
                  className="chat-input"
                  placeholder="Escribe un mensaje"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sendingMessage}
                />
                <button
                  className="chat-send-btn"
                  onClick={handleSend}
                  disabled={!message.trim() || sendingMessage}
                >
                  <Send size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="chat-empty-state">
              <div className="chat-empty-icon">
                <MessageSquare size={64} />
              </div>
              <h3 className="chat-empty-title">Seleccioná un contacto</h3>
              <p className="chat-empty-text">
                Elegí una persona o grupo de la lista para comenzar
              </p>
            </div>
          )}
        </main>
      </div>
      
      {showGroupMembers && selectedGroup && (
        <div className="cd-overlay" onClick={e => e.target === e.currentTarget && setShowGroupMembers(false)}>
          <div className="cd-modal" style={{ maxWidth: 400, background: '#fff', borderRadius: 8 }}>
            <div className="cd-modal-header" style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="cd-modal-title" style={{ margin: 0, fontSize: 16 }}>Integrantes ({selectedGroup.miembros_detalle?.length || 0})</h2>
              <button className="cd-modal-close" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowGroupMembers(false)}><X size={18} /></button>
            </div>
            <div className="cd-form" style={{ maxHeight: 300, overflowY: 'auto', padding: '16px' }}>
              {(selectedGroup.miembros_detalle || []).map(m => (
                <div key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, color: '#64748b' }}>
                    {getInitials(m.nombre_completo || m.username)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#334155' }}>{m.nombre_completo || m.username}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>@{m.username}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
