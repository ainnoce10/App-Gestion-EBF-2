
export enum Site {
  ABIDJAN = 'Abidjan',
  BOUAKE = 'Bouaké',
  GLOBAL = 'Global'
}

export enum Period {
  DAY = 'Jour',
  WEEK = 'Semaine',
  MONTH = 'Mois',
  YEAR = 'Année'
}

export type Role = 'Admin' | 'Technicien' | 'Secretaire' | 'Magasinier' | 'Visiteur';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  site: Site;
  phone?: string;
}

export interface Technician {
  id: string;
  name: string;
  specialty: string;
  status: 'Available' | 'Busy' | 'Off';
  site: Site;
}

export interface StatData {
  date: string;
  revenue: number;
  interventions: number;
  profit: number;
  expenses: number;
  site: Site;
}

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  threshold: number;
  unit: string;
  site: Site;
}

export interface Intervention {
  id: string;
  site: Site;
  client: string;
  clientPhone?: string;
  location: string; 
  description: string;
  technicianId: string;
  technicianName?: string; // Nom affiché venant du profil
  date: string;
  status: 'Pending' | 'In Progress' | 'Completed'; // Mapped to Planifié, En cours, Exécuté
}

export interface DailyReport {
  id: string;
  technicianName: string;
  date: string;
  content?: string; 
  method: 'Text' | 'Voice' | 'Form';
  site: Site;
  
  // Champs détaillés
  domain?: string;
  interventionType?: string;
  location?: string;
  expenses?: number;
  revenue?: number;
  clientName?: string;
  clientPhone?: string;
  audioUrl?: string;
  rating?: number; // Note de satisfaction client (1-5)
}

export interface Transaction {
  id: string;
  type: 'Recette' | 'Dépense';
  amount: number;
  label: string;
  category: string;
  date: string;
  site: Site;
}

export interface TickerMessage {
  id: string;
  text: string;
  type: 'alert' | 'success' | 'info';
  display_order: number;
  isManual?: boolean; // Pour distinguer les messages admin des messages auto
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string; // From DB
  type: 'alert' | 'success' | 'info';
  read: boolean;
  path?: string;
}