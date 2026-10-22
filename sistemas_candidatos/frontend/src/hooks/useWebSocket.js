import { useEffect, useRef, useCallback, useState } from 'react'
import { WS_BASE } from '../config'

export function useWebSocket(path, options = {}) {
  const {onMessage, onOpen, onClose, onError, enabled = true} = options
  const socket = useRef(null)
  const callbacks = useRef({onMessage, onOpen, onClose, onError})
  const queue = useRef([])
  const [connectedPath, setConnectedPath] = useState(null)
  useEffect(() => { callbacks.current = {onMessage, onOpen, onClose, onError} }, [onMessage, onOpen, onClose, onError])
  useEffect(() => {
    if (!enabled) return
    let stopped = false, attempts = 0, retry, heartbeat
    const storage = localStorage.getItem('token') ? localStorage : sessionStorage
    const cursorKey = `last_message_id:${storage.getItem('user_id') || storage.getItem('nombre') || 'session'}`
    function connect() {
      clearTimeout(retry)
      clearInterval(heartbeat)
      if (stopped) return
      const token = storage.getItem('token')
      if (!token) return
      if (socket.current) { socket.current.onclose = null; socket.current.close() }
      const url = new URL(`${WS_BASE}${path}`, window.location.origin)
      url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      url.searchParams.set('token', token)
      if (path.startsWith('/chat')) url.searchParams.set('last_message_id', storage.getItem(cursorKey) || '0')
      const ws = new WebSocket(url)
      socket.current = ws
      ws.onopen = () => {
        if (stopped || socket.current !== ws) return
        setConnectedPath(path); attempts = 0
        heartbeat = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({action:'ping'})) }, 30000)
        callbacks.current.onOpen?.()
        for (const message of queue.current.splice(0)) ws.send(JSON.stringify(message))
      }
      ws.onmessage = event => {
        if (stopped || socket.current !== ws) return
        try {
          const data = JSON.parse(event.data)
          if (path.startsWith('/chat') && data.message?.id > Number(storage.getItem(cursorKey) || 0)) storage.setItem(cursorKey, String(data.message.id))
          callbacks.current.onMessage?.(data)
        } catch (error) { callbacks.current.onError?.(error) }
      }
      ws.onerror = error => callbacks.current.onError?.(error)
      ws.onclose = event => {
        if (stopped || socket.current !== ws) return
        setConnectedPath(null); clearInterval(heartbeat)
        callbacks.current.onClose?.(event)
        if (attempts < 50) retry = setTimeout(connect, Math.min(1000 * 2 ** attempts++, 30000))
      }
    }
    const reconnect = () => { if (document.visibilityState === 'visible') { attempts = 0; connect() } }
    connect()
    window.addEventListener('online', reconnect)
    window.addEventListener('session-token-refreshed', reconnect)
    document.addEventListener('visibilitychange', reconnect)
    return () => {
      stopped = true; clearTimeout(retry); clearInterval(heartbeat); queue.current = []
      if (socket.current) { socket.current.onclose = null; socket.current.close(); socket.current = null }
      window.removeEventListener('online', reconnect)
      window.removeEventListener('session-token-refreshed', reconnect)
      document.removeEventListener('visibilitychange', reconnect)
    }
  }, [path, enabled])
  const send = useCallback(data => {
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(data))
    else if (queue.current.length < 100) queue.current.push(data)
    else return false
    return true
  }, [])
  return {send, isConnected: enabled && connectedPath === path}
}
