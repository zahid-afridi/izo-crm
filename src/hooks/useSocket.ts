import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
    role: string;
  };
}

interface ChatRoom {
  id: string;
  name: string;
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
  members: Array<{
    id: string;
    userId: string;
    isApproved: boolean;
    user: {
      id: string;
      fullName: string;
      role: string;
    };
  }>;
  messages?: Message[];
  _count?: {
    messages: number;
  };
}

interface ChatRequest {
  id?: string;
  userId: string;
  userName: string;
  userRole: string;
  requestDate: Date;
  requesterName?: string;
}

interface OnlineUser {
  userId: string;
  status: 'online' | 'away';
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  rooms: ChatRoom[];
  messages: Record<string, Message[]>;
  onlineUsers: OnlineUser[];
  chatRequests: ChatRequest[];

  // Actions
  sendMessage: (roomId: string, content: string) => void;
  deleteMessage: (messageId: string, confirmed?: boolean) => void;
  joinRoom: (roomId: string) => void;
  createTeam: (teamName: string, memberIds: string[]) => void;
  deleteTeam: (roomId: string, confirmed?: boolean) => void;
  requestAdminChat: () => void;
  approveChatRequest: (userId: string) => void;
  rejectChatRequest: (userId: string, reason?: string) => void;
  adminDirectMessage: (toUserId: string, content: string) => void;
  updateStatus: (status: 'online' | 'away') => void;

  // Event handlers
  onNewMessage: (callback: (message: Message) => void) => void;
  onMessageDeleted: (callback: (data: { messageId: string; deletedBy: string; isAdmin: boolean }) => void) => void;
  onNewRoom: (callback: (room: ChatRoom) => void) => void;
  onTeamCreated: (callback: (data: { room: ChatRoom; message: string }) => void) => void;
  onTeamDeleted: (callback: (data: { roomId: string; teamName: string; message: string }) => void) => void;
  onChatRequest: (callback: (request: ChatRequest) => void) => void;
  onChatApproved: (callback: (data: { roomId: string; adminName: string }) => void) => void;
  onChatRejected: (callback: (data: { reason: string; adminName: string }) => void) => void;
  onUserStatusChanged: (callback: (data: { userId: string; status: string }) => void) => void;
  onConfirmMessageDeletion: (callback: (data: { messageId: string; content: string; senderName: string }) => void) => void;
  onConfirmTeamDeletion: (callback: (data: { roomId: string; teamName: string; memberCount: number }) => void) => void;
  onError: (callback: (error: string) => void) => void;
}

export function useSocket(userId?: string): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);

  // Event handler refs
  const eventHandlers = useRef<{
    onNewMessage?: (message: Message) => void;
    onMessageDeleted?: (data: { messageId: string; deletedBy: string; isAdmin: boolean }) => void;
    onNewRoom?: (room: ChatRoom) => void;
    onTeamCreated?: (data: { room: ChatRoom; message: string }) => void;
    onTeamDeleted?: (data: { roomId: string; teamName: string; message: string }) => void;
    onChatRequest?: (request: ChatRequest) => void;
    onChatApproved?: (data: { roomId: string; adminName: string }) => void;
    onChatRejected?: (data: { reason: string; adminName: string }) => void;
    onUserStatusChanged?: (data: { userId: string; status: string }) => void;
    onConfirmMessageDeletion?: (data: { messageId: string; content: string; senderName: string }) => void;
    onConfirmTeamDeletion?: (data: { roomId: string; teamName: string; memberCount: number }) => void;
    onError?: (error: string) => void;
  }>({});

  useEffect(() => {
    if (!userId) return;

    // Initialize socket connection
    const socket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);

      // Register user
      socket.emit('userConnect', { userId });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    // User connection events
    socket.on('userConnected', (data: { userId: string; rooms: ChatRoom[]; onlineUsers: string[] }) => {
      console.log('User connected successfully:', data);
      setRooms(data.rooms);
      setOnlineUsers(data.onlineUsers.map(id => ({ userId: id, status: 'online' as const })));
    });

    // Message events
    socket.on('newMessage', (message: Message) => {
      console.log('New message received:', message);
      setMessages(prev => ({
        ...prev,
        [message.roomId]: [...(prev[message.roomId] || []), message]
      }));
      eventHandlers.current.onNewMessage?.(message);
    });

    socket.on('messageDeleted', (data: { messageId: string; deletedBy: string; isAdmin: boolean }) => {
      console.log('Message deleted:', data);
      setMessages(prev => {
        const newMessages = { ...prev };
        Object.keys(newMessages).forEach(roomId => {
          newMessages[roomId] = newMessages[roomId].filter(msg => msg.id !== data.messageId);
        });
        return newMessages;
      });
      eventHandlers.current.onMessageDeleted?.(data);
    });

    // Room events
    socket.on('newRoom', (room: ChatRoom) => {
      console.log('New room created:', room);
      setRooms(prev => [...prev, room]);
      eventHandlers.current.onNewRoom?.(room);
    });

    socket.on('teamCreated', (data: { room: ChatRoom; message: string }) => {
      console.log('Team created:', data);
      setRooms(prev => [...prev, data.room]);
      eventHandlers.current.onTeamCreated?.(data);
    });

    socket.on('teamDeleted', (data: { roomId: string; teamName: string; message: string }) => {
      console.log('Team deleted:', data);
      setRooms(prev => prev.filter(room => room.id !== data.roomId));
      setMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[data.roomId];
        return newMessages;
      });
      eventHandlers.current.onTeamDeleted?.(data);
    });

    // Chat request events
    socket.on('chatRequest', (request: ChatRequest) => {
      console.log('Chat request received:', request);
      setChatRequests(prev => {
        // Dedupe by userId - same user should only appear once
        const existsByUser = prev.some(r => r.userId === request.userId);
        if (existsByUser) return prev;
        if (request.id && prev.some(r => r.id === request.id)) return prev;
        return [...prev, request];
      });
      eventHandlers.current.onChatRequest?.(request);
    });

    socket.on('chatRequestSent', (data: { message: string }) => {
      console.log('Chat request sent:', data);
    });

    socket.on('chatApproved', (data: { roomId: string; adminName: string }) => {
      console.log('Chat approved:', data);
      eventHandlers.current.onChatApproved?.(data);
    });

    socket.on('chatRejected', (data: { reason: string; adminName: string }) => {
      console.log('Chat rejected:', data);
      eventHandlers.current.onChatRejected?.(data);
    });

    // User status events
    socket.on('userStatusChanged', (data: { userId: string; status: string }) => {
      console.log('User status changed:', data);
      setOnlineUsers(prev => {
        const existing = prev.find(u => u.userId === data.userId);
        if (existing) {
          return prev.map(u =>
            u.userId === data.userId
              ? { ...u, status: data.status as 'online' | 'away' }
              : u
          );
        } else if (data.status !== 'offline') {
          return [...prev, { userId: data.userId, status: data.status as 'online' | 'away' }];
        }
        return prev.filter(u => u.userId !== data.userId);
      });
      eventHandlers.current.onUserStatusChanged?.(data);
    });

    socket.on('onlineUsers', (users: OnlineUser[]) => {
      console.log('Online users:', users);
      setOnlineUsers(users);
    });

    // Confirmation events
    socket.on('confirmMessageDeletion', (data: { messageId: string; content: string; senderName: string }) => {
      console.log('Confirm message deletion:', data);
      eventHandlers.current.onConfirmMessageDeletion?.(data);
    });

    socket.on('confirmTeamDeletion', (data: { roomId: string; teamName: string; memberCount: number }) => {
      console.log('Confirm team deletion:', data);
      eventHandlers.current.onConfirmTeamDeletion?.(data);
    });

    // Error events
    socket.on('error', (error: string) => {
      console.error('Socket error:', error);
      eventHandlers.current.onError?.(error);
    });

    // Cleanup
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [userId]);

  // Actions
  const sendMessage = (roomId: string, content: string) => {
    if (socketRef.current && userId) {
      socketRef.current.emit('sendMessage', { roomId, senderId: userId, content });
    }
  };

  const deleteMessage = (messageId: string, confirmed = false) => {
    if (socketRef.current && userId) {
      socketRef.current.emit('deleteMessage', { messageId, userId, confirmed });
    }
  };

  const joinRoom = (roomId: string) => {
    if (socketRef.current && userId) {
      socketRef.current.emit('joinRoom', { roomId, userId });
    }
  };

  const createTeam = (teamName: string, memberIds: string[]) => {
    if (socketRef.current && userId) {
      socketRef.current.emit('createTeam', { adminId: userId, teamName, memberIds });
    }
  };

  const deleteTeam = (roomId: string, confirmed = false) => {
    if (socketRef.current && userId) {
      socketRef.current.emit('deleteTeam', { roomId, userId, confirmed });
    }
  };

  const requestAdminChat = () => {
    if (socketRef.current && userId) {
      socketRef.current.emit('requestAdminChat', { userId });
    }
  };

  const approveChatRequest = (requestUserId: string) => {
    if (socketRef.current && userId) {
      socketRef.current.emit('approveChatRequest', { userId: requestUserId, adminId: userId });
    }
  };

  const rejectChatRequest = (requestUserId: string, reason?: string) => {
    if (socketRef.current && userId) {
      socketRef.current.emit('rejectChatRequest', { userId: requestUserId, adminId: userId, reason });
    }
  };

  const adminDirectMessage = (toUserId: string, content: string) => {
    if (socketRef.current && userId) {
      socketRef.current.emit('adminDirectMessage', { fromUserId: userId, toUserId, content });
    }
  };

  const updateStatus = (status: 'online' | 'away') => {
    if (socketRef.current && userId) {
      socketRef.current.emit('updateStatus', { userId, status });
    }
  };

  // Event handler setters
  const onNewMessage = (callback: (message: Message) => void) => {
    eventHandlers.current.onNewMessage = callback;
  };

  const onMessageDeleted = (callback: (data: { messageId: string; deletedBy: string; isAdmin: boolean }) => void) => {
    eventHandlers.current.onMessageDeleted = callback;
  };

  const onNewRoom = (callback: (room: ChatRoom) => void) => {
    eventHandlers.current.onNewRoom = callback;
  };

  const onTeamCreated = (callback: (data: { room: ChatRoom; message: string }) => void) => {
    eventHandlers.current.onTeamCreated = callback;
  };

  const onTeamDeleted = (callback: (data: { roomId: string; teamName: string; message: string }) => void) => {
    eventHandlers.current.onTeamDeleted = callback;
  };

  const onChatRequest = (callback: (request: ChatRequest) => void) => {
    eventHandlers.current.onChatRequest = callback;
  };

  const onChatApproved = (callback: (data: { roomId: string; adminName: string }) => void) => {
    eventHandlers.current.onChatApproved = callback;
  };

  const onChatRejected = (callback: (data: { reason: string; adminName: string }) => void) => {
    eventHandlers.current.onChatRejected = callback;
  };

  const onUserStatusChanged = (callback: (data: { userId: string; status: string }) => void) => {
    eventHandlers.current.onUserStatusChanged = callback;
  };

  const onConfirmMessageDeletion = (callback: (data: { messageId: string; content: string; senderName: string }) => void) => {
    eventHandlers.current.onConfirmMessageDeletion = callback;
  };

  const onConfirmTeamDeletion = (callback: (data: { roomId: string; teamName: string; memberCount: number }) => void) => {
    eventHandlers.current.onConfirmTeamDeletion = callback;
  };

  const onError = (callback: (error: string) => void) => {
    eventHandlers.current.onError = callback;
  };

  return {
    socket: socketRef.current,
    isConnected,
    rooms,
    messages,
    onlineUsers,
    chatRequests,

    // Actions
    sendMessage,
    deleteMessage,
    joinRoom,
    createTeam,
    deleteTeam,
    requestAdminChat,
    approveChatRequest,
    rejectChatRequest,
    adminDirectMessage,
    updateStatus,

    // Event handlers
    onNewMessage,
    onMessageDeleted,
    onNewRoom,
    onTeamCreated,
    onTeamDeleted,
    onChatRequest,
    onChatApproved,
    onChatRejected,
    onUserStatusChanged,
    onConfirmMessageDeletion,
    onConfirmTeamDeletion,
    onError,
  };
}