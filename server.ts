import { createServer } from 'http'
import next from 'next'
import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

// Store active user connections and their status
const userConnections = new Map<string, { socketId: string; status: 'online' | 'away' }>() // userId -> connection info
const socketToUser = new Map<string, string>() // socketId -> userId

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res)
  })

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? [process.env.ALLOWED_ORIGIN || '*']
        : '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true
  })

  io.on('connection', (socket) => {
    console.log('✅ Socket connected:', socket.id)

    // Log all incoming events for debugging
    const originalEmit = socket.emit;
    const originalOn = socket.on;

    socket.on = function (event: string, handler: (...args: any[]) => void | Promise<void>) {
      console.log(`🎧 Server listening for event: ${event}`);
      return originalOn.call(this, event, (...args: any[]) => {
        console.log(`📨 Server received event: ${event}`, args.length > 0 ? args[0] : 'no data');
        return handler(...args);
      });
    };

    // Ping/pong test
    socket.on('ping', () => socket.emit('pong'))

    // User connects and registers their socket
    socket.on('userConnect', async ({ userId }) => {
      try {
        console.log(`🔌 User ${userId} connecting with socket ${socket.id}`)

        // Store user connection
        userConnections.set(userId, { socketId: socket.id, status: 'online' })
        socketToUser.set(socket.id, userId)

        console.log(`✅ User ${userId} connected with socket ${socket.id}`)
        console.log(`📊 Total connections: ${userConnections.size}`)

        // Get user's chat rooms
        const rooms = await prisma.chatRoomMember.findMany({
          where: { userId, isApproved: true },
          include: {
            room: {
              include: {
                members: {
                  include: {
                    user: { select: { id: true, fullName: true, role: true } }
                  }
                }
              }
            }
          },
        })

        console.log(`📋 Found ${rooms.length} rooms for user ${userId}`)

        // Join all approved rooms
        rooms.forEach((member) => {
          socket.join(member.roomId)
          console.log(`🚪 User ${userId} joined room ${member.roomId}`)
        })

        // Notify user of successful connection and send their rooms
        socket.emit('userConnected', {
          userId,
          rooms: rooms.map(r => r.room),
          onlineUsers: Array.from(userConnections.keys())
        })

        console.log(`✅ User ${userId} connection complete`)

        // Notify other users that this user is online
        socket.broadcast.emit('userStatusChanged', { userId, status: 'online' })
      } catch (err) {
        console.error('User connect error:', err)
        socket.emit('error', 'Failed to connect user')
      }
    })

    // Update user status (online/away)
    socket.on('updateStatus', async ({ userId, status }) => {
      try {
        const connection = userConnections.get(userId)
        if (connection && connection.socketId === socket.id) {
          userConnections.set(userId, { ...connection, status })
          socket.broadcast.emit('userStatusChanged', { userId, status })
        }
      } catch (err) {
        console.error('Update status error:', err)
      }
    })

    // Admin sends direct message to user (no approval needed)
    socket.on('adminDirectMessage', async ({ fromUserId, toUserId, content }) => {
      console.log('🔥 ADMIN DIRECT MESSAGE EVENT RECEIVED!', { fromUserId, toUserId, content })

      try {
        console.log(`📨 Admin direct message request: ${fromUserId} -> ${toUserId}`)

        const sender = await prisma.users.findUnique({ where: { id: fromUserId } })

        if (!sender || sender.role !== 'admin') {
          console.log(`❌ Unauthorized: ${fromUserId} is not admin`)
          return socket.emit('error', 'Only admins can send direct messages')
        }

        console.log(`✅ Admin ${sender.fullName} authorized`)

        // Create or get direct message room
        let room = await prisma.chatRoom.findFirst({
          where: {
            isGroup: false,
            members: {
              some: {
                userId: fromUserId
              }
            }
          },
          include: {
            members: {
              include: {
                user: { select: { id: true, fullName: true, role: true } }
              }
            }
          }
        })

        // If room found, check if it contains both users
        if (room) {
          const memberUserIds = room.members.map(m => m.userId)
          const hasBothUsers = memberUserIds.includes(fromUserId) && memberUserIds.includes(toUserId)
          if (!hasBothUsers) {
            room = null // Not the right room
          }
        }

        console.log(`🔍 Existing room found: ${room ? room.id : 'none'}`)

        if (!room) {
          const recipient = await prisma.users.findUnique({ where: { id: toUserId } })
          console.log(`Creating new room between ${sender.fullName} and ${recipient?.fullName}`)

          room = await prisma.chatRoom.create({
            data: {
              name: `${sender.fullName} & ${recipient?.fullName}`,
              isGroup: false,
              members: {
                create: [
                  { userId: fromUserId, isApproved: true },
                  { userId: toUserId, isApproved: true },
                ],
              },
            },
            include: {
              members: {
                include: {
                  user: { select: { id: true, fullName: true, role: true } }
                }
              }
            }
          })

          console.log(`Room created with ID: ${room.id}`)

          // Make both users join the room
          const adminSocket = userConnections.get(fromUserId)
          const userSocket = userConnections.get(toUserId)

          console.log(`Admin socket: ${adminSocket?.socketId}, User socket: ${userSocket?.socketId}`)

          if (adminSocket) {
            console.log(`Emitting newRoom to admin ${fromUserId}`)
            io.to(adminSocket.socketId).emit('newRoom', room)
            io.sockets.sockets.get(adminSocket.socketId)?.join(room.id)
          } else {
            console.log(`⚠️ Admin socket not found for ${fromUserId}`)
          }

          if (userSocket) {
            console.log(`Emitting newRoom to user ${toUserId}`)
            io.to(userSocket.socketId).emit('newRoom', room)
            io.sockets.sockets.get(userSocket.socketId)?.join(room.id)
          } else {
            console.log(`⚠️ User socket not found for ${toUserId}`)
          }
        } else {
          console.log(`Using existing room: ${room.id}`)
        }

        // Only create message if content is provided
        if (content && content.trim()) {
          // Create message
          const message = await prisma.chatMessage.create({
            data: {
              roomId: room.id,
              senderId: fromUserId,
              content: content.trim(),
            },
            include: {
              sender: { select: { id: true, fullName: true, email: true, username: true, role: true } },
            },
          })

          console.log(`Message created: ${message.id}`)

          // Update room's updatedAt (Async)
          prisma.chatRoom.update({
            where: { id: room.id },
            data: { updatedAt: new Date() }
          }).catch(err => console.error('Failed to update room timestamp:', err))

          // Send to room
          io.to(room.id).emit('newMessage', message)
          console.log(`Message sent to room ${room.id}`)
        } else {
          console.log(`Room created without initial message`)
        }

        console.log(`✅ Admin ${fromUserId} created direct chat with user ${toUserId}`)
      } catch (err) {
        console.error('Admin direct message error:', err)
        socket.emit('error', 'Failed to send message')
      }
    })

    // Employee sends direct message to another employee (requires approval)
    socket.on('employeeDirectMessage', async ({ fromUserId, toUserId, content }) => {
      try {
        const sender = await prisma.users.findUnique({ where: { id: fromUserId } })
        const recipient = await prisma.users.findUnique({ where: { id: toUserId } })

        if (!sender || !recipient) {
          return socket.emit('error', 'User not found')
        }

        // Check if admin is involved (should use requestAdminChat or adminDirectMessage)
        if (sender.role === 'admin' || recipient.role === 'admin') {
          return socket.emit('error', 'Use requestAdminChat for admin communication')
        }

        // Create or get direct message room
        let room = await prisma.chatRoom.findFirst({
          where: {
            isGroup: false,
            members: {
              some: {
                userId: fromUserId
              }
            }
          },
          include: {
            members: {
              include: {
                user: { select: { id: true, fullName: true, role: true } }
              }
            }
          }
        })

        // If room found, check if it contains both users
        if (room) {
          const memberUserIds = room.members.map((m: any) => m.userId)
          const hasBothUsers = memberUserIds.includes(fromUserId) && memberUserIds.includes(toUserId)
          if (!hasBothUsers) {
            room = null // Not the right room
          }
        }

        if (room) {
          // Room exists - check approval status
          const senderMember = room.members.find((m: any) => m.userId === fromUserId)
          const recipientMember = room.members.find((m: any) => m.userId === toUserId)

          if (!senderMember?.isApproved || !recipientMember?.isApproved) {
            return socket.emit('error', 'Chat is pending admin approval')
          }
        } else {
          // Create new room with approval pending for recipient

          room = await prisma.chatRoom.create({
            data: {
              name: `${sender.fullName} & ${recipient.fullName}`,
              isGroup: false,
              members: {
                create: [
                  { userId: fromUserId, isApproved: true }, // Sender approved (initiator)
                  { userId: toUserId, isApproved: false },  // Recipient pending admin approval
                ],
              },
            },
            include: {
              members: {
                include: {
                  user: { select: { id: true, fullName: true, role: true, email: true } }
                }
              }
            }
          })

          // Notify sender (they see the room but can't chat fully yet)
          const senderSocket = userConnections.get(fromUserId)
          if (senderSocket) {
            io.to(senderSocket.socketId).emit('newRoom', room)
            io.sockets.sockets.get(senderSocket.socketId)?.join(room.id)
          }

          // Notify all admins about the new request
          const pendingMember = room.members.find((m: any) => m.userId === toUserId)
          // Get all admins
          const admins = await prisma.users.findMany({
            where: { role: 'admin' },
          })

          admins.forEach((admin) => {
            const adminConnection = userConnections.get(admin.id)
            if (adminConnection) {
              io.to(adminConnection.socketId).emit('chatRequest', {
                id: pendingMember?.id,
                userId: toUserId,
                userName: recipient.fullName, // The user waiting
                userRole: recipient.role,
                userEmail: recipient.email,
                roomId: room?.id,
                requestDate: new Date(),
                requesterName: sender.fullName // Add who requested it
              })
            }
          })

          socket.emit('chatRequestSent', { message: 'Chat started. Admin must approve before recipient sees messages.' })
          return // Stop here, no message sent until approved
        }

        // Only send message if approved
        if (content && content.trim()) {
          // Create message
          const message = await prisma.chatMessage.create({
            data: {
              roomId: room.id,
              senderId: fromUserId,
              content: content.trim(),
            },
            include: {
              sender: { select: { id: true, fullName: true, email: true, username: true, role: true } },
            },
          })

          // Update room's updatedAt
          await prisma.chatRoom.update({
            where: { id: room.id },
            data: { updatedAt: new Date() }
          })

          // Send to room
          io.to(room.id).emit('newMessage', message)
          console.log(`Message sent in room ${room.id}`)
        }

      } catch (err) {
        console.error('Employee direct message error:', err)
        socket.emit('error', 'Failed to process request')
      }
    })

    // User requests to message admin
    socket.on('requestAdminChat', async ({ userId }) => {
      try {
        const user = await prisma.users.findUnique({ where: { id: userId } })

        if (!user) {
          return socket.emit('error', 'User not found')
        }

        // Only non-admin users can request chat
        if (user.role === 'admin') {
          return socket.emit('error', 'Admins cannot request chat')
        }

        // Check for existing PENDING request first (prevents duplicates from rapid clicks)
        const existingPending = await prisma.chatRoomMember.findFirst({
          where: {
            userId,
            isApproved: false,
            room: {
              isGroup: false,
              members: {
                some: {
                  user: { role: 'admin' }
                }
              }
            }
          }
        })

        if (existingPending) {
          return socket.emit('chatRequestSent', { message: 'Request sent to admin. Please wait for approval.' })
        }

        // Check if user already has APPROVED chat with admin
        const existingApproved = await prisma.chatRoomMember.findFirst({
          where: {
            userId,
            isApproved: true,
            room: {
              isGroup: false,
              members: {
                some: {
                  user: { role: 'admin' }
                }
              }
            }
          }
        })

        if (existingApproved) {
          return socket.emit('error', 'You already have a chat with admin')
        }

        // Get all admins
        const admins = await prisma.users.findMany({
          where: { role: 'admin' },
        })

        if (admins.length === 0) {
          return socket.emit('error', 'No admins available')
        }

        // Create a new chat room with pending request
        const room = await prisma.chatRoom.create({
          data: {
            name: `${user.fullName} & Admin`,
            isGroup: false,
            members: {
              create: [
                // Add admin as approved member
                { userId: admins[0].id, isApproved: true },
                // Add user as pending member (waiting for approval)
                { userId: userId, isApproved: false },
              ],
            },
          },
          include: {
            members: {
              include: {
                user: { select: { id: true, fullName: true, email: true, username: true, role: true } }
              }
            }
          }
        })

        // Notify all online admins about the new request
        admins.forEach((admin) => {
          const adminConnection = userConnections.get(admin.id)
          if (adminConnection) {
            io.to(adminConnection.socketId).emit('chatRequest', {
              id: room.members.find(m => m.userId === userId)?.id,
              userId,
              userName: user.fullName || user.email || user.username || 'User',
              userRole: user.role,
              userEmail: user.email,
              roomId: room.id,
              requestDate: new Date(),
            })
          }
        })

        socket.emit('chatRequestSent', { message: 'Request sent to admin. Please wait for approval.' })
      } catch (err) {
        console.error('Request admin chat error:', err)
        socket.emit('error', 'Failed to send chat request')
      }
    })

    // Admin approves user chat request
    socket.on('approveChatRequest', async ({ requestId, adminId }) => {
      try {
        const admin = await prisma.users.findUnique({ where: { id: adminId } })

        if (!admin || admin.role !== 'admin') {
          return socket.emit('error', 'Only admins can approve chat requests')
        }

        // Approve the chat request
        const updatedMember = await prisma.chatRoomMember.update({
          where: { id: requestId },
          data: { isApproved: true },
          include: {
            room: {
              include: {
                members: {
                  include: {
                    user: { select: { id: true, fullName: true, email: true, username: true, role: true } }
                  }
                }
              }
            },
            user: {
              select: { id: true, fullName: true, email: true, username: true, role: true }
            }
          }
        })

        const room = updatedMember.room
        const user = updatedMember.user

        // Admin only gets newRoom if admin is a member (admin-chat request). Not for employee-to-employee.
        const adminIsMember = room.members.some((m: { userId: string }) => m.userId === adminId)
        const adminSocket = userConnections.get(adminId)
        const userSocket = userConnections.get(user.id)

        if (adminIsMember && adminSocket) {
          io.to(adminSocket.socketId).emit('newRoom', room)
          io.sockets.sockets.get(adminSocket.socketId)?.join(room.id)
        }

        // Approved user gets newRoom + chatApproved
        if (userSocket) {
          io.to(userSocket.socketId).emit('newRoom', room)
          io.to(userSocket.socketId).emit('chatApproved', {
            roomId: room.id,
            adminName: admin.fullName
          })
          io.sockets.sockets.get(userSocket.socketId)?.join(room.id)
        }

        // Other room member (requester) gets newRoom too so they see chat in real-time
        const otherMember = room.members.find((m: { userId: string }) => m.userId !== user.id)
        if (otherMember) {
          const otherSocket = userConnections.get(otherMember.userId)
          if (otherSocket) {
            io.to(otherSocket.socketId).emit('newRoom', room)
            io.sockets.sockets.get(otherSocket.socketId)?.join(room.id)
          }
        }

        console.log(`Admin ${adminId} approved chat with user ${user.id}`)
      } catch (err) {
        console.error('Approve chat error:', err)
        socket.emit('error', 'Failed to approve chat')
      }
    })

    // Admin rejects user chat request
    socket.on('rejectChatRequest', async ({ requestId, adminId, reason }) => {
      try {
        const admin = await prisma.users.findUnique({ where: { id: adminId } })

        if (!admin || admin.role !== 'admin') {
          return socket.emit('error', 'Only admins can reject chat requests')
        }

        // Get the request details before deletion
        const member = await prisma.chatRoomMember.findUnique({
          where: { id: requestId },
          include: {
            user: { select: { id: true, fullName: true } },
            room: { include: { members: true } }
          }
        })

        if (!member) {
          return socket.emit('error', 'Chat request not found')
        }

        const userId = member.userId

        // Delete the member
        await prisma.chatRoomMember.delete({
          where: { id: requestId }
        })

        // If no approved members left, delete the room
        const approvedMembers = member.room.members.filter(m => m.isApproved && m.id !== requestId)
        if (approvedMembers.length === 0) {
          await prisma.chatRoom.delete({
            where: { id: member.roomId }
          })
        }

        // Notify user of rejection
        const userSocket = userConnections.get(userId)
        if (userSocket) {
          io.to(userSocket.socketId).emit('chatRejected', {
            reason: reason || 'Your chat request was declined',
            adminName: admin.fullName
          })
        }

        console.log(`Admin ${adminId} rejected chat request from user ${userId}`)
      } catch (err) {
        console.error('Reject chat error:', err)
        socket.emit('error', 'Failed to reject chat request')
      }
    })

    // Admin creates team (with duplicate prevention)
    socket.on('createTeam', async ({ adminId, teamName, memberIds }) => {
      try {
        // Verify identity
        const socketUserId = socketToUser.get(socket.id)
        if (socketUserId !== adminId) {
          console.log(`❌ Unauthorized: Socket user ${socketUserId} tried to create team as ${adminId}`)
          return socket.emit('error', 'Unauthorized identity')
        }

        const admin = await prisma.users.findUnique({ where: { id: adminId } })

        if (!admin || admin.role !== 'admin') {
          return socket.emit('error', 'Only admins can create teams')
        }

        // Check for duplicate team name
        const existingTeam = await prisma.chatRoom.findFirst({
          where: {
            name: teamName,
            isGroup: true
          }
        })

        if (existingTeam) {
          return socket.emit('error', 'A team with this name already exists')
        }

        // Validate all member IDs exist
        const members = await prisma.users.findMany({
          where: { id: { in: memberIds } }
        })

        if (members.length !== memberIds.length) {
          return socket.emit('error', 'Some selected users do not exist')
        }

        // Create team room
        const room = await prisma.chatRoom.create({
          data: {
            name: teamName,
            isGroup: true,
            members: {
              create: [
                { userId: adminId, isApproved: true },
                ...memberIds.map((memberId: string) => ({
                  userId: memberId,
                  isApproved: true,
                })),
              ],
            },
          },
          include: {
            members: {
              include: { user: { select: { id: true, fullName: true, role: true } } },
            },
          },
        })

        console.log(`Created room with ID: ${room.id}, name: ${room.name}, members: ${room.members.length}`)

        // Notify all team members (including admin) - WhatsApp style instant updates
        const allMembers = [adminId, ...memberIds]
        allMembers.forEach((memberId) => {
          const memberConnection = userConnections.get(memberId)
          if (memberConnection) {
            // Make user join the room first
            const memberSocket = io.sockets.sockets.get(memberConnection.socketId)
            if (memberSocket) {
              memberSocket.join(room.id)
              console.log(`User ${memberId} joined room ${room.id}`)
            }

            // Send complete room data for WhatsApp-like behavior
            const eventData = {
              room: {
                id: room.id,
                name: room.name,
                isGroup: room.isGroup,
                members: room.members
              },
              message: `You have been added to team "${teamName}"`
            }
            console.log(`Emitting teamCreated to ${memberId}:`, eventData)
            io.to(memberConnection.socketId).emit('teamCreated', eventData)
          }
        })

        console.log(`Admin ${adminId} created team "${teamName}" with ${memberIds.length} members`)
      } catch (err) {
        console.error('Create team error:', err)
        socket.emit('error', 'Failed to create team')
      }
    })

    // Admin adds members to existing team
    socket.on('addMembersToTeam', async ({ roomId, adminId, memberIds }) => {
      try {
        const admin = await prisma.users.findUnique({ where: { id: adminId } })

        if (!admin || admin.role !== 'admin') {
          return socket.emit('error', 'Only admins can add members to teams')
        }

        // Verify the room exists and is a group
        const room = await prisma.chatRoom.findUnique({
          where: { id: roomId },
          include: {
            members: {
              include: {
                user: { select: { id: true, fullName: true, role: true } }
              }
            }
          },
        })

        if (!room) {
          return socket.emit('error', 'Team not found')
        }

        if (!room.isGroup) {
          return socket.emit('error', 'Cannot add members to direct message rooms')
        }

        // Validate all member IDs exist and are not already in the team
        const existingMemberIds = room.members.map(m => m.userId)
        const newMemberIds = memberIds.filter((id: string) => !existingMemberIds.includes(id))

        if (newMemberIds.length === 0) {
          return socket.emit('error', 'All selected users are already in the team')
        }

        const newMembers = await prisma.users.findMany({
          where: { id: { in: newMemberIds } }
        })

        if (newMembers.length !== newMemberIds.length) {
          return socket.emit('error', 'Some selected users do not exist')
        }

        // Add new members to the team
        await prisma.chatRoomMember.createMany({
          data: newMemberIds.map((memberId: string) => ({
            roomId,
            userId: memberId,
            isApproved: true,
          })),
        })

        // Get updated room with all members
        const updatedRoom = await prisma.chatRoom.findUnique({
          where: { id: roomId },
          include: {
            members: {
              include: { user: { select: { id: true, fullName: true, role: true } } },
            },
          },
        })

        console.log(`Added ${newMemberIds.length} members to team ${roomId}`)

        // Notify all team members (including new ones) about the update
        const allMemberIds = updatedRoom?.members.map(m => m.userId) || []
        allMemberIds.forEach((memberId) => {
          const memberConnection = userConnections.get(memberId)
          if (memberConnection) {
            // Make new members join the room
            if (newMemberIds.includes(memberId)) {
              const memberSocket = io.sockets.sockets.get(memberConnection.socketId)
              if (memberSocket) {
                memberSocket.join(roomId)
                console.log(`New member ${memberId} joined room ${roomId}`)
              }
            }

            // Send updated team info to all members
            const eventData = {
              room: updatedRoom,
              newMembers: newMembers.map(m => m.fullName),
              message: `${newMembers.map(m => m.fullName).join(', ')} ${newMembers.length === 1 ? 'was' : 'were'} added to the team`
            }
            io.to(memberConnection.socketId).emit('membersAdded', eventData)
          }
        })

        console.log(`Admin ${adminId} added members to team "${room.name}"`)
      } catch (err) {
        console.error('Add members error:', err)
        socket.emit('error', 'Failed to add members to team')
      }
    })

    // Admin removes members from existing team
    socket.on('removeMembersFromTeam', async ({ roomId, adminId, memberIds }) => {
      console.log('🗑️ Remove members request received:', { roomId, adminId, memberIds });

      try {
        const admin = await prisma.users.findUnique({ where: { id: adminId } })

        if (!admin || admin.role !== 'admin') {
          console.log('❌ Unauthorized remove attempt by:', adminId);
          return socket.emit('error', 'Only admins can remove members from teams')
        }

        console.log('✅ Admin authorized:', admin.fullName);

        // Verify the room exists and is a group
        const room = await prisma.chatRoom.findUnique({
          where: { id: roomId },
          include: {
            members: {
              include: {
                user: { select: { id: true, fullName: true, role: true } }
              }
            }
          },
        })

        if (!room) {
          return socket.emit('error', 'Team not found')
        }

        if (!room.isGroup) {
          return socket.emit('error', 'Cannot remove members from direct message rooms')
        }

        // Validate member IDs exist in the team
        const existingMemberIds = room.members.map(m => m.userId)
        const membersToRemove = memberIds.filter((id: string) => existingMemberIds.includes(id))

        console.log('📋 Existing members:', existingMemberIds);
        console.log('🎯 Members to remove:', membersToRemove);

        if (membersToRemove.length === 0) {
          console.log('❌ No valid members to remove');
          return socket.emit('error', 'Selected users are not in the team')
        }

        // Don't allow removing the admin who created the team
        if (membersToRemove.includes(adminId)) {
          console.log('❌ Admin trying to remove themselves');
          return socket.emit('error', 'Cannot remove yourself from the team')
        }

        const removedMembers = await prisma.users.findMany({
          where: { id: { in: membersToRemove } }
        })

        console.log('👥 Found members to remove:', removedMembers.map(m => m.fullName));

        // Remove members from the team
        const deleteResult = await prisma.chatRoomMember.deleteMany({
          where: {
            roomId,
            userId: { in: membersToRemove }
          }
        })

        console.log('🗑️ Database deletion result:', deleteResult);

        // Get updated room with remaining members
        const updatedRoom = await prisma.chatRoom.findUnique({
          where: { id: roomId },
          include: {
            members: {
              include: { user: { select: { id: true, fullName: true, role: true } } },
            },
          },
        })

        console.log(`✅ Removed ${membersToRemove.length} members from team ${roomId}`)

        // Notify the admin who performed the removal
        socket.emit('memberRemovalSuccess', {
          removedMembers: removedMembers.map(m => ({ id: m.id, name: m.fullName })),
          remainingCount: updatedRoom?.members.length || 0
        });

        // Notify removed members that they were removed
        membersToRemove.forEach((memberId: string) => {
          const memberConnection = userConnections.get(memberId)
          if (memberConnection) {
            console.log(`🔔 Notifying removed member: ${memberId}`);
            io.to(memberConnection.socketId).emit('removedFromTeam', {
              roomId,
              teamName: room.name,
              removedBy: admin.fullName,
              message: `You were removed from team "${room.name}" by ${admin.fullName}`
            })
          }
        })

        // Notify remaining team members about the removal
        const remainingMemberIds = updatedRoom?.members.map(m => m.userId) || []
        console.log(`🔔 Notifying ${remainingMemberIds.length} remaining members`);
        remainingMemberIds.forEach((memberId) => {
          const memberConnection = userConnections.get(memberId)
          if (memberConnection) {
            io.to(memberConnection.socketId).emit('membersRemoved', {
              room: updatedRoom,
              removedMembers: removedMembers.map(m => m.fullName),
              message: `${removedMembers.map(m => m.fullName).join(', ')} ${removedMembers.length === 1 ? 'was' : 'were'} removed from the team`
            })
          }
        })

        console.log(`Admin ${adminId} removed members from team "${room.name}"`)
      } catch (err) {
        console.error('Remove members error:', err)
        socket.emit('error', 'Failed to remove members from team')
      }
    })

    // Admin deletes team (with confirmation)
    socket.on('deleteTeam', async ({ roomId, userId, confirmed }) => {
      try {
        console.log(`Delete team request: roomId=${roomId}, userId=${userId}, confirmed=${confirmed}`)

        const user = await prisma.users.findUnique({ where: { id: userId } })

        if (!user) {
          return socket.emit('error', 'User not found')
        }

        if (user.role !== 'admin') {
          return socket.emit('error', 'Only admins can delete teams')
        }

        // Verify the room exists and is a group
        const room = await prisma.chatRoom.findUnique({
          where: { id: roomId },
          include: {
            members: {
              include: {
                user: { select: { id: true, fullName: true, role: true } }
              }
            }
          },
        })

        if (!room) {
          return socket.emit('error', 'Team not found')
        }

        if (!room.isGroup) {
          return socket.emit('error', 'Cannot delete direct message rooms')
        }

        // Get all members before deletion
        const memberIds = room.members.map((m) => m.userId)

        // Delete the room (cascade will delete messages and members)
        await prisma.chatRoom.delete({
          where: { id: roomId },
        })

        // Notify all members (including the admin who deleted it)
        memberIds.forEach((memberId) => {
          const memberConnection = userConnections.get(memberId)
          if (memberConnection) {
            console.log(`🔔 Notifying user ${memberId} about team deletion`)
            io.to(memberConnection.socketId).emit('teamDeleted', {
              roomId,
              teamName: room.name,
              message: `Team "${room.name}" has been deleted by admin`
            })
          } else {
            console.log(`⚠️ User ${memberId} not connected, cannot notify about deletion`)
          }
        })

        console.log(`Team ${roomId} (${room.name}) deleted by admin ${userId}`)
      } catch (err) {
        console.error('Delete team error:', err)
        socket.emit('error', `Failed to delete team: ${err}`)
      }
    })

    // Test handler for debugging
    socket.on('testDirectChatDelete', (data) => {
      console.log('🧪 TEST DIRECT CHAT DELETE RECEIVED:', data)
      socket.emit('testDirectChatDeleteResponse', { success: true, message: 'Test handler working' })
    })

    // Delete direct chat (any participant can delete)
    console.log('🎧 Registering deleteDirectChat handler for socket:', socket.id)
    socket.on('deleteDirectChat', async ({ roomId, userId, confirmed }) => {
      console.log('🔥 DELETE DIRECT CHAT EVENT RECEIVED!', { roomId, userId, confirmed })

      try {
        console.log(`Delete direct chat request: roomId=${roomId}, userId=${userId}, confirmed=${confirmed}`)

        const user = await prisma.users.findUnique({ where: { id: userId } })

        if (!user) {
          console.log(`❌ User not found: ${userId}`)
          return socket.emit('error', 'User not found')
        }

        console.log(`✅ User found: ${user.fullName}`)

        // Verify the room exists and is a direct message
        const room = await prisma.chatRoom.findUnique({
          where: { id: roomId },
          include: {
            members: {
              include: {
                user: { select: { id: true, fullName: true, role: true } }
              }
            }
          },
        })

        if (!room) {
          console.log(`❌ Room not found: ${roomId}`)
          return socket.emit('error', 'Conversation not found')
        }

        console.log(`✅ Room found: ${room.name}, isGroup: ${room.isGroup}`)

        if (room.isGroup) {
          console.log(`❌ Cannot delete team chat with this method`)
          return socket.emit('error', 'Cannot delete team chats with this method')
        }

        // Verify user is a member of this direct chat
        const isMember = room.members.some(m => m.userId === userId)
        if (!isMember) {
          console.log(`❌ User ${userId} is not a member of room ${roomId}`)
          return socket.emit('error', 'You are not a member of this conversation')
        }

        console.log(`✅ User is a member of the conversation`)

        // Get all members before deletion
        const memberIds = room.members.map((m) => m.userId)
        const otherMember = room.members.find(m => m.userId !== userId)

        console.log(`📋 Room members: ${memberIds.join(', ')}`)
        console.log(`👤 Other member: ${otherMember?.user.fullName}`)

        // Delete the room (cascade will delete messages and members)
        console.log(`🗑️ Deleting room ${roomId}...`)
        await prisma.chatRoom.delete({
          where: { id: roomId },
        })
        console.log(`✅ Room deleted successfully`)

        // Notify all members
        memberIds.forEach((memberId) => {
          const memberConnection = userConnections.get(memberId)
          if (memberConnection) {
            console.log(`🔔 Notifying user ${memberId} about direct chat deletion`)
            io.to(memberConnection.socketId).emit('directChatDeleted', {
              roomId,
              deletedBy: user.fullName,
              otherUserName: otherMember?.user.fullName,
              message: `Conversation deleted by ${user.fullName}`
            })
          } else {
            console.log(`⚠️ User ${memberId} not connected, cannot notify about deletion`)
          }
        })

        console.log(`✅ Direct chat ${roomId} deleted by user ${userId}`)
      } catch (err) {
        console.error('❌ Delete direct chat error:', err)
        socket.emit('error', `Failed to delete conversation: ${err}`)
      }
    })

    // Join a chat room
    socket.on('joinRoom', async ({ roomId, userId }) => {
      try {
        console.log(`🚪 Join room request: roomId=${roomId}, userId=${userId}`)

        const member = await prisma.chatRoomMember.findUnique({
          where: { roomId_userId: { roomId, userId } },
        })

        if (!member || !member.isApproved) {
          console.log(`❌ User ${userId} not authorized to join room ${roomId}`)
          return socket.emit('error', 'Not allowed to join this room')
        }

        socket.join(roomId)
        socket.emit('joinedRoom', roomId)
        console.log(`✅ User ${userId} successfully joined room ${roomId}`)
      } catch (err) {
        console.error('Join room error:', err)
        socket.emit('error', 'Failed to join room')
      }
    })

    // Send a message
    socket.on('sendMessage', async ({ roomId, senderId, content, tempId }) => {
      try {
        if (!content || content.trim().length === 0) {
          return socket.emit('error', 'Message content cannot be empty')
        }

        // 1. Check authorization (Fastest possible check)
        // Optimization: In a real scale app, we might cache membership in Redis/Map
        const member = await prisma.chatRoomMember.findUnique({
          where: { roomId_userId: { roomId, userId: senderId } },
          select: { isApproved: true } // Only fetch what's needed
        })

        if (!member || !member.isApproved) {
          console.log(`❌ User ${senderId} not authorized for room ${roomId}`)
          return socket.emit('error', 'Not allowed to send messages to this room')
        }

        // 2. Create message (DB Write)
        // We need the ID for the clients to confirm, so we must await this
        const message = await prisma.chatMessage.create({
          data: { roomId, senderId, content: content.trim() },
          include: {
            sender: { select: { id: true, fullName: true, email: true, username: true, role: true } },
          },
        })

        // 3. Broadcast to room IMMEDIATELY (Critical Path)
        // Do this before the secondary DB update
        const messageWithTempId = {
          ...message,
          tempId // Include tempId so client can replace optimistic message
        }

        io.to(roomId).emit('newMessage', messageWithTempId)
        console.log(`📤 Message broadcasted to room ${roomId} (Latency optimized)`)

        // 4. Update room's updatedAt (Background Task)
        // We don't await this to avoid blocking the event loop for the current request
        prisma.chatRoom.update({
          where: { id: roomId },
          data: { updatedAt: new Date() }
        }).catch(err => console.error('Failed to update room timestamp:', err))

      } catch (err) {
        console.error('Send message error:', err)
        socket.emit('error', 'Failed to send message')
      }
    })

    // Delete a message (with confirmation)
    socket.on('deleteMessage', async ({ messageId, userId, confirmed }) => {
      try {
        const message = await prisma.chatMessage.findUnique({
          where: { id: messageId },
          include: {
            sender: { select: { id: true, fullName: true, email: true, username: true, role: true } },
            room: {
              include: {
                members: {
                  include: {
                    user: { select: { id: true, role: true } }
                  }
                }
              }
            }
          }
        })

        if (!message) {
          return socket.emit('error', 'Message not found')
        }

        const user = await prisma.users.findUnique({ where: { id: userId } })

        // Check if user can delete this message (sender or admin)
        if (message.senderId !== userId && user?.role !== 'admin') {
          return socket.emit('error', 'You can only delete your own messages or admin can delete any message')
        }

        // If not confirmed, send confirmation request
        if (!confirmed) {
          return socket.emit('confirmMessageDeletion', {
            messageId,
            content: message.content,
            senderName: message.sender.fullName,
            canDelete: true
          })
        }

        // Delete the message
        await prisma.chatMessage.delete({
          where: { id: messageId }
        })

        // Notify all room members
        io.to(message.roomId).emit('messageDeleted', {
          messageId,
          deletedBy: user?.fullName,
          isAdmin: user?.role === 'admin'
        })

        console.log(`Message ${messageId} deleted by user ${userId}`)
      } catch (err) {
        console.error('Delete message error:', err)
        socket.emit('error', 'Failed to delete message')
      }
    })

    // Get online users
    socket.on('getOnlineUsers', () => {
      const onlineUsers = Array.from(userConnections.entries()).map(([userId, connection]) => ({
        userId,
        status: connection.status
      }))
      socket.emit('onlineUsers', onlineUsers)
    })

    socket.on('disconnect', () => {
      // Remove user from connections
      const userId = socketToUser.get(socket.id)
      if (userId) {
        userConnections.delete(userId)
        socketToUser.delete(socket.id)

        // Notify other users that this user is offline
        socket.broadcast.emit('userStatusChanged', { userId, status: 'offline' })
        console.log(`User ${userId} disconnected`)
      }
      console.log('❌ Socket disconnected:', socket.id)
    })
  })

  httpServer.listen(3000, '0.0.0.0', () => {
    console.log('🚀 Next.js + Socket.IO running on http://0.0.0.0:3000')
    console.log('🌍 Environment:', process.env.NODE_ENV)
    console.log('🔌 Socket.IO path: /socket.io')
  })
})
