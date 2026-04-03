// Utility to clean up old role cookies and localStorage
export function cleanupOldAuthData() {
  if (typeof window !== 'undefined') {
    // Clear old role cookie
    document.cookie = 'user-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    
    // Clear old localStorage entries
    localStorage.removeItem('user-role');
    
    console.log('🧹 Cleaned up old auth data (role cookies/localStorage)');
  }
}

// Call this once to clean up existing installations
export function initAuthCleanup() {
  cleanupOldAuthData();
}