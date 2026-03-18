
export interface Participant {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar?: string | null;
  status: string;
  created_at?: string;
  balance?: number; // Calculated on frontend or separate query for now
  lastPayment?: string; // Calculated field
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  transactionCount: number;
  totalAmount: number;
  color: string;
  budget?: number;
  status: 'Ativo' | 'Inativo';
  closingDay?: number;
  dueDay?: number;
}

export interface Purchase {
  id: string;
  user_id: string;
  description: string;
  total_amount: number;
  date: string;
  category_id: string;
  observation?: string;
}

export interface Transaction {
  id: string;
  purchase_id: string;
  participant_id: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | string;
  type: 'single' | 'monthly' | 'installment';
  installment_number?: number;
  total_installments?: number;
}

export type AppView =
  | 'login'
  | 'register'
  | 'dashboard'
  | 'manage-categories'
  | 'edit-category'
  | 'category-details'
  | 'manage-participants'
  | 'edit-participant'
  | 'participant-details'

  | 'expenses'
  | 'settings';

export interface Notification {
  id: string;
  user_id: string;
  type: 'create' | 'delete' | 'update' | 'reminder';
  message: string;
  read: boolean;
  data?: any;
  created_at: string;
}
