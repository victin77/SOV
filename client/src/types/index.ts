export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SELLER';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  whatsappNumber?: string;
  companyId?: string | null;
  company?: { id: string; name: string; slug: string };
  active?: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  lastSeenAt?: string | null;
  _count?: { leads: number; appointments: number };
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyWhatsAppConfig {
  provider: 'company_config' | 'env_fallback' | 'link_only';
  configured: boolean;
  enabled: boolean;
  phoneNumberId: string;
  apiVersion: string;
  tokenConfigured: boolean;
  verifyTokenConfigured: boolean;
  appSecretConfigured: boolean;
  updatedAt?: string | null;
  webhookPath: string;
}

export interface CompanySettingsResponse {
  company: Company;
  whatsappConfig: CompanyWhatsAppConfig;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  _count?: { leads: number };
}

export interface LeadTag {
  leadId: string;
  tagId: string;
  tag: Tag;
}

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  leads?: Lead[];
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  pipelinePosition?: number;
  status: LeadStatus;
  priority: Priority;
  score: number;
  value?: number;
  source?: string;
  notes?: string;
  lostReason?: string;
  wonDate?: string;
  lostDate?: string;
  createdAt: string;
  updatedAt: string;
  assignedToId?: string;
  stageId?: string;
  assignedTo?: { id: string; name: string; avatar?: string; email?: string };
  stage?: PipelineStage;
  tags?: LeadTag[];
  appointments?: Appointment[];
  activities?: Activity[];
  customFields?: { id: string; key: string; value: string }[];
  _count?: { appointments: number; activities: number };
}

export interface Appointment {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  completed: boolean;
  createdAt: string;
  leadId: string;
  userId: string;
  lead?: { id: string; name: string; company?: string; email?: string; phone?: string };
  user?: { id: string; name: string };
}

export interface Activity {
  id: string;
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  leadId: string;
  lead?: { id: string; name: string };
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
  userId: string;
  user?: { id: string; name: string; email: string; role: UserRole };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  link?: string;
  createdAt: string;
}

export interface WhatsAppMessage {
  id: string;
  type: string;
  direction: 'inbound' | 'outbound' | string;
  text: string;
  phone?: string | null;
  provider?: string | null;
  link?: string | null;
  createdAt: string;
}

export interface WhatsAppConversationLead {
  id: string;
  name: string;
  phone?: string | null;
  company?: string | null;
  status: LeadStatus;
  stageId?: string | null;
  stage?: PipelineStage;
  assignedTo?: { id: string; name: string; avatar?: string };
}

export interface WhatsAppConversation {
  lead: WhatsAppConversationLead;
  lastMessage: WhatsAppMessage | null;
}

export interface WhatsAppConversationThread {
  lead: WhatsAppConversationLead;
  messages: WhatsAppMessage[];
}

export interface WhatsAppStatus {
  provider: 'company_config' | 'env_fallback' | 'link_only';
  configured: boolean;
  enabled?: boolean;
  tokenConfigured: boolean;
  phoneNumberIdConfigured: boolean;
  verifyTokenConfigured: boolean;
  appSecretConfigured: boolean;
  webhookPath: string;
}

export interface DashboardData {
  kpis: {
    totalLeads: number;
    newLeadsThisMonth: number;
    newLeadsGrowth: string;
    wonThisMonth: number;
    wonGrowth: string;
    lostThisMonth: number;
    conversionRate: string;
    pipelineValue: number;
    wonValue: number;
  };
  charts: {
    leadsByStatus: { status: string; count: number }[];
    leadsBySource: { source: string; count: number }[];
    leadsByPriority: { priority: string; count: number }[];
  };
  topSellers: { id: string; name: string; avatar?: string; lastSeenAt?: string | null; totalLeads: number; wonThisMonth: number; wonValue: number }[];
  recentActivities: Activity[];
  upcomingAppointments: Appointment[];
}

export interface TrendData {
  month: string;
  created: number;
  won: number;
  lost: number;
}

export interface ImportPreviewRow {
  rowNumber: number;
  name: string;
  phone?: string | null;
  source?: string | null;
  status: LeadStatus;
  stageName?: string | null;
  owner?: string | null;
  tags: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
  willCreateStage: boolean;
  willCreateOwner: boolean;
  tagsToCreate: string[];
  issues: string[];
}

export interface ImportPreview {
  format: 'json' | 'xlsx';
  totalRows: number;
  validRows: number;
  canImport: boolean;
  newStages: string[];
  newTags: string[];
  newOwners: string[];
  unknownOwners: Array<{ rowNumber: number; owner: string }>;
  rows: ImportPreviewRow[];
}

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'Novo',
  CONTACTED: 'Contactado',
  QUALIFIED: 'Qualificado',
  PROPOSAL: 'Proposta',
  NEGOTIATION: 'Negociação',
  WON: 'Ganho',
  LOST: 'Perdido',
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-cyan-100 text-cyan-800',
  QUALIFIED: 'bg-purple-100 text-purple-800',
  PROPOSAL: 'bg-amber-100 text-amber-800',
  NEGOTIATION: 'bg-orange-100 text-orange-800',
  WON: 'bg-green-100 text-green-800',
  LOST: 'bg-red-100 text-red-800',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  SELLER: 'Vendedor',
};

export interface SuperAdminDashboard {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
  totalLeads: number;
  companies: SuperAdminCompany[];
}

export interface SuperAdminCompany {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  _count: {
    users: number;
    leads: number;
    pipelineStages: number;
    tags?: number;
    appointments?: number;
    activities?: number;
  };
  users?: { id: string; name: string; email: string; role: UserRole; active: boolean; lastSeenAt?: string | null; createdAt: string }[];
}
