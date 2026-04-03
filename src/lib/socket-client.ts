import { io } from 'socket.io-client'

// Dynamically determine socket URL based on environment
const getSocketUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3000'

  // In production, use the current host
  if (process.env.NODE_ENV === 'production') {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
    return `${protocol}//${window.location.host}`
  }

  // In development, use localhost
  return 'http://localhost:3000'
}

export const socket = io(getSocketUrl(), {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  timeout: 20000,
  transports: ['websocket', 'polling'],
  path: '/socket.io'
})

// Socket event types
export interface ChatMessage {
  id: string
  roomId: string
  senderId: string
  content: string
  createdAt: string
  sender: {
    id: string
    fullName: string
    email?: string
    username?: string
    role: string
  }
}

export interface ChatRoom {
  id: string
  name: string
  isGroup: boolean
  members: Array<{
    id: string
    userId: string
    isApproved: boolean
    user: {
      id: string
      fullName: string
      role?: string
    }
  }>
}

export interface ChatRequest {
  id: string
  userId: string
  userName: string
  userRole: string
  userEmail?: string
  roomId?: string
  requestDate: Date
  requesterName?: string
  isAdminChatRequest?: boolean
}

// Connection status tracking
export const getSocketStatus = () => {
  return {
    connected: socket.connected,
    id: socket.id
  }
}

export const connectSocket = (userId: string) => {
  if (!socket.connected) socket.connect()
  if (socket.connected) {
    socket.emit('userConnect', { userId })
  } else {
    socket.once('connect', () => socket.emit('userConnect', { userId }))
  }
}

export const disconnectSocket = () => {
  if (socket.connected) socket.disconnect()
}
