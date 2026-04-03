import { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useSocket } from '@/hooks/useSocket';
import { MessageDeleteDialog, TeamDeleteDialog } from '../ui/confirmation-dialog';
import { 
  MessageSquare,
  Send,
  Users,
  User,
  Clock,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  MoreVertical,
  Circle,
  AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { toast } from 'sonner';

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

interface WorkerChatProps {
  userRole: string;
  userId: string;
  userName: string;
}

export function WorkerChat({ userRole, userId, userName }: WorkerChatProps) {
  const [messageInput, setMessageInput] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [roomMessages, setRoomMessages] = useState<Record<string, Message[]>>({});
  const [deleteMessageDialog, setDeleteMessageDialog] = useState<{
    open: boolean;
    messageId: string;
    content: string;
    senderName: string;
  }>({ open: false, messageId: '', content: '', senderName: '' });
  const [deleteTeamDialog, setDeleteTeamDialog] = useState<{
    open: boolean;
    roomId: string;
    teamName: string;
    memberCount: number;
  }>({ open: false, roomId: '', teamName: '', memberCount: 0 });
  const [hasRequestedAdminChat, setHasRequestedAdminChat] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    socket,
    isConnected,
    rooms,
    messages,
    onlineUsers,
    chatRequests,
    sendMessage,
    deleteMessage,
    joinRoom,
    requestAdminChat,
    approveChatRequest,
    rejectChatRequest,
    onNewMessage,
    onMessageDeleted,
    onNewRoom,
    onChatRequest,
    onChatApproved,
    onChatRejected,
    onConfirmMessageDeletion,
    onConfirmTeamDeletion,
    onError,
  } = useSocket(userId);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [roomMessages, selectedRoom]);

  // Load messages for selected room
  useEffect(() => {
    if (selectedRoom && !roomMessages[selectedRoom]) {
      loadRoomMessages(selectedRoom);
    }
  }, [selectedRoom]);

  const loadRoomMessages = async (roomId: string) => {
    try {
      const response = await fetch(`/api/chat-messages?roomId=${roomId}`);
      const data = await response.json();
      
      if (response.ok) {
        setRoomMessages(prev => ({
          ...prev,
          [roomId]: data.messages
        }));
      } else {
        toast.error(data.error || 'Failed to load messages');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  // Socket event handlers
  useEffect(() => {
    onNewMessage((message) => {
      setRoomMessages(prev => ({
        ...prev,
        [message.roomId]: [...(prev[message.roomId] || []), message]
      }));
      
      // Show notification if message is not from current user and not in current room
      if (message.senderId !== userId && message.roomId !== selectedRoom) {
        const room = rooms.find(r => r.id === message.roomId);
        toast.info(`New message in ${room?.name || 'Chat'}`, {
          description: `${message.sender.fullName}: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`
        });
      }
    });

    onMessageDeleted((data) => {
      setRoomMessages(prev => {
        const newMessages = { ...prev };
        Object.keys(newMessages).forEach(roomId => {
          newMessages[roomId] = newMessages[roomId].filter(msg => msg.id !== data.messageId);
        });
        return newMessages;
      });
      toast.info(`Message deleted by ${data.deletedBy}`);
    });

    onNewRoom((room) => {
      toast.success(`Added to ${room.isGroup ? 'team' : 'chat'}: ${room.name}`);
    });

    onChatRequest((request) => {
      toast.info(`Chat request from ${request.userName}`, {
        description: `${request.userRole} wants to chat with admin`,
        action: {
          label: 'View',
          onClick: () => {
            // Handle chat request view
          }
        }
      });
    });

    onChatApproved((data) => {
      toast.success(`Chat approved by ${data.adminName}`);
      setHasRequestedAdminChat(false);
    });

    onChatRejected((data) => {
      toast.error(`Chat request rejected by ${data.adminName}`, {
        description: data.reason
      });
      setHasRequestedAdminChat(false);
    });

    onConfirmMessageDeletion((data) => {
      setDeleteMessageDialog({
        open: true,
        messageId: data.messageId,
        content: data.content,
        senderName: data.senderName
      });
    });

    onConfirmTeamDeletion((data) => {
      setDeleteTeamDialog({
        open: true,
        roomId: data.roomId,
        teamName: data.teamName,
        memberCount: data.memberCount
      });
    });

    onError((error) => {
      toast.error(error);
    });
  }, [userId, selectedRoom, rooms]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedRoom) return;
    
    sendMessage(selectedRoom, messageInput.trim());
    setMessageInput('');
  };

  const handleDeleteMessage = (messageId: string) => {
    deleteMessage(messageId, false); // First call to get confirmation
  };

  const confirmDeleteMessage = () => {
    deleteMessage(deleteMessageDialog.messageId, true); // Confirmed deletion
    setDeleteMessageDialog({ open: false, messageId: '', content: '', senderName: '' });
  };

  const handleRequestAdminChat = () => {
    if (hasRequestedAdminChat) {
      toast.info('You have already requested admin chat. Please wait for approval.');
      return;
    }
    
    requestAdminChat();
    setHasRequestedAdminChat(true);
    toast.info('Chat request sent to admin. Please wait for approval.');
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers.some(user => user.userId === userId && user.status === 'online');
  };

  const getDirectChatRooms = () => {
    return rooms.filter(room => !room.isGroup);
  };

  const getGroupChatRooms = () => {
    return rooms.filter(room => room.isGroup);
  };

  const getCurrentRoomMessages = () => {
    return selectedRoom ? (roomMessages[selectedRoom] || []) : [];
  };

  const getUnreadCount = (roomId: string) => {
    // This would need to be implemented with read receipts
    return 0;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Connection Status */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 border-b">
        <Circle className={`w-3 h-3 ${isConnected ? 'text-green-500 fill-green-500' : 'text-red-500 fill-red-500'}`} />
        <span className="text-sm text-gray-600">
          {isConnected ? 'Connected' : 'Connecting...'}
        </span>
        {onlineUsers.length > 0 && (
          <span className="text-xs text-gray-500 ml-auto">
            {onlineUsers.length} online
          </span>
        )}
      </div>

      <Tabs defaultValue="admin" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="admin">
            <User className="w-4 h-4 mr-2" />
            Admin Chat
            {getDirectChatRooms().length === 0 && (
              <AlertCircle className="w-4 h-4 ml-2 text-orange-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="groups">
            <Users className="w-4 h-4 mr-2" />
            Team Chats
            {getGroupChatRooms().reduce((sum, room) => sum + getUnreadCount(room.id), 0) > 0 && (
              <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5">
                {getGroupChatRooms().reduce((sum, room) => sum + getUnreadCount(room.id), 0)}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Admin Chat Tab */}
        <TabsContent value="admin" className="flex-1 flex flex-col mt-4 space-y-4">
          {getDirectChatRooms().length === 0 ? (
            // No admin chat available
            <Card className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <User className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Admin Chat Available</h3>
              <p className="text-sm text-gray-600 mb-4">
                You need admin approval to start chatting. Click the button below to request access.
              </p>
              <Button 
                onClick={handleRequestAdminChat}
                disabled={hasRequestedAdminChat || !isConnected}
                className="bg-brand-gradient hover:opacity-90"
              >
                {hasRequestedAdminChat ? 'Request Sent' : 'Request Admin Chat'}
              </Button>
            </Card>
          ) : (
            // Admin chat interface
            <Card className="flex-1 flex flex-col overflow-hidden">
              {/* Chat Header */}
              <div className="bg-brand-50 border-b px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-gradient rounded-full flex items-center justify-center text-white shadow-md">
                    A
                  </div>
                  <div>
                    <h3 className="text-gray-900">Admin</h3>
                    <p className="text-xs text-gray-500">Always available</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {getCurrentRoomMessages().map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === userId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${message.senderId === userId ? 'order-2' : 'order-1'}`}>
                        {message.senderId !== userId && (
                          <p className="text-xs text-gray-500 mb-1 ml-2">{message.sender.fullName}</p>
                        )}
                        <div className="relative group">
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              message.senderId === userId
                                ? 'bg-brand-gradient text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <div className={`flex items-center gap-1 mt-1 text-xs ${
                              message.senderId === userId ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              <Clock className="w-3 h-3" />
                              <span>{new Date(message.createdAt).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit' 
                              })}</span>
                            </div>
                          </div>
                          
                          {/* Message actions */}
                          {(message.senderId === userId || userRole === 'admin') && (
                            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 bg-white shadow-md">
                                    <MoreVertical className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteMessage(message.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Message
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" disabled>
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" disabled>
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                    disabled={!isConnected || !selectedRoom}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || !isConnected || !selectedRoom}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Group Chats Tab */}
        <TabsContent value="groups" className="flex-1 flex flex-col mt-4 space-y-4">
          {selectedRoom && getGroupChatRooms().find(r => r.id === selectedRoom) ? (
            // Selected Group Chat
            <Card className="flex-1 flex flex-col overflow-hidden">
              {/* Chat Header */}
              <div className="bg-green-50 border-b px-4 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRoom(null)}
                  className="mb-2 -ml-2"
                >
                  ← Back to chats
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-gray-900">
                      {getGroupChatRooms().find(r => r.id === selectedRoom)?.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {getGroupChatRooms().find(r => r.id === selectedRoom)?.members.length} members
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {getCurrentRoomMessages().map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === userId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${message.senderId === userId ? 'order-2' : 'order-1'}`}>
                        {message.senderId !== userId && (
                          <p className="text-xs text-gray-500 mb-1 ml-2">{message.sender.fullName}</p>
                        )}
                        <div className="relative group">
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              message.senderId === userId
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <div className={`flex items-center gap-1 mt-1 text-xs ${
                              message.senderId === userId ? 'text-green-100' : 'text-gray-500'
                            }`}>
                              <Clock className="w-3 h-3" />
                              <span>{new Date(message.createdAt).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit' 
                              })}</span>
                            </div>
                          </div>
                          
                          {/* Message actions */}
                          {(message.senderId === userId || userRole === 'admin') && (
                            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 bg-white shadow-md">
                                    <MoreVertical className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteMessage(message.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Message
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" disabled>
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" disabled>
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                    disabled={!isConnected || !selectedRoom}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!messageInput.trim() || !isConnected || !selectedRoom}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            // Group Chat List
            <div className="space-y-3">
              {getGroupChatRooms().map(room => (
                <Card
                  key={room.id}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setSelectedRoom(room.id);
                    joinRoom(room.id);
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-gray-900 truncate">{room.name}</h3>
                          {getUnreadCount(room.id) > 0 && (
                            <Badge className="bg-red-500 text-white text-xs px-1.5">
                              {getUnreadCount(room.id)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {room.messages?.[0]?.content || 'No messages yet'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {room.messages?.[0] 
                            ? new Date(room.messages[0].createdAt).toLocaleString()
                            : new Date(room.createdAt).toLocaleString()
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {room.members.slice(0, 3).map((member, idx) => (
                      <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded flex items-center gap-1">
                        {isUserOnline(member.userId) && (
                          <Circle className="w-2 h-2 text-green-500 fill-green-500" />
                        )}
                        {member.user.fullName}
                      </span>
                    ))}
                    {room.members.length > 3 && (
                      <span className="text-xs text-gray-500">+{room.members.length - 3} more</span>
                    )}
                  </div>
                </Card>
              ))}

              {getGroupChatRooms().length === 0 && (
                <Card className="p-6 bg-gray-50 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-1">No team chats yet</p>
                  <p className="text-xs text-gray-500">
                    Admin will add you to relevant team chats
                  </p>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialogs */}
      <MessageDeleteDialog
        open={deleteMessageDialog.open}
        onOpenChange={(open) => setDeleteMessageDialog(prev => ({ ...prev, open }))}
        messageContent={deleteMessageDialog.content}
        senderName={deleteMessageDialog.senderName}
        onConfirm={confirmDeleteMessage}
      />

      <TeamDeleteDialog
        open={deleteTeamDialog.open}
        onOpenChange={(open) => setDeleteTeamDialog(prev => ({ ...prev, open }))}
        teamName={deleteTeamDialog.teamName}
        memberCount={deleteTeamDialog.memberCount}
        onConfirm={() => {
          // This would be handled by admin, not regular users
          setDeleteTeamDialog({ open: false, roomId: '', teamName: '', memberCount: 0 });
        }}
      />
    </div>
  );
}
