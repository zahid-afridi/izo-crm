'use client'
/**
 * ChatPage - Unified messaging: teams, direct, admin approval flow.
 * Uses socket.io for real-time, chat-utils for display names & formatting.
 */

import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import EmojiPicker from 'emoji-picker-react'
import {
  Send,
  Users,
  Search,
  Plus,
  Check,
  X,
  MessageCircle,
  Trash2,
  Smile,
  ArrowLeft,
  Eye,
  UserMinus,
  Clock,
} from 'lucide-react'
import { socket, ChatMessage, ChatRoom, ChatRequest, connectSocket, disconnectSocket } from '@/lib/socket-client'
import { getDirectChatDisplayName, getSenderDisplayName, formatChatTimestamp } from '@/lib/chat-utils'
import { useAuthRedux } from '@/hooks/useAuthRedux'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../ui/dialog'
import { Label } from '../ui/label'

interface ChatPageProps {
  userRole: string;
}

interface ChatListItem {
  id: string;
  type: 'direct' | 'group';
  name: string;
  role?: string;
  members?: number;
  lastMessage: string;
  timestamp: string;
  unread: number;
  online?: boolean;
  roomId: string;
  otherUserId?: string;
  lastMessageTime?: Date;
  isOnline?: boolean;
}

export function ChatPage({ userRole }: ChatPageProps) {
  const { t } = useTranslation()
  const { user } = useAuthRedux()

  // ─── Chat & selection state ───
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatListItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<{ userId: string; status: string }[]>([])
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [isDirectChatOpen, setIsDirectChatOpen] = useState(false);
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);

  // ─── User/team selection & dialogs ───
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedDirectUser, setSelectedDirectUser] = useState<string>('');

  const [teamName, setTeamName] = useState('');
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [isViewMembersOpen, setIsViewMembersOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedMembersToRemove, setSelectedMembersToRemove] = useState<string[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatFilter, setChatFilter] = useState<'all' | 'teams' | 'direct'>('all')
  const [isRequestingChat, setIsRequestingChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedChatRef = useRef<ChatListItem | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    selectedChatRef.current = selectedChat
  }, [selectedChat])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const isAdmin = userRole === 'admin'

  /** Fetch initial messages when entering a room */
  const fetchMessagesForRoom = async (roomId: string) => {
    if (isLoadingMessages) return;
    try {
      setIsLoadingMessages(true);
      const response = await fetch(`/api/chat-messages?roomId=${roomId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  /** Room → Chat list item: shared logic for display name and metadata */
  const roomToChatItem = (room: any, lastMessage?: string, lastMessageTime?: string): ChatListItem => {
    let chatName = room.name || 'Unnamed Chat'
    let otherUserId: string | undefined

    if (!room.isGroup && room.members?.length) {
      const otherMember = room.members.find((m: any) => m.userId !== user?.id)
      if (otherMember) {
        chatName = getDirectChatDisplayName(otherMember.user, isAdmin)
        otherUserId = otherMember.userId
      }
    }

    return {
      id: room.id,
      type: room.isGroup ? 'group' : 'direct',
      name: chatName,
      members: room.isGroup ? (room.members?.length || 0) : undefined,
      lastMessage: lastMessage || 'No messages yet',
      timestamp: lastMessageTime ? formatChatTimestamp(lastMessageTime) : 'now',
      unread: 0,
      roomId: room.id,
      otherUserId,
      lastMessageTime: lastMessageTime ? new Date(lastMessageTime) : undefined,
      isOnline: otherUserId ? onlineUsers.some(u => u.userId === otherUserId && u.status === 'online') : false,
    }
  }

  /** Socket connection and real-time events */
  useEffect(() => {
    if (!user?.id) return;

    // Remove any existing listeners to prevent duplicates
    socket.off('connect');
    socket.off('connect_error');
    socket.off('disconnect');
    socket.off('userConnected');
    socket.off('newMessage');
    socket.off('newDirectMessage');
    socket.off('chatRequest');
    socket.off('chatApproved');
    socket.off('teamCreated');
    socket.off('teamDeleted');
    socket.off('directChatDeleted');
    socket.off('membersAdded');
    socket.off('joinedRoom');
    socket.off('newRoom');
    socket.off('error');

    socket.on('chatRequestSent', (data: { message: string }) => {
      toast.success(data.message || 'Chat request sent');
    });

    // Online users events
    socket.on('onlineUsers', (users: any[]) => {
      setOnlineUsers(users);
    });

    socket.on('userStatusChanged', ({ userId, status }: { userId: string, status: string }) => {
      setOnlineUsers(prev => {
        if (status === 'offline') {
          return prev.filter(u => u.userId !== userId);
        }
        return [...prev.filter(u => u.userId !== userId), { userId, status }];
      });
    });

    // Request initial online users
    if (socket.connected) {
      socket.emit('getOnlineUsers');
    }


    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('userConnect', { userId: user.id });
    });

    socket.on('connect_error', () => {
      setSocketConnected(false);
      toast.error('Connection lost. Retrying...');
    });

    socket.on('disconnect', (reason) => {
      setSocketConnected(false);
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('userConnected', ({ rooms }) => {
      if (rooms?.length) {
        setChats(rooms.map((room: ChatRoom) => roomToChatItem(room)))
      }
    })

    socket.on('newMessage', (message: ChatMessage & { tempId?: string }) => {
      setMessages((prev) => {
        if (message.tempId && message.senderId === user?.id) {
          return prev.map(m =>
            m.id === message.tempId
              ? { ...message, id: message.id } // Replace optimistic with real message
              : m
          );
        }

        if (message.senderId === user?.id && !message.tempId) return prev;

        // For other people's messages, add normally
        if (selectedChatRef.current?.roomId === message.roomId) {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        }
        return prev;
      });

      // Update chat list with latest message - WhatsApp style (always update)
      setChats((prev) => prev.map(chat => {
        if (chat.roomId === message.roomId) {
          return {
            ...chat,
            lastMessage: message.content,
            timestamp: 'now',
            unread: selectedChatRef.current?.roomId === message.roomId ? 0 : (chat.unread || 0) + 1
          };
        }
        return chat;
      }));

      if (selectedChatRef.current?.roomId !== message.roomId && message.senderId !== user?.id) {
        toast.info(`New message from ${getSenderDisplayName(message.sender)}`)
      }
    });

    socket.on('joinedRoom', (roomId: string) => {
      if (selectedChatRef.current?.roomId === roomId && messagesRef.current.length === 0) {
        fetchMessagesForRoom(roomId);
      }
    });

    socket.on('newRoom', (room: any) => {
      const newChat = roomToChatItem(room, 'Chat created')
      setChats(prev => (prev.some(c => c.id === room.id) ? prev : [newChat, ...prev]))
      setSelectedChat(newChat)
      toast.success('New chat created!')
    })

    socket.on('newDirectMessage', (data) => {
      toast.info(`New message from ${data.from}`)
    })

    socket.on('chatRequest', (request: ChatRequest) => {
      setChatRequests((prev) => {
        // Dedupe by id and by userId - same user should only appear once
        const existsById = prev.some(r => r.id === request.id);
        const existsByUser = prev.some(r => r.userId === request.userId);
        if (existsById || existsByUser) {
          return prev;
        }
        return [...prev, request];
      });
      toast.info(`Chat request from ${request.userName}`);
    });

    // Listen for chat approval
    socket.on('chatApproved', ({ roomId }) => {
      toast.success('Chat request approved!');
    });

    socket.on('teamCreated', ({ room, message }) => {
      if (!room || !room.id) {
        toast.error('Failed to create team - invalid data');
        return;
      }

      // Create new chat item - WhatsApp style
      const newChat: ChatListItem = {
        id: room.id,
        type: 'group',
        name: room.name || t('chat.newTeam'),
        members: room.members?.length || 0,
        lastMessage: 'Team created',
        timestamp: 'now',
        unread: 0,
        roomId: room.id,
        otherUserId: undefined, // Groups don't have otherUserId
      };

      // Add to chat list instantly - WhatsApp behavior
      setChats((prev) => {
        const exists = prev.some((c) => c.id === room.id);
        if (exists) {
          return prev.map(chat =>
            chat.id === room.id
              ? { ...chat, name: room.name || chat.name, members: room.members?.length || chat.members }
              : chat
          );
        }
        return [newChat, ...prev];
      });

      // Auto-select the new team for immediate chatting - WhatsApp style
      setSelectedChat(newChat);

      if (user?.id) socket.emit('joinRoom', { roomId: room.id, userId: user.id });

      // Show success message
      if (message) {
        toast.success(message);
      } else {
        toast.success(`Team "${room.name}" created successfully!`);
      }
    });



    socket.on('teamDeleted', ({ roomId, teamName }) => {
      setChats((prev) => prev.filter((c) => c.roomId !== roomId));
      if (selectedChat?.roomId === roomId) {
        setMessages([]);
        setSelectedChat(null);
      }

      toast.info(`Team "${teamName}" was deleted`);
    });

    socket.on('directChatDeleted', ({ roomId, otherUserName, message }) => {
      setChats((prev) => prev.filter((c) => c.roomId !== roomId));
      if (selectedChat?.roomId === roomId) {
        setMessages([]);
        setSelectedChat(null);
      }

      toast.info(message || `Conversation deleted`);
    });

    socket.on('membersAdded', ({ room, message }) => {

      // Update chat list with new member count
      setChats((prev) => prev.map(chat => {
        if (chat.id === room.id) {
          return {
            ...chat,
            members: room.members?.length || chat.members,
            lastMessage: message || 'Members added',
            timestamp: 'now'
          };
        }
        return chat;
      }));

      // Update selected chat if it's the same room
      if (selectedChatRef.current?.roomId === room.id) {
        setSelectedChat(prev => prev ? {
          ...prev,
          members: room.members?.length || prev.members
        } : null);
      }

      toast.success(message || 'Members added to team');
    });

    socket.on('membersRemoved', ({ room, message }) => {

      // Update chat list with new member count
      setChats((prev) => prev.map(chat => {
        if (chat.id === room.id) {
          return {
            ...chat,
            members: room.members?.length || chat.members,
            lastMessage: message || 'Members removed',
            timestamp: 'now'
          };
        }
        return chat;
      }));

      // Update selected chat if it's the same room
      if (selectedChatRef.current?.roomId === room.id) {
        setSelectedChat(prev => prev ? {
          ...prev,
          members: room.members?.length || prev.members
        } : null);
      }

      toast.info(message || 'Members removed from team');
    });

    socket.on('removedFromTeam', ({ roomId, teamName, message }) => {

      // Remove the team from chat list
      setChats((prev) => prev.filter((c) => c.roomId !== roomId));

      // Clear messages if we were viewing the team
      if (selectedChat?.roomId === roomId) {
        setMessages([]);
        setSelectedChat(null);
      }

      toast.error(message || `You were removed from team "${teamName}"`);
    });

    socket.on('memberRemovalSuccess', ({ remainingCount }) => {
      if (selectedChat?.type === 'group') {
        setSelectedChat(prev => prev ? {
          ...prev,
          members: remainingCount
        } : null);
      }

      setTimeout(() => viewTeamMembers(), 500);
    });

    socket.on('error', (error) => toast.error(typeof error === 'string' ? error : 'Something went wrong'));

    // Connect socket with enhanced management
    connectSocket(user.id);

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('userConnected');
      socket.off('newMessage');
      socket.off('joinedRoom');
      socket.off('newRoom');
      socket.off('newDirectMessage');
      socket.off('chatRequest');
      socket.off('chatApproved');
      socket.off('teamCreated');
      socket.off('teamDeleted');
      socket.off('directChatDeleted');
      socket.off('membersAdded');
      socket.off('membersRemoved');
      socket.off('removedFromTeam');
      socket.off('memberRemovalSuccess');
      socket.off('error');
      socket.off('onlineUsers');
      socket.off('userStatusChanged');
      socket.off('chatRequestSent');

      disconnectSocket();
    };
  }, [user?.id]);

  // Fetch chat requests for admin (persistent)
  useEffect(() => {
    const fetchChatRequests = async () => {
      if (!isAdmin || !user?.id) return;

      try {
        const response = await fetch(`/api/chat-requests?adminId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          const requests = data.requests || [];
          // Dedupe by userId - only show one request per user
          const seen = new Set<string>();
          const deduped = requests.filter((r: ChatRequest) => {
            if (seen.has(r.userId)) return false;
            seen.add(r.userId);
            return true;
          });
          setChatRequests(deduped);
        }
      } catch (error) {
        console.error('Failed to fetch chat requests:', error);
      }
    };

    fetchChatRequests();
  }, [isAdmin, user?.id]);

  // Fetch all users for team creation and direct messaging
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          setAllUsers(data.users || []);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    // Admin can see all users, employees can see admins and other employees
    if (isAdmin || userRole !== 'admin') {
      fetchUsers();
    }
  }, [isAdmin, userRole]);

  // Fetch chat rooms - Only on initial load, then rely on socket updates
  useEffect(() => {
    if (!user?.id) return;

    const fetchChats = async () => {
      try {
        const res = await fetch(`/api/chat-rooms?userId=${user.id}`)
        if (!res.ok) return
        const { rooms } = await res.json()
        if (rooms?.length) {
          setChats(rooms.map((room: any) => {
            const lastMsg = room.messages?.[0]
            return roomToChatItem(
              room,
              lastMsg?.content,
              lastMsg?.createdAt || room.updatedAt
            )
          }))
        }
      } catch {
        toast.error('Failed to load chats')
      }
    }

    fetchChats()
    const interval = setInterval(fetchChats, 30000)

    return () => clearInterval(interval)
  }, [user?.id, isAdmin, onlineUsers])

  useEffect(() => {
    const setupChat = async () => {
      if (!selectedChat?.roomId || !user?.id) return;
      try {
        socket.emit('joinRoom', { roomId: selectedChat.roomId, userId: user.id });
        await fetchMessagesForRoom(selectedChat.roomId);
      } catch (error) {
        console.error('Failed to setup chat:', error);
      }
    };

    setMessages([]);
    setMessageInput(''); // Clear input when switching chats or when chat is deleted
    setupChat();
  }, [selectedChat?.roomId, user?.id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!messageInput.trim()) {
      toast.error('Cannot send empty message');
      return;
    }

    if (!selectedChat || !user?.id) {
      toast.error('No chat selected');
      return;
    }

    if (!selectedChat.roomId) {
      toast.error('Invalid chat room');
      return;
    }

    // Prevent duplicate sends
    if (isSendingMessage) {
      return;
    }

    // Check socket connection
    if (!socket.connected) {
      socket.connect();
      toast.error('Connection lost. Please try again.');
      return;
    }

    const messageContent = messageInput.trim();
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    try {
      setIsSendingMessage(true);

      // 🚀 OPTIMISTIC UPDATE - Show message immediately (WhatsApp style)
      const optimisticMessage: ChatMessage = {
        id: tempId,
        roomId: selectedChat.roomId,
        senderId: user.id,
        content: messageContent,
        createdAt: new Date().toISOString(),
        sender: {
          id: user.id,
          fullName: user.name || 'You',
          role: user.role || 'user'
        }
      };

      // Add to UI instantly - WhatsApp behavior
      setMessages(prev => [...prev, optimisticMessage]);

      setMessageInput('');

      // Send via socket - optimistic update already shown
      socket.emit('sendMessage', {
        roomId: selectedChat.roomId,
        senderId: user.id,
        content: messageContent,
        tempId // Send temp ID to replace optimistic message
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');

      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));

      // Restore input
      setMessageInput(messageContent);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const startDirectMessage = async () => {
    if (!selectedDirectUser || !user?.id) {
      toast.error('Please select a user to message');
      return;
    }

    if (selectedDirectUser === user.id) {
      toast.error('Cannot message yourself');
      return;
    }

    if (!socket.connected) {
      toast.error('Not connected to server. Please refresh the page.');
      return;
    }

    try {
      // Check if direct message room already exists
      const existingChat = chats.find(chat =>
        chat.type === 'direct' && chat.otherUserId === selectedDirectUser
      );

      if (existingChat) {
        setSelectedChat(existingChat)
        setIsDirectChatOpen(false)
        setSelectedDirectUser('');
        toast.info('Chat already exists');
        return;
      }

      // For admin: can directly create room and message
      if (isAdmin) {
        socket.emit('adminDirectMessage', {
          fromUserId: user.id,
          toUserId: selectedDirectUser,
          content: '' // Empty content - just create room without message
        });
        toast.success('Direct message started');
      } else {
        const targetUser = allUsers.find(u => u.id === selectedDirectUser);
        if (targetUser?.role === 'admin') {
          socket.emit('requestAdminChat', { userId: user.id });
          toast.success('Chat request sent to admin');
        } else {
          socket.emit('employeeDirectMessage', {
            fromUserId: user.id,
            toUserId: selectedDirectUser,
            content: '' // Empty content - will create pending request
          });
          toast.success('Chat request sent for approval');
        }
      }

      setIsDirectChatOpen(false)
      setSelectedDirectUser('');
    } catch (error) {
      console.error('Failed to start direct message:', error);
      toast.error('Failed to start direct message');
    }
  };

  const requestAdminChat = async () => {
    if (!user?.id) return;

    if (userRole === 'admin') {
      toast.error('Admins cannot request chat');
      return;
    }

    if (isRequestingChat) return; // Prevent rapid double-clicks
    setIsRequestingChat(true);

    try {
      socket.emit('requestAdminChat', { userId: user.id });
      toast.success('Chat request sent to admin');
    } catch (error) {
      toast.error('Failed to send chat request');
    } finally {
      setTimeout(() => setIsRequestingChat(false), 2000); // Re-enable after 2s
    }
  };

  const approveChatRequest = async (request: ChatRequest) => {
    if (!user?.id) return;

    try {
      // Call API to approve
      const response = await fetch('/api/chat-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          requestId: request.id,
          adminId: user.id,
          userId: request.userId
        })
      });

      if (response.ok) {
        // Also emit socket event for real-time updates
        socket.emit('approveChatRequest', {
          requestId: request.id,
          adminId: user.id,
        });

        setChatRequests((prev) =>
          prev.filter((req) => req.id !== request.id)
        );
        setIsRequestsOpen(false);
        toast.success('Chat request approved. Conversation started.');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to approve chat request');
      }
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Failed to approve chat request');
    }
  };

  const rejectChatRequest = async (request: ChatRequest) => {
    if (!user?.id) return;

    try {
      // Call API to reject
      const response = await fetch('/api/chat-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          requestId: request.id,
          adminId: user.id,
          userId: request.userId
        })
      });

      if (response.ok) {
        // Also emit socket event for real-time updates
        socket.emit('rejectChatRequest', {
          requestId: request.id,
          adminId: user.id,
          reason: 'Request declined by admin'
        });

        // Remove from local state
        setChatRequests((prev) =>
          prev.filter((req) => req.id !== request.id)
        );

        toast.success('Chat request rejected');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to reject chat request');
      }
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Failed to reject chat request');
    }
  };

  const createTeam = async () => {
    if (!teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }

    if (!user?.id) {
      toast.error('User not found');
      return;
    }

    try {
      socket.emit('createTeam', {
        adminId: user.id,
        teamName,
        memberIds: selectedMembers,
      });
      setTeamName('');
      setSelectedMembers([]);
      setIsCreateTeamOpen(false);
    } catch (error) {
      console.error('Failed to create team:', error);
      toast.error('Failed to create team');
    }
  };

  const addMembersToTeam = async () => {
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }

    if (!selectedChat || !user?.id) {
      toast.error('No team selected');
      return;
    }

    try {
      socket.emit('addMembersToTeam', {
        roomId: selectedChat.roomId,
        adminId: user.id,
        memberIds: selectedMembers,
      });
      setSelectedMembers([]);
      setIsAddMembersOpen(false);
      toast.success('Members added to team');

      // Refresh and show members list again
      setTimeout(() => {
        viewTeamMembers();
      }, 500);
    } catch (error) {
      toast.error('Failed to add members');
    }
  };

  const viewTeamMembers = async () => {
    if (!selectedChat?.roomId) return toast.error('No team selected');
    try {
      const response = await fetch(`/api/chat-rooms/${selectedChat.roomId}/members`);
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.members || []);
        setIsViewMembersOpen(true);
      } else {
        toast.error('Failed to load team members');
      }
    } catch {
      toast.error('Failed to load team members');
    }
  };

  const removeMembersFromTeam = async () => {
    if (selectedMembersToRemove.length === 0) {
      toast.error('Please select members to remove');
      return;
    }

    if (!selectedChat || !user?.id) {
      toast.error('No team selected');
      return;
    }

    try {
      socket.emit('removeMembersFromTeam', {
        roomId: selectedChat.roomId,
        adminId: user.id,
        memberIds: selectedMembersToRemove,
      });
      setSelectedMembersToRemove([]);
      setIsViewMembersOpen(false);
      toast.success('Members removed from team');

      // Refresh team members
      setTimeout(() => {
        viewTeamMembers();
      }, 500);
    } catch (error) {
      toast.error('Failed to remove members');
    }
  };

  const removeSingleMember = async (memberId: string, memberName: string) => {
    if (!selectedChat || !user?.id) {
      toast.error('No team selected');
      return;
    }

    // Show confirmation
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) return;

    try {
      socket.emit('removeMembersFromTeam', {
        roomId: selectedChat.roomId,
        adminId: user.id,
        memberIds: [memberId],
      });

      // Optimistically remove from local state immediately
      setTeamMembers(prev => prev.filter(member => member.user.id !== memberId));

      toast.success(`${memberName} removed from team`);
      setTimeout(viewTeamMembers, 1000);
    } catch (error) {
      console.error('❌ Failed to remove member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const deleteGroup = async () => {
    setIsDeleteModalOpen(true);
  };

  const deleteDirectChat = async () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteGroup = async () => {
    if (!selectedChat) {
      toast.error('No chat selected');
      return;
    }

    if (!user?.id) {
      toast.error('User not found');
      return;
    }

    const roomIdToDelete = selectedChat.roomId || selectedChat.id;
    const chatName = selectedChat.name;

    try {
      if (selectedChat.type === 'group') {
        // Delete team - only admins can delete teams
        if (userRole !== 'admin') {
          toast.error('Only admins can delete teams');
          return;
        }

        // Optimistic update: remove from UI immediately
        setChats((prev) => prev.filter((c) => (c.roomId || c.id) !== roomIdToDelete));
        setMessages([]);
        setSelectedChat(null);
        setIsDeleteModalOpen(false);

        socket.emit('deleteTeam', {
          roomId: roomIdToDelete,
          userId: user.id,
          confirmed: true,
        });
        toast.info(`Team "${chatName}" was deleted`);
      } else {
        // Optimistic update: remove from UI immediately
        setChats((prev) => prev.filter((c) => (c.roomId || c.id) !== roomIdToDelete));
        setMessages([]);
        setSelectedChat(null);
        setIsDeleteModalOpen(false);

        socket.emit('deleteDirectChat', {
          roomId: roomIdToDelete,
          userId: user.id,
          confirmed: true,
        });
        toast.info('Conversation deleted');
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      toast.error('Failed to delete chat');
    }
  };

  const filteredChats = chats
    .filter((chat) => chat.name?.toLowerCase().includes((searchQuery || '').toLowerCase()))
    .filter((chat) => {
      if (chatFilter === 'teams') return chat.type === 'group';
      if (chatFilter === 'direct') return chat.type === 'direct';
      return true;
    });

  return (
    <div
      className="bg-gray-50 flex flex-col"
      style={{ height: 'calc(100vh - 80px)' }}
    >
      <div className="flex-1 flex min-h-0">
        <div className="flex w-full h-full">
          {/* Chat List Sidebar */}
          <div className={`${selectedChat ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 xl:w-96 bg-white border-r border-gray-200 flex-col h-full`}>
            <div className="flex-shrink-0 p-4 bg-white border-b border-gray-200 min-w-0">
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {isAdmin && chatRequests.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => setIsRequestsOpen(true)}
                      className="bg-white/90 text-[#9F001B] hover:bg-white border border-[#9F001B]/30 shadow-sm relative h-8 shrink-0"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {t('chat.requests')}
                      <Badge className="ml-2 bg-[#9F001B] hover:bg-[#7d0016] text-white border-0 h-5 px-1.5 min-w-[1.25rem] flex items-center justify-center">
                        {chatRequests.length}
                      </Badge>
                    </Button>
                  )}

                  {!isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { requestAdminChat(); }}
                      disabled={isRequestingChat}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 h-8 shrink-0"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {isRequestingChat ? t('chat.requestSent') || 'Request Sent' : t('chat.requestAdmin')}
                    </Button>
                  )}
                  <Dialog open={isDirectChatOpen} onOpenChange={setIsDirectChatOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="bg-brand-gradient text-white hover:opacity-90 shadow-md h-8 shrink-0"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t('chat.newChat')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-gray-900">{t('chat.startNewChat')}</DialogTitle>
                        <DialogDescription>
                          {isAdmin
                            ? 'Select a user to message. You can message anyone directly.'
                            : 'Select a user. Admin chat and employee chats require admin approval first.'}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="relative mb-4 mt-2">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder={t('formPlaceholders.searchUsers')}
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>

                      <div className="flex-1 overflow-y-auto pr-2 -mr-2 min-h-[300px]">
                        <div className="space-y-2">
                          {allUsers
                            .filter(u => u.id !== user?.id)
                            .filter(u =>
                              u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                              u.role.toLowerCase().includes(userSearchQuery.toLowerCase())
                            )
                            .sort((a, b) => {
                              const aOnline = onlineUsers.some(ou => ou.userId === a.id && ou.status === 'online');
                              const bOnline = onlineUsers.some(ou => ou.userId === b.id && ou.status === 'online');
                              if (aOnline && !bOnline) return -1;
                              if (!aOnline && bOnline) return 1;
                              return a.fullName.localeCompare(b.fullName);
                            })
                            .map((u) => {
                              const isOnline = onlineUsers.some(ou => ou.userId === u.id && ou.status === 'online');
                              return (
                                <div
                                  key={u.id}
                                  className={`flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-all ${selectedDirectUser === u.id
                                    ? 'border-[#9F001B] bg-[#9F001B]/5 ring-1 ring-[#9F001B]/30'
                                    : 'border-gray-200'
                                    }`}
                                  onClick={() => setSelectedDirectUser(u.id)}
                                >
                                  <div className="relative mr-4">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-lg">
                                      {u.fullName.charAt(0).toUpperCase()}
                                    </div>
                                    {isOnline && (
                                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm" title="Online"></div>
                                    )}
                                  </div>

                                  <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                      <h4 className="font-medium text-gray-900">{u.fullName}</h4>
                                      {isOnline && <span className="text-[10px] uppercase font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Online</span>}
                                    </div>
                                    <div className="flex items-center mt-1">
                                      <Badge variant="secondary" className="text-xs font-normal text-gray-600 bg-gray-100 hover:bg-gray-200 border-0">
                                        {u.role}
                                      </Badge>
                                    </div>
                                  </div>

                                  <div className={`w-5 h-5 rounded-full border-2 ml-3 flex items-center justify-center transition-colors ${selectedDirectUser === u.id
                                    ? 'border-[#9F001B] bg-[#9F001B]'
                                    : 'border-gray-300'
                                    }`}>
                                    {selectedDirectUser === u.id && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                </div>
                              );
                            })}

                          {allUsers.filter(u => u.id !== user?.id && (u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.role.toLowerCase().includes(userSearchQuery.toLowerCase()))).length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <p>No users found matching "{userSearchQuery}"</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <DialogFooter className="mt-4 pt-4 border-t border-gray-100">
                        <Button variant="outline" onClick={() => {
                          setIsDirectChatOpen(false);
                          setUserSearchQuery('');
                        }}>Cancel</Button>
                        <Button
                          onClick={() => {
                            if (selectedDirectUser) {
                              startDirectMessage();
                              setIsDirectChatOpen(false);
                              setUserSearchQuery('');
                            }
                          }}
                          disabled={!selectedDirectUser}
                          className="bg-brand-gradient text-white hover:opacity-90"
                        >
                          Start Chat
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {isAdmin && (
                    <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 h-8 shrink-0"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          {t('chat.newTeam')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-gray-900">{t('chat.createNewTeam')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Team Name</Label>
                            <Input
                              placeholder={t('formPlaceholders.enterTeamName')}
                              value={teamName}
                              onChange={(e) => setTeamName(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Select Members</Label>
                            <div className="mt-2 space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                              {allUsers
                                .filter((u) => u.id !== user?.id)
                                .map((u) => (
                                  <label
                                    key={u.id}
                                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedMembers.includes(u.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedMembers((prev) => [...prev, u.id]);
                                        } else {
                                          setSelectedMembers((prev) =>
                                            prev.filter((id) => id !== u.id)
                                          );
                                        }
                                      }}
                                      className="rounded border-gray-300 text-[#9F001B] focus:ring-[#9F001B]"
                                    />
                                    <div className="flex-1">
                                      <span className="text-sm font-medium text-gray-900">{u.fullName}</span>
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        {u.role}
                                      </Badge>
                                    </div>
                                  </label>
                                ))}
                            </div>
                          </div>
                          <Button onClick={createTeam} className="w-full bg-brand-gradient text-white hover:opacity-90">
                            Create Team
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>

              {/* Teams | Direct filter tabs */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-3">
                {(['all', 'teams', 'direct'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setChatFilter(tab)}
                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${chatFilter === tab
                      ? 'bg-brand-gradient text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                      }`}
                  >
                    {tab === 'all' ? t('chat.all') : tab === 'teams' ? t('chat.teams') : t('chat.direct')}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder={t('formPlaceholders.searchDot')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-gray-50 border-gray-200 focus:bg-white focus:ring-[#9F001B]/20 transition-all rounded-lg"
                />
              </div>
            </div>

            {/* Chat Requests Dialog */}
            <Dialog open={isRequestsOpen} onOpenChange={setIsRequestsOpen}>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-gray-900">
                    <MessageCircle className="w-5 h-5 text-[#9F001B]" />
                    {t('chat.chatRequests')}
                    <Badge className="bg-[#9F001B]/10 text-[#9F001B] border-[#9F001B]/20 ml-2">{chatRequests.length}</Badge>
                  </DialogTitle>
                  <DialogDescription>
                    Manage pending chat requests from users.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {chatRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      <p>No pending requests</p>
                    </div>
                  ) : (
                    chatRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex flex-col gap-4 p-4 border border-gray-200 rounded-xl bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all"
                      >
                        <div className="flex flex-col gap-2 min-w-0">
                          <div className="text-sm text-gray-500">Chat request from</div>
                          <div className="font-medium text-gray-900 flex flex-wrap items-center gap-2">
                            <span className="truncate">{request.userName}</span>
                            <Badge variant="outline" className="text-xs font-normal shrink-0">
                              {request.userRole}
                            </Badge>
                          </div>

                          {request.requesterName ? (
                            <div className="text-sm text-[#9F001B] font-medium bg-[#9F001B]/5 px-3 py-2 rounded-lg break-words">
                              Requested by: {request.requesterName} <span className="text-gray-600">(employee-to-employee)</span>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-600">
                              Wants to chat with Admin
                            </div>
                          )}

                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            {new Date(request.requestDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} · {new Date(request.requestDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-gray-200">
                          <Button
                            size="sm"
                            onClick={() => approveChatRequest(request)}
                            className="bg-[#9F001B] hover:bg-[#7d0016] text-white shadow-sm"
                          >
                            <Check className="w-4 h-4 mr-1.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-gray-600 hover:text-red-600 border-gray-200 hover:bg-red-50"
                            onClick={() => rejectChatRequest(request)}
                          >
                            <X className="w-4 h-4 mr-1.5" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRequestsOpen(false)}>{t('common.close')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto chat-scrollbar">
              {filteredChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium mb-1">No conversations yet</p>
                  <p className="text-sm text-gray-500 text-center">Start a conversation or create a team</p>
                </div>
              ) : (
                <div className="p-2">
                  {filteredChats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className={`w-full p-3 text-left transition-all duration-200 rounded-xl mb-1 group ${selectedChat?.id === chat.id
                        ? 'bg-brand-gradient text-white shadow-md'
                        : 'hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-sm transition-all ${selectedChat?.id === chat.id
                            ? 'bg-white/20 backdrop-blur-sm'
                            : chat.type === 'group'
                              ? 'bg-brand-gradient'
                              : 'bg-gradient-to-br from-[#9F001B] to-[#58143B]'
                            }`}>
                            {chat.type === 'group' ? (
                              <Users className="w-6 h-6" />
                            ) : (
                              <span className="text-lg font-semibold">{chat.name?.charAt(0).toUpperCase() || '?'}</span>
                            )}
                          </div>
                          {chat.type === 'direct' && chat.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm" title="Online"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-sm font-semibold truncate ${selectedChat?.id === chat.id ? 'text-white' : 'text-gray-900'
                              }`}>
                              {chat.name || 'Unnamed Chat'}
                            </p>
                            <span className={`text-xs flex-shrink-0 ${selectedChat?.id === chat.id ? 'text-white/80' : 'text-gray-500'
                              }`}>
                              {chat.timestamp}
                            </span>
                          </div>
                          {chat.type === 'group' && (
                            <p className={`text-xs mb-1 ${selectedChat?.id === chat.id ? 'text-white/80' : 'text-gray-500'
                              }`}>
                              {chat.members} members
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <p className={`text-xs truncate ${selectedChat?.id === chat.id ? 'text-white/90' : 'text-gray-600'
                              }`}>
                              {chat.lastMessage || 'No messages'}
                            </p>
                            {chat.unread > 0 && (
                              <Badge className={`ml-2 text-xs px-1.5 py-0.5 flex-shrink-0 ${selectedChat?.id === chat.id
                                ? 'bg-white/20 text-white'
                                : 'bg-[#9F001B] text-white'
                                }`}>
                                {chat.unread}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Messages Area */}
          <div className={`${selectedChat ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-white h-full border-l border-gray-200`}>
            {selectedChat ? (
              <div className="flex flex-col h-full">
                <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setSelectedChat(null)}
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </Button>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm ${selectedChat.type === 'group'
                        ? 'bg-brand-gradient'
                        : 'bg-gradient-to-br from-[#9F001B] to-[#58143B]'
                        }`}>
                        {selectedChat.type === 'group' ? (
                          <Users className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-semibold">{selectedChat.name?.charAt(0).toUpperCase() || '?'}</span>
                        )}
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900">{selectedChat.name || 'Unnamed Chat'}</h2>
                        {selectedChat.type === 'group' ? (
                          <p className="text-sm text-gray-500">{selectedChat.members} members</p>
                        ) : (
                          <p className={`text-sm ${onlineUsers.some(u => u.userId === selectedChat.otherUserId && u.status === 'online')
                            ? 'text-green-500'
                            : 'text-gray-400'
                            }`}>
                            {onlineUsers.some(u => u.userId === selectedChat.otherUserId && u.status === 'online')
                              ? 'Online'
                              : 'Offline'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedChat.type === 'group' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-600 hover:text-gray-900"
                            onClick={viewTeamMembers}
                            title="View team members"
                          >
                            <Eye className="w-5 h-5" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-600 hover:text-gray-900"
                                onClick={() => {
                                  setSelectedMembers([]);
                                  setIsAddMembersOpen(true);
                                }}
                                title="Add members"
                              >
                                <Plus className="w-5 h-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={deleteGroup}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Delete team"
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </>
                          )}
                        </>
                      )}

                      {/* Delete button for direct messages - available for both users */}
                      {selectedChat.type === 'direct' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={deleteDirectChat}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="flex-1 overflow-y-auto overflow-x-hidden px-6 chat-scrollbar bg-gray-50"
                  style={{ minHeight: 0 }}
                >
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full min-h-[400px]">
                      <div className="text-center bg-white rounded-xl p-8 shadow-sm border border-gray-200">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-md ${selectedChat.type === 'group'
                          ? 'bg-brand-gradient'
                          : 'bg-gradient-to-br from-[#9F001B] to-[#58143B]'
                          }`}>
                          {selectedChat.type === 'group' ? (
                            <Users className="w-10 h-10" />
                          ) : (
                            <span className="text-2xl font-bold">{selectedChat.name?.charAt(0).toUpperCase() || '?'}</span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedChat.name || 'Unnamed Chat'}</h3>
                        {selectedChat.type === 'group' && (
                          <p className="text-sm text-gray-500 mb-4">{selectedChat.members} members</p>
                        )}
                        <p className="text-gray-600 mb-2">No messages yet</p>
                        <p className="text-sm text-gray-500">Start the conversation!</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4">
                      <div className="space-y-4">
                        {messages.map((msg, index) => {
                          const isOwn = msg.senderId === user?.id;
                          const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.senderId !== msg.senderId);

                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${!isOwn && !showAvatar ? 'ml-12' : ''
                                }`}
                            >
                              {!isOwn && showAvatar && (
                                <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-white font-semibold text-sm mr-2 flex-shrink-0 self-end mb-1">
                                  {getSenderDisplayName(msg.sender).charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
                                {!isOwn && showAvatar && (
                                  <span className="text-xs text-gray-500 mb-1 ml-1">
                                    {getSenderDisplayName(msg.sender)}
                                  </span>
                                )}
                                <div
                                  className={`px-4 py-2.5 shadow-sm break-words relative group ${isOwn
                                    ? 'bg-brand-gradient text-white rounded-2xl rounded-tr-sm'
                                    : 'bg-white text-gray-900 border border-gray-200 rounded-2xl rounded-tl-sm'
                                    }`}
                                >
                                  <p className="text-sm leading-relaxed pr-12">{msg.content}</p>
                                  <span className={`text-[10px] absolute bottom-1 right-2 ${isOwn ? 'text-white/80' : 'text-gray-400'}`}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 p-4 bg-white border-t border-gray-200 z-10">
                  <div className="flex items-end gap-3">
                    {/* <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700 mb-1">
                      <Paperclip className="w-5 h-5" />
                    </Button> */}
                    <div className="flex-1 relative">
                      {showEmojiPicker && (
                        <div className="absolute bottom-14 right-0 z-50 shadow-xl rounded-xl border border-gray-200">
                          <EmojiPicker
                            onEmojiClick={(emojiObject) => {
                              setMessageInput((prev) => prev + emojiObject.emoji);
                            }}
                            width={300}
                            height={400}
                          />
                        </div>
                      )}
                      <Input
                        placeholder={t('chat.typeMessage')}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="pr-12 rounded-full border-gray-200 focus:border-[#9F001B] focus:ring-[#9F001B]/20 min-h-[44px] resize-none"
                        style={{ paddingTop: '12px', paddingBottom: '12px' }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 ${showEmojiPicker ? 'text-[#9F001B] bg-[#9F001B]/5' : ''}`}
                      >
                        <Smile className="w-5 h-5" />
                      </Button>
                    </div>
                    <Button
                      onClick={sendMessage}
                      className="rounded-full w-11 h-11 p-0 flex-shrink-0 bg-brand-gradient hover:opacity-90 text-white shadow-lg"
                      disabled={!messageInput.trim() || isSendingMessage}
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 bg-brand-gradient rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
                    <MessageCircle className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('chat.welcome')}</h2>
                  <p className="text-gray-600 mb-2">Select a conversation to start messaging</p>
                  <p className="text-sm text-gray-500">Choose a chat from the sidebar or create a new team</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Members Dialog */}
      <Dialog
        open={isAddMembersOpen}
        onOpenChange={(open) => {
          setIsAddMembersOpen(open);
          if (!open) setSelectedMembers([]);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Add Members to Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Select Members to Add</Label>
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                {allUsers
                  .filter((u) => {
                    // Filter out current user and users already in the team
                    if (u.id === user?.id) return false;

                    // Filter out existing members
                    // teamMembers contains { user: { id: ... } }
                    if (teamMembers.some((m: any) => m.user.id === u.id)) return false;

                    return true;
                  })
                  .map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers((prev) => [...prev, u.id]);
                          } else {
                            setSelectedMembers((prev) => prev.filter((id) => id !== u.id));
                          }
                        }}
                        className="rounded border-gray-300 text-[#9F001B] focus:ring-[#9F001B] w-4 h-4"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">{u.fullName}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {u.role}
                        </Badge>
                      </div>
                    </label>
                  ))}
                {allUsers.filter(u => u.id !== user?.id).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No users available to add</p>
                )}
              </div>
              {selectedMembers.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {selectedMembers.length} member{selectedMembers.length === 1 ? '' : 's'} selected
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddMembersOpen(false);
                  setSelectedMembers([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={addMembersToTeam}
                disabled={selectedMembers.length === 0}
                className={selectedMembers.length === 0 ? 'opacity-50 cursor-not-allowed' : 'bg-brand-gradient text-white hover:opacity-90'}
              >
                Add Members ({selectedMembers.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Members Dialog */}
      <Dialog open={isViewMembersOpen} onOpenChange={setIsViewMembersOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Team Members</DialogTitle>
            <DialogDescription>
              {isAdmin ? `View and manage team members for "${selectedChat?.name}"` : `${selectedChat?.name} · ${teamMembers.length} member${teamMembers.length !== 1 ? 's' : ''}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-64 overflow-y-auto border rounded-lg p-3">
              {teamMembers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No members found</p>
              ) : (
                <div className="space-y-2">
                  {teamMembers.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-white text-sm font-medium">
                          {member.user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900">{member.user.fullName}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {member.user.role}
                          </Badge>
                          {member.user.id === user?.id && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isAdmin && member.user.id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSingleMember(member.user.id, member.user.fullName)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                          title={`Remove ${member.user.fullName} from team`}
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="flex gap-3 justify-between items-center mt-4 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewMembersOpen(false);
                    setSelectedMembers([]);
                    setIsAddMembersOpen(true);
                  }}
                  className="gap-2 text-[#9F001B] hover:text-[#7d0016] hover:bg-[#9F001B]/5 border-[#9F001B]/30"
                >
                  <Plus className="w-4 h-4" />
                  Add Member
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewMembersOpen(false);
                    setSelectedMembersToRemove([]);
                  }}
                >
                  Close
                </Button>
              </div>
            )}

            {!isAdmin && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsViewMembersOpen(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              {selectedChat?.type === 'group' ? 'Delete Team' : 'Delete Conversation'}
            </DialogTitle>
            <DialogDescription>
              This action will permanently delete the {selectedChat?.type === 'group' ? 'team' : 'conversation'} and all its messages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-800 mb-2 font-medium">
                Are you sure you want to delete this {selectedChat?.type === 'group' ? 'team' : 'conversation'}?
              </p>
              <p className="text-sm text-red-700 mb-3">
                This action will permanently delete:
              </p>
              <ul className="text-sm text-red-700 ml-4 list-disc space-y-1">
                <li>
                  {selectedChat?.type === 'group'
                    ? `The team "${selectedChat?.name}"`
                    : `Your conversation with ${selectedChat?.name}`
                  }
                </li>
                <li>All messages in this {selectedChat?.type === 'group' ? 'team' : 'conversation'}</li>
                {selectedChat?.type === 'group' && <li>All team memberships</li>}
              </ul>
              <p className="text-sm text-red-800 mt-3 font-semibold">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteGroup}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {selectedChat?.type === 'group' ? 'Delete Team' : 'Delete Conversation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}