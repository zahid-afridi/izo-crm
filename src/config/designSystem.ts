/**
 * IZOGRUP CRM - DESIGN SYSTEM
 * Complete design system with colors, patterns, and guidelines
 */

// ==================== COLOR SYSTEM ====================

export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',  // Main primary
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Secondary Brand Colors (Construction/Industrial)
  secondary: {
    50: '#fef3c7',
    100: '#fde68a',
    200: '#fcd34d',
    300: '#fbbf24',
    400: '#f59e0b',  // Main secondary (Orange/Amber for construction)
    500: '#d97706',
    600: '#b45309',
    700: '#92400e',
    800: '#78350f',
    900: '#451a03',
  },
  
  // Accent Colors
  accent: {
    cyan: '#06b6d4',
    teal: '#14b8a6',
    emerald: '#10b981',
    lime: '#84cc16',
  },
  
  // Role-Specific Colors
  roles: {
    admin: '#ef4444',        // Red - Full power
    productManager: '#8b5cf6', // Purple - Creative
    siteManager: '#f59e0b',    // Orange - Operations
    offerManager: '#06b6d4',   // Cyan - Sales
    worker: '#10b981',         // Green - Workforce
    salesAgent: '#ec4899',     // Pink - Customer-facing
    orderManager: '#6366f1',   // Indigo - Logistics
    officeEmployee: '#64748b', // Slate - Administrative
    websiteManager: '#8b5cf6', // Purple - Digital
  },
  
  // Status Colors
  status: {
    // Assignment/Work Status
    assigned: '#3b82f6',    // Blue
    inProgress: '#f59e0b',  // Orange
    completed: '#10b981',   // Green
    cancelled: '#ef4444',   // Red
    onHold: '#eab308',      // Yellow
    
    // Order Status
    pending: '#f59e0b',     // Orange
    confirmed: '#3b82f6',   // Blue
    processing: '#8b5cf6',  // Purple
    shipped: '#06b6d4',     // Cyan
    delivered: '#10b981',   // Green
    rejected: '#ef4444',    // Red
    
    // Offer Status
    draft: '#64748b',       // Gray
    sent: '#3b82f6',        // Blue
    viewed: '#06b6d4',      // Cyan
    accepted: '#10b981',    // Green
    declined: '#ef4444',    // Red
    expired: '#71717a',     // Zinc
    
    // Worker Status
    available: '#10b981',   // Green
    onSite: '#3b82f6',      // Blue
    inTransit: '#f59e0b',   // Orange
    offline: '#64748b',     // Gray
    dayOff: '#a855f7',      // Purple
    
    // Product Status
    published: '#10b981',   // Green
    unpublished: '#64748b', // Gray
    outOfStock: '#ef4444',  // Red
  },
  
  // Semantic Colors
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  
  // Neutral Colors
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
};

// ==================== GRADIENTS ====================

export const gradients = {
  primary: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  secondary: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  
  // Role-specific gradients
  admin: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  productManager: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
  siteManager: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  worker: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  
  // Special gradients
  sunset: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  ocean: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  forest: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
  royal: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
};

// ==================== SHADOWS ====================

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  
  // Colored shadows
  primaryGlow: '0 10px 40px -10px rgba(59, 130, 246, 0.5)',
  successGlow: '0 10px 40px -10px rgba(16, 185, 129, 0.5)',
  warningGlow: '0 10px 40px -10px rgba(245, 158, 11, 0.5)',
  errorGlow: '0 10px 40px -10px rgba(239, 68, 68, 0.5)',
};

// ==================== SPACING SYSTEM ====================

export const spacing = {
  0: '0px',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
};

// ==================== BORDER RADIUS ====================

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
};

// ==================== TYPOGRAPHY ====================

export const typography = {
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"Fira Code", "Courier New", monospace',
  },
  
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
};

// ==================== DESIGN PATTERNS ====================

export const patterns = {
  // Card Patterns
  card: {
    default: 'bg-white rounded-lg border border-gray-200 shadow-sm',
    hover: 'bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow',
    interactive: 'bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer',
    elevated: 'bg-white rounded-lg shadow-lg',
    flat: 'bg-white rounded-lg',
  },
  
  // Button Patterns
  button: {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
    outline: 'border-2 border-gray-300 bg-transparent hover:bg-gray-50 active:bg-gray-100',
    ghost: 'bg-transparent hover:bg-gray-100 active:bg-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
  },
  
  // Badge Patterns
  badge: {
    default: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    solid: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white',
    outline: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
    subtle: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  },
  
  // Input Patterns
  input: {
    default: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    error: 'w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent',
    success: 'w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
  },
  
  // Container Patterns
  container: {
    page: 'min-h-screen bg-gray-50',
    section: 'space-y-6',
    grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
    flex: 'flex items-center gap-4',
  },
};

// ==================== ANIMATION PATTERNS ====================

export const animations = {
  transition: {
    fast: 'transition-all duration-150 ease-in-out',
    base: 'transition-all duration-300 ease-in-out',
    slow: 'transition-all duration-500 ease-in-out',
  },
  
  hover: {
    scale: 'hover:scale-105 transition-transform duration-200',
    lift: 'hover:-translate-y-1 transition-transform duration-200',
    glow: 'hover:shadow-lg transition-shadow duration-200',
  },
  
  loading: {
    spin: 'animate-spin',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce',
  },
};

// ==================== BREAKPOINTS ====================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ==================== HELPER FUNCTIONS ====================

export const getStatusColor = (status: string): string => {
  const statusLower = status.toLowerCase().replace(/[_\s-]/g, '');
  
  // Assignment/Work status
  if (statusLower.includes('assign')) return colors.status.assigned;
  if (statusLower.includes('progress')) return colors.status.inProgress;
  if (statusLower.includes('complet')) return colors.status.completed;
  if (statusLower.includes('cancel')) return colors.status.cancelled;
  if (statusLower.includes('hold')) return colors.status.onHold;
  
  // Order status
  if (statusLower.includes('pending')) return colors.status.pending;
  if (statusLower.includes('confirm')) return colors.status.confirmed;
  if (statusLower.includes('process')) return colors.status.processing;
  if (statusLower.includes('ship')) return colors.status.shipped;
  if (statusLower.includes('deliver')) return colors.status.delivered;
  if (statusLower.includes('reject')) return colors.status.rejected;
  
  // Offer status
  if (statusLower.includes('draft')) return colors.status.draft;
  if (statusLower.includes('sent')) return colors.status.sent;
  if (statusLower.includes('view')) return colors.status.viewed;
  if (statusLower.includes('accept')) return colors.status.accepted;
  if (statusLower.includes('decline')) return colors.status.declined;
  if (statusLower.includes('expir')) return colors.status.expired;
  
  // Worker status
  if (statusLower.includes('available')) return colors.status.available;
  if (statusLower.includes('onsite') || statusLower.includes('site')) return colors.status.onSite;
  if (statusLower.includes('transit')) return colors.status.inTransit;
  if (statusLower.includes('offline')) return colors.status.offline;
  if (statusLower.includes('dayoff') || statusLower.includes('off')) return colors.status.dayOff;
  
  // Product status
  if (statusLower.includes('publish')) return colors.status.published;
  if (statusLower.includes('unpublish')) return colors.status.unpublished;
  if (statusLower.includes('stock')) return colors.status.outOfStock;
  
  // Default
  return colors.neutral[500];
};

export const getRoleColor = (role: string): string => {
  const roleKey = role.toLowerCase().replace(/[_\s-]/g, '') as keyof typeof colors.roles;
  return colors.roles[roleKey] || colors.neutral[500];
};

export const getRoleGradient = (role: string): string => {
  const roleKey = role.toLowerCase().replace(/[_\s-]/g, '');
  
  if (roleKey.includes('admin')) return gradients.admin;
  if (roleKey.includes('product')) return gradients.productManager;
  if (roleKey.includes('site')) return gradients.siteManager;
  if (roleKey.includes('worker')) return gradients.worker;
  
  return gradients.primary;
};

// ==================== EXPORT DEFAULT ====================

export default {
  colors,
  gradients,
  shadows,
  spacing,
  borderRadius,
  typography,
  patterns,
  animations,
  breakpoints,
  getStatusColor,
  getRoleColor,
  getRoleGradient,
};