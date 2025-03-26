export interface Task {
  id: string;
  workerId: string;
  projectType: string;
  date: string;
  amount: number;
  status: 'pending' | 'completed';
  description?: string;
  completedAt?: string;
  addedAt: string; // New field
  notes?: string;
  deductions?: Deduction[];
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