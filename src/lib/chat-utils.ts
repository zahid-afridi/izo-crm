/**
 * Chat utilities - human-readable helpers for display names and formatting
 */

export type ChatMemberUser = {
  fullName?: string
  email?: string
  username?: string
  role?: string
}

/**
 * Get display name for direct chat participant.
 * Shows "Admin" when non-admin user chats with admin; otherwise shows actual name/email.
 */
export function getDirectChatDisplayName(
  otherUser: ChatMemberUser | undefined,
  isAdmin: boolean
): string {
  if (!otherUser) return 'Unknown'
  if (otherUser.role === 'admin' && !isAdmin) return 'Admin'
  return otherUser.fullName || otherUser.email || otherUser.username || 'Unknown'
}

/**
 * Get display name for message sender (fullName, email, or username fallback)
 */
export function getSenderDisplayName(sender: ChatMemberUser | undefined): string {
  if (!sender) return 'Unknown'
  return sender.fullName || sender.email || sender.username || 'Unknown'
}

/**
 * Format timestamp for chat list - human-readable relative or absolute
 */
export function formatChatTimestamp(value: string | Date | undefined): string {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isToday = date.toDateString() === now.toDateString()
  const isYesterday = date.toDateString() === yesterday.toDateString()

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (isYesterday) return 'Yesterday'
  if (date.getFullYear() === new Date().getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })
}
