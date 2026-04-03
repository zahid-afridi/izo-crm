'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { initAuthCleanup } from './auth-cleanup';

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
 
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check if user is logged in on mount
  useEffect(() => {
    // Clean up old role cookies/localStorage on first load
    initAuthCleanup();
    
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (res) => {
        console.log('Auth check response:', res.status);
        
        // Handle 404 - user not found, call logout to clear cookies
        if (res.status === 404) {
          try {
            // Call logout API to clear server-side cookies
            await fetch('/api/auth/logout', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            });
          } catch (logoutError) {
            console.error('Error calling logout API:', logoutError);
          }
          
          // Clear all auth-related cookies manually as fallback
          const cookiesToClear = ['auth-token', 'user-role', 'session'];
          cookiesToClear.forEach(cookieName => {
            document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${window.location.hostname};`;
            document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
          });
          
          // Clear localStorage if used
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-token');
            localStorage.removeItem('user-role');
            localStorage.removeItem('user');
            localStorage.removeItem('session');
          }
          
          setUser(null);
          setIsLoading(false);
          
          // Redirect to login
          router.push('/auth/login');
          return null;
        }
        
        return res.ok ? res.json() : null;
      })
      .then(data => {
        if (data?.user) {
          setUser({
            id: data.user.id,
            username: data.user.username,
            name: data.user.name || data.user.username,
            email: data.user.email,
            role: data.user.role,
          });
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error checking auth status:', error);
        setIsLoading(false);
      });
  }, [router]);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
   
    setUser({
      id: data.user.id,
      username: data.user.username,
      name: data.user.name || data.user.username,
      email: data.user.email,
      role: data.user.role,
    });

    // Redirect based on user role
    const role = data.user.role.toLowerCase();
    
    // Role-specific redirects
    const roleRedirects: Record<string, string> = {
      admin: '/dashboard',
      worker: '/workers',
      product_manager: '/products',
      site_manager: '/assignments',
      offer_manager: '/offers',
      sales_agent: '/orders',
      order_manager: '/orders',
      office_employee: '/orders',
      website_manager: '/website-manager'
    };

    const redirectPath = roleRedirects[role] || '/dashboard';
    window.location.href = redirectPath;
  };

  const logout = async () => {
    // Log the logout activity before clearing the user
    if (user?.id) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId: user.id }),
        }).catch(() => {});
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }
    
    // Clear all auth-related cookies manually as fallback
    const cookiesToClear = ['auth-token', 'user-role', 'session'];
    cookiesToClear.forEach(cookieName => {
      document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${window.location.hostname};`;
      document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
    });
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user-role');
      localStorage.removeItem('user');
      localStorage.removeItem('session');
    }
    
    setUser(null);
    router.push('/auth/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
