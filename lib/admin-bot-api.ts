/**
 * Admin Bot Management API Service
 * Uses internal API routes that proxy to the bot service
 * This ensures proper authentication and security
 */
const API_BASE = '/api/admin/bots';

export interface Bot {
  id: string;
  restaurantId: string | null;
  name: string;
  restaurantName: string;
  whatsappNumber: string;
  accountSid: string;
  authToken: string;
  subaccountSid?: string | null;
  senderSid?: string | null;
  wabaId?: string | null;
  status: 'PENDING' | 'ACTIVE' | 'FAILED' | 'VERIFYING';
  verifiedAt?: string | null;
  errorMessage?: string | null;
  supportContact?: string | null;
  paymentLink?: string | null;
  isActive: boolean;
  maxMessagesPerMin: number;
  maxMessagesPerDay: number;
  createdAt: string;
  updatedAt: string;
  restaurant?: {
    id: string;
    name: string;
    phone?: string;
  };
}

export interface CreateBotRequest {
  name: string;
  restaurantName: string;
  whatsappNumber: string;
  accountSid: string;
  authToken: string;
  subaccountSid?: string;
  senderSid?: string;
  wabaId?: string;
  status?: 'PENDING' | 'ACTIVE' | 'FAILED' | 'VERIFYING';
  restaurantId?: string;
  supportContact?: string;
  paymentLink?: string;
  maxMessagesPerMin?: number;
  maxMessagesPerDay?: number;
}

/**
 * Get authentication headers with admin password
 */
function getAuthHeaders(): HeadersInit {
  // Admin password is stored in session after password verification
  const adminPassword = typeof window !== 'undefined' 
    ? sessionStorage.getItem('admin_password')
    : null;
  
  return {
    'Content-Type': 'application/json',
    ...(adminPassword && { 'Authorization': `Bearer ${adminPassword}` }),
  };
}

export async function listBots(): Promise<Bot[]> {
  const response = await fetch(API_BASE, {
    cache: 'no-store',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch bots');
  }
  
  return response.json();
}

export async function getBot(id: string): Promise<Bot> {
  const response = await fetch(`${API_BASE}/${id}`, {
    cache: 'no-store',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch bot');
  }
  
  return response.json();
}

export async function createBot(data: CreateBotRequest): Promise<Bot> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create bot');
  }
  
  return response.json();
}

export async function updateBot(id: string, data: Partial<CreateBotRequest>): Promise<Bot> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update bot');
  }
  
  return response.json();
}

export async function deleteBot(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete bot');
  }
}

// Known sender templates for quick-fill
export const KNOWN_SENDERS = {
  sufrah: {
    name: 'Sufrah Bot',
    restaurantName: 'Sufrah',
    whatsappNumber: 'whatsapp:+966508034010',
    senderSid: 'XE23c4f8b55966a1bfd101338f4c68b8cb',
    wabaId: '777730705047590',
    supportContact: 'info@sufrah.sa',
    status: 'ACTIVE' as const,
  },
  ocean: {
    name: 'Ocean Restaurant Bot',
    restaurantName: 'مطعم شاورما وفلافل أوشن',
    whatsappNumber: 'whatsapp:+966502045939',
    senderSid: 'XE803ebc75db963fdfa0e813d6f4f001f6',
    wabaId: '777730705047590',
    status: 'ACTIVE' as const,
  },
} as const;

