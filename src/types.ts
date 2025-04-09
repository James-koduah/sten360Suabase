export interface Task {
  id: string;
  organization_id: string;
  worker_id: string;
  project_id: string;
  description?: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'delayed' | 'completed' | 'cancelled';
  amount: number;
  completed_at?: string;
  late_reason?: string;
  created_at: string;
  updated_at: string;
  status_changed_at?: string;
  delay_reason?: string;
  order_id?: string;
  project?: {
    id: string;
    name: string;
  };
  worker?: {
    id: string;
    name: string;
  };
  deductions?: {
    id: string;
    amount: number;
    reason: string;
    created_at: string;
  }[];
}

export interface Deduction {
  id: string;
  amount: number;
  reason: string;
  date: string;
}

export interface Worker {
  id: string;
  name: string;
  completedEarnings: number; // New field
  totalEarnings: number;
  image: string;
  whatsapp?: string;
  projectRates: Record<string, number>;
  workerProjects: Project[];
  taskStats: {
    allTime: number;
    weekly: number;
    daily: number;
  };
}

export interface Project {
  id: string;
  name: string;
  basePrice: number;
  description?: string;
  isEditing?: boolean;
}