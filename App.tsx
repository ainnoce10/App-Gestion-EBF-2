
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  LayoutDashboard, Wrench, Briefcase, ShoppingCart, Menu, X, Bell, Search, Settings,
  HardHat, DollarSign, LogOut, Calculator, Users, Calendar, FolderOpen, Truck, 
  FileText, UserCheck, CreditCard, Archive, ShieldCheck, ClipboardList, ArrowLeft, ChevronRight, Mic, Send, Save, Plus, CheckCircle, Trash2, User, HelpCircle, Moon, Play, StopCircle, RefreshCw, FileInput, MapPin, Volume2, Megaphone, AlertCircle, Filter, TrendingUp, Edit, ArrowUp, ArrowDown, AlertTriangle, Loader2, Mail, Lock, UserPlus, ScanFace, Fingerprint, Phone, CheckSquare, Key, MoveUp, MoveDown, Eye, EyeOff, Sparkles, Target, RefreshCcw, Shield
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { DetailedSynthesis } from './components/DetailedSynthesis';
import { Site, Period, TickerMessage, StatData, DailyReport, Intervention, StockItem, Transaction, Profile, Role, Notification, Technician } from './types';
import { supabase } from './services/supabaseClient';

// --- Types for Navigation & Forms ---
interface ModuleAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  path: string;
  color: string;
  managedBy?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  description?: string;
  colorClass: string;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'email';
  options?: string[];
  placeholder?: string;
}

interface FormConfig {
  title: string;
  fields: FormField[];
}

// --- CONFIGURATION DES FORMULAIRES (CRUD) ---
const FORM_CONFIGS: Record<string, FormConfig> = {
  interventions: {
    title: 'Nouvelle Intervention',
    fields: [
      { name: 'client', label: 'Client', type: 'text' },
      { name: 'clientPhone', label: 'Tél Client', type: 'text' },
      { name: 'location', label: 'Lieu / Quartier', type: 'text' },
      { name: 'description', label: 'Description Panne', type: 'text' },
      { name: 'technicianId', label: 'ID Technicien (ex: T1)', type: 'text' },
      { name: 'date', label: 'Date Prévue', type: 'date' },
      { name: 'status', label: 'Statut', type: 'select', options: ['Pending', 'In Progress', 'Completed'] }
    ]
  },
  stocks: {
    title: 'Ajouter au Stock',
    fields: [
      { name: 'name', label: 'Nom Article', type: 'text' },
      { name: 'quantity', label: 'Quantité', type: 'number' },
      { name: 'unit', label: 'Unité (ex: pcs, m)', type: 'text' },
      { name: 'threshold', label: 'Seuil Alerte', type: 'number' },
      { name: 'site', label: 'Site', type: 'select', options: ['Abidjan', 'Bouaké'] }
    ]
  },
  technicians: {
     title: 'Nouveau Membre Équipe',
     fields: [
       { name: 'name', label: 'Nom & Prénom', type: 'text' },
       { name: 'specialty', label: 'Rôle / Spécialité', type: 'text' },
       { name: 'site', label: 'Site', type: 'select', options: ['Abidjan', 'Bouaké'] },
       { name: 'status', label: 'Statut', type: 'select', options: ['Available', 'Busy', 'Off'] }
     ]
  },
  reports: {
    title: 'Nouveau Rapport (Formulaire)',
    fields: [
      { name: 'technicianName', label: 'Nom Technicien', type: 'text' },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'content', label: 'Détails Intervention', type: 'text' },
      { name: 'domain', label: 'Domaine', type: 'select', options: ['Electricité', 'Froid', 'Bâtiment', 'Plomberie'] },
      { name: 'revenue', label: 'Recette (FCFA)', type: 'number' },
      { name: 'expenses', label: 'Dépenses (FCFA)', type: 'number' },
      { name: 'rating', label: 'Note Satisfaction (1-5)', type: 'number' },
      { name: 'method', label: 'Méthode', type: 'select', options: ['Form'] } // Hidden or fixed normally
    ]
  },
  // --- NOUVELLES CONFIGURATIONS ---
  chantiers: {
    title: 'Nouveau Chantier',
    fields: [
      { name: 'name', label: 'Nom du Chantier', type: 'text' },
      { name: 'location', label: 'Lieu', type: 'text' },
      { name: 'client', label: 'Client', type: 'text' },
      { name: 'site', label: 'Site (Ville)', type: 'select', options: ['Abidjan', 'Bouaké'] },
      { name: 'status', label: 'État', type: 'select', options: ['En cours', 'Terminé', 'Suspendu'] },
      { name: 'date', label: 'Date de début', type: 'date' }
    ]
  },
  transactions: {
    title: 'Écriture Comptable',
    fields: [
      { name: 'label', label: 'Libellé', type: 'text' },
      { name: 'amount', label: 'Montant (FCFA)', type: 'number' },
      { name: 'type', label: 'Type', type: 'select', options: ['Recette', 'Dépense'] },
      { name: 'category', label: 'Catégorie', type: 'select', options: ['Vente', 'Achat', 'Salaire', 'Loyer', 'Autre'] },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'site', label: 'Site', type: 'select', options: ['Abidjan', 'Bouaké'] }
    ]
  },
  employees: {
    title: 'Dossier RH',
    fields: [
      { name: 'full_name', label: 'Nom Complet', type: 'text' },
      { name: 'role', label: 'Poste', type: 'text' },
      { name: 'phone', label: 'Téléphone', type: 'text' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'site', label: 'Site', type: 'select', options: ['Abidjan', 'Bouaké'] },
      { name: 'salary', label: 'Salaire Base (FCFA)', type: 'number' },
      { name: 'date_hired', label: 'Date Embauche', type: 'date' }
    ]
  },
  payrolls: {
    title: 'Bulletin de Paie',
    fields: [
      { name: 'employee_name', label: 'Employé', type: 'text' },
      { name: 'amount', label: 'Montant Net (FCFA)', type: 'number' },
      { name: 'period', label: 'Mois concerné', type: 'text', placeholder: 'Ex: Mars 2024' },
      { name: 'date', label: 'Date paiement', type: 'date' },
      { name: 'status', label: 'Statut', type: 'select', options: ['Payé', 'En attente'] }
    ]
  },
  clients: {
    title: 'Nouveau Client',
    fields: [
      { name: 'name', label: 'Nom Client / Entreprise', type: 'text' },
      { name: 'phone', label: 'Téléphone', type: 'text' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'address', label: 'Adresse', type: 'text' },
      { name: 'site', label: 'Ville', type: 'select', options: ['Abidjan', 'Bouaké'] },
      { name: 'type', label: 'Type', type: 'select', options: ['Particulier', 'Entreprise'] }
    ]
  },
  caisse: {
    title: 'Mouvement Caisse',
    fields: [
      { name: 'label', label: 'Motif', type: 'text' },
      { name: 'amount', label: 'Montant (FCFA)', type: 'number' },
      { name: 'type', label: 'Flux', type: 'select', options: ['Entrée', 'Sortie'] },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'operator', label: 'Opérateur', type: 'text' }
    ]
  },
  suppliers: {
    title: 'Nouveau Fournisseur',
    fields: [
      { name: 'name', label: 'Nom Entreprise', type: 'text' },
      { name: 'contact', label: 'Contact Principal', type: 'text' },
      { name: 'phone', label: 'Téléphone', type: 'text' },
      { name: 'category', label: 'Spécialité', type: 'select', options: ['Électricité', 'Plomberie', 'Froid', 'Matériaux', 'Divers'] },
      { name: 'site', label: 'Zone', type: 'select', options: ['Abidjan', 'Bouaké', 'National'] }
    ]
  },
  purchases: {
    title: 'Bon d\'Achat',
    fields: [
      { name: 'item_name', label: 'Article / Service', type: 'text' },
      { name: 'supplier', label: 'Fournisseur', type: 'text' },
      { name: 'quantity', label: 'Quantité', type: 'number' },
      { name: 'cost', label: 'Coût Total (FCFA)', type: 'number' },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'status', label: 'Statut', type: 'select', options: ['Commandé', 'Reçu', 'Annulé'] }
    ]
  }
};

// --- Menu Configuration ---
const MAIN_MENU: MenuItem[] = [
  { id: 'accueil', label: 'Accueil', icon: LayoutDashboard, path: '/', description: 'Vue d\'ensemble', colorClass: 'text-orange-500' },
  { id: 'techniciens', label: 'Techniciens', icon: HardHat, path: '/techniciens', description: 'Gestion opérationnelle', colorClass: 'text-gray-600' },
  { id: 'comptabilite', label: 'Comptabilité', icon: Calculator, path: '/comptabilite', description: 'Finance & RH', colorClass: 'text-gray-600' },
  { id: 'secretariat', label: 'Secrétariat', icon: FolderOpen, path: '/secretariat', description: 'Administration', colorClass: 'text-gray-600' },
  { id: 'quincaillerie', label: 'Quincaillerie', icon: ShoppingCart, path: '/quincaillerie', description: 'Logistique & Stocks', colorClass: 'text-gray-600' },
  { id: 'equipe', label: 'Notre Équipe', icon: Users, path: '/equipe', description: 'Membres & Rôles', colorClass: 'text-gray-600' },
];

// --- Sub-Menu Configurations ---
const MODULE_ACTIONS: Record<string, ModuleAction[]> = {
  techniciens: [
    { 
      id: 'interventions', 
      label: 'Interventions', 
      description: 'Planning des interventions', 
      managedBy: 'Géré par le Superviseur',
      icon: Wrench, 
      path: '/techniciens/interventions', 
      color: 'bg-orange-500' 
    },
    { 
      id: 'rapports', 
      label: 'Rapports Journaliers', 
      description: 'Vocal ou Formulaire détaillé', 
      managedBy: 'Géré par les Techniciens',
      icon: FileText, 
      path: '/techniciens/rapports', 
      color: 'bg-gray-700' 
    },
    { 
      id: 'materiel', 
      label: 'Matériel', 
      description: 'Inventaire & Affectation', 
      managedBy: 'Géré par le Magasinier',
      icon: Truck, 
      path: '/techniciens/materiel', 
      color: 'bg-blue-600' 
    },
    { 
      id: 'chantiers', 
      label: 'Chantiers', 
      description: 'Suivi & Exécution', 
      managedBy: 'Géré par le Chef de Chantier',
      icon: ShieldCheck, 
      path: '/techniciens/chantiers', 
      color: 'bg-green-600' 
    },
  ],
  comptabilite: [
    { id: 'bilan', label: 'Bilan Financier', description: 'Journal des transactions', icon: DollarSign, path: '/comptabilite/bilan', color: 'bg-green-600' },
    { id: 'rh', label: 'Ressources Humaines', description: 'Dossiers du personnel', icon: Users, path: '/comptabilite/rh', color: 'bg-purple-600' },
    { id: 'paie', label: 'Paie & Salaires', description: 'Gestion des virements mensuels', icon: CreditCard, path: '/comptabilite/paie', color: 'bg-orange-500' },
  ],
  secretariat: [
    { id: 'planning', label: 'Planning', description: 'Agenda des équipes et rdv', icon: Calendar, path: '/secretariat/planning', color: 'bg-indigo-500' },
    { id: 'clients', label: 'Gestion Clients', description: 'Base de données CRM', icon: UserCheck, path: '/secretariat/clients', color: 'bg-blue-500' },
    { id: 'caisse', label: 'Caisse Menu', description: 'Suivi de la petite caisse', icon: Archive, path: '/secretariat/caisse', color: 'bg-gray-600' },
  ],
  quincaillerie: [
    { id: 'stocks', label: 'Stocks', description: 'État des stocks en temps réel', icon: ClipboardList, path: '/quincaillerie/stocks', color: 'bg-orange-600' },
    { id: 'fournisseurs', label: 'Fournisseurs', description: 'Liste et contacts partenaires', icon: Truck, path: '/quincaillerie/fournisseurs', color: 'bg-green-600' },
    { id: 'achats', label: 'Bons d\'achat', description: 'Historique des commandes', icon: FileText, path: '/quincaillerie/achats', color: 'bg-red-500' },
  ]
};

// --- Helper: Date Filter ---
const isInPeriod = (dateStr: string, period: Period): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (period === Period.DAY) {
    return itemDate.getTime() === today.getTime();
  } else if (period === Period.WEEK) {
    const day = today.getDay();
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diffToMonday);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    monday.setHours(0,0,0,0);
    friday.setHours(23,59,59,999);
    const itemDay = date.getDay();
    if (itemDay === 0 || itemDay === 6) return false;
    return itemDate >= monday && itemDate <= friday;
  } else if (period === Period.MONTH) {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  } else if (period === Period.YEAR) {
    return date.getFullYear() === now.getFullYear();
  }
  return true;
};

// --- Helper: Permission Check (STRICT) ---
const getPermission = (path: string, role: Role): { canWrite: boolean } => {
  if (role === 'Admin') return { canWrite: true }; // Admin a tous les droits
  if (role === 'Visiteur') return { canWrite: false }; // Visiteur n'a aucun droit d'écriture

  // Rôles internes spécifiques
  // Technicien écrit UNIQUEMENT dans /techniciens
  if (role === 'Technicien' && path.startsWith('/techniciens')) return { canWrite: true };
  
  // Magasinier écrit UNIQUEMENT dans /quincaillerie
  if (role === 'Magasinier' && path.startsWith('/quincaillerie')) return { canWrite: true };
  
  // Secrétaire écrit UNIQUEMENT dans /secretariat
  if (role === 'Secretaire' && path.startsWith('/secretariat')) return { canWrite: true };
  
  // TOUT LE RESTE (y compris /equipe, /comptabilite pour les non-admins) est strictement Lecture Seule
  return { canWrite: false };
};

// --- EBF Vector Logo (Globe + Plug) ---
const EbfSvgLogo = ({ size }: { size: 'small' | 'normal' | 'large' }) => {
    // Scaling factor
    const scale = size === 'small' ? 0.6 : size === 'large' ? 1.5 : 1;
    const width = 200 * scale;
    const height = 100 * scale;
    
    return (
        <svg width={width} height={height} viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="globeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#3b82f6', stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:'#16a34a', stopOpacity:1}} />
                </linearGradient>
            </defs>
            {/* Globe */}
            <circle cx="40" cy="40" r="30" fill="url(#globeGrad)" />
            {/* Continents (Stylized) */}
            <path d="M25,30 Q35,20 45,30 T55,45 T40,60 T25,45" fill="#4ade80" opacity="0.8"/>
            <path d="M50,20 Q60,15 65,25" fill="none" stroke="#a3e635" strokeWidth="2"/>
            
            {/* Cord */}
            <path d="M40,70 C40,90 80,90 80,50 L80,40" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round"/>
            
            {/* Plug - SQUARE (rx=0) */}
            <rect x="70" y="20" width="20" height="25" rx="0" fill="#e5e5e5" stroke="#9ca3af" strokeWidth="2" />
            <path d="M75,20 L75,10 M85,20 L85,10" stroke="#374151" strokeWidth="3" />
            
            {/* Cord Line */}
            <line x1="100" y1="10" x2="100" y2="80" stroke="black" strokeWidth="3" />
            
            {/* E.B.F Letters */}
            <text x="110" y="55" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="40" fill="#008000">E</text>
            <text x="135" y="55" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="40" fill="#000">.</text>
            <text x="145" y="55" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="40" fill="#FF0000">B</text>
            <text x="170" y="55" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="40" fill="#000">.</text>
            <text x="180" y="55" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="40" fill="#008000">F</text>
            
            {/* Banner Text */}
            <rect x="110" y="70" width="90" height="15" fill="#FF0000" />
            <text x="155" y="81" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="7" fill="white" textAnchor="middle">
                Electricité - Bâtiment - Froid
            </text>
        </svg>
    );
};

const EbfLogo = ({ size = 'normal' }: { size?: 'small' | 'normal' | 'large' }) => {
  const [imgError, setImgError] = useState(false);
  
  // Fallback to SVG if image fails
  if (imgError) {
      return <EbfSvgLogo size={size} />;
  }

  return (
    <div className="flex items-center justify-center">
        <img 
            src="/logo.png" 
            alt="EBF Logo" 
            className={`${size === 'small' ? 'h-10' : size === 'large' ? 'h-32' : 'h-16'} w-auto object-contain transition-transform duration-300 hover:scale-105`}
            onError={() => setImgError(true)} 
        />
    </div>
  );
};

// --- Module Placeholder (Generic List View) ---
const ModulePlaceholder = ({ title, subtitle, items = [], onBack, color, currentSite, currentPeriod, onAdd, onDelete, readOnly }: any) => {
    // Basic filtering based on Site and Date if available in items
    const filteredItems = items.filter((item: any) => {
        // Site filter
        if (currentSite && item.site && currentSite !== Site.GLOBAL && item.site !== currentSite) return false;
        // Period filter (only if item has a date)
        if (currentPeriod && item.date && !isInPeriod(item.date, currentPeriod)) return false;
        return true;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 bg-white rounded-full hover:bg-orange-50 shadow-sm transition border border-gray-100"><ArrowLeft size={20} className="text-gray-600 hover:text-ebf-orange"/></button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            {title}
                            {readOnly && <span className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200 ml-2"><Lock size={12}/> Lecture Seule</span>}
                        </h2>
                        <p className="text-gray-500">{subtitle}</p>
                    </div>
                </div>
                {!readOnly && onAdd && (
                    <button onClick={onAdd} className={`${color} text-white px-4 py-2 rounded-lg font-bold shadow-md hover:opacity-90 transition flex items-center gap-2 transform hover:-translate-y-0.5`}>
                        <Plus size={18}/> Ajouter
                    </button>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-100 dark:border-gray-600">
                            <tr>
                                <th className="p-4 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-300">ID</th>
                                <th className="p-4 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-300">Nom / Libellé</th>
                                <th className="p-4 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-300">Détails</th>
                                <th className="p-4 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-300">Site</th>
                                <th className="p-4 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-300">Statut / Montant</th>
                                {!readOnly && onDelete && <th className="p-4 text-right text-xs font-bold uppercase text-gray-500 dark:text-gray-300">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {filteredItems.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Aucune donnée trouvée.</td></tr>
                            ) : (
                                filteredItems.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-orange-50/30 dark:hover:bg-gray-750 transition">
                                        <td className="p-4 text-sm font-mono text-gray-400">#{item.id.substring(0, 4)}</td>
                                        <td className="p-4">
                                            <p className="font-bold text-gray-800 dark:text-white">
                                                {item.name || item.client || item.full_name || item.label || item.item_name || item.employee_name || 'Sans Nom'}
                                            </p>
                                            {item.clientPhone && <p className="text-xs text-gray-500">{item.clientPhone}</p>}
                                            {item.role && <p className="text-xs text-gray-500">{item.role}</p>}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                            {item.description || item.specialty || item.unit || item.category || item.supplier || '-'}
                                            {item.date && <span className="block text-xs text-gray-400">{item.date}</span>}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${item.site === 'Abidjan' ? 'bg-orange-100 text-orange-700 border border-orange-200' : item.site === 'Bouaké' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600'}`}>
                                                {item.site || 'Global'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {item.amount !== undefined || item.cost !== undefined || item.salary !== undefined ? (
                                                 <span className={`font-bold font-mono ${(item.type === 'Dépense' || item.type === 'Sortie') ? 'text-red-600' : 'text-green-700'}`}>
                                                    {(item.amount || item.cost || item.salary).toLocaleString()} F
                                                 </span>
                                            ) : item.status ? (
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'Available' || item.status === 'Completed' || item.status === 'Payé' || item.status === 'Terminé' ? 'bg-green-100 text-green-700' : item.status === 'Busy' || item.status === 'In Progress' || item.status === 'En cours' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {item.status}
                                                </span>
                                            ) : (
                                                <span className={`font-bold ${item.quantity <= (item.threshold || 0) ? 'text-red-500' : 'text-gray-800'}`}>
                                                    {item.quantity} {item.unit}
                                                </span>
                                            )}
                                        </td>
                                        {!readOnly && onDelete && (
                                            <td className="p-4 text-right">
                                                <button onClick={() => onDelete(item)} className="p-2 text-red-500 hover:bg-red-50 rounded transition"><Trash2 size={16}/></button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Report Mode Selector ---
const ReportModeSelector = ({ reports, onSelectMode, onBack, onViewReport, readOnly }: any) => {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 bg-white rounded-full hover:bg-orange-50 shadow-sm transition border border-gray-100"><ArrowLeft size={20} className="text-gray-600 hover:text-ebf-orange"/></button>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    Rapports Journaliers
                    {readOnly && <span className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200 ml-2"><Lock size={12}/> Lecture Seule</span>}
                </h2>
            </div>

            {!readOnly ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button onClick={() => onSelectMode('voice')} className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition flex flex-col items-center text-center group border border-blue-400 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Mic size={100} /></div>
                        <div className="bg-white/20 p-4 rounded-full mb-4 group-hover:bg-white/30 transition backdrop-blur-sm"><Mic size={40} /></div>
                        <h3 className="text-2xl font-bold mb-2">Rapport Vocal</h3>
                        <p className="text-blue-100">Dictez votre rapport, l'IA le rédige pour vous.</p>
                    </button>
                    <button onClick={() => onSelectMode('form')} className="bg-gradient-to-br from-ebf-orange to-orange-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition flex flex-col items-center text-center group border border-orange-400 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><FileText size={100} /></div>
                        <div className="bg-white/20 p-4 rounded-full mb-4 group-hover:bg-white/30 transition backdrop-blur-sm"><FileText size={40} /></div>
                        <h3 className="text-2xl font-bold mb-2">Formulaire Détaillé</h3>
                        <p className="text-orange-100">Saisie manuelle des travaux et finances.</p>
                    </button>
                </div>
            ) : (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg text-orange-800 text-center">
                    <p className="font-bold flex items-center justify-center gap-2"><Lock size={16}/> Création de rapports désactivée</p>
                    <p className="text-sm">Vous n'avez pas les droits pour créer de nouveaux rapports.</p>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Historique Récent</h3>
                <div className="space-y-3">
                    {reports.slice(0, 5).map((r: any) => (
                        <div key={r.id} onClick={() => onViewReport(r)} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-orange-50 cursor-pointer transition border border-gray-100 dark:border-gray-600 group">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition ${r.method === 'Voice' ? 'bg-blue-100 text-blue-600 group-hover:bg-blue-200' : 'bg-orange-100 text-orange-600 group-hover:bg-orange-200'}`}>
                                    {r.method === 'Voice' ? <Mic size={18} /> : <FileText size={18} />}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-white text-sm">{r.technicianName}</p>
                                    <p className="text-xs text-gray-500">{r.date}</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-gray-400 group-hover:text-ebf-orange"/>
                        </div>
                    ))}
                    {reports.length === 0 && <p className="text-gray-400 text-center italic">Aucun rapport.</p>}
                </div>
            </div>
        </div>
    );
};

// --- Help Modal ---
const HelpModal = ({ isOpen, onClose }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg p-6 shadow-2xl animate-fade-in border-t-4 border-green-500">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><HelpCircle className="text-green-500"/> Aide & Support</h3>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-red-500"/></button>
                </div>
                <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <p><strong>Flash Info :</strong> Les messages automatiques sont générés par l'IA en fonction de la rentabilité.</p>
                    <p><strong>Mode Sombre :</strong> Activez-le dans les paramètres pour réduire la fatigue visuelle.</p>
                    <p><strong>Export PDF :</strong> Disponible dans le tableau de bord pour imprimer les rapports.</p>
                    <p className="bg-orange-50 p-2 rounded border border-orange-100 text-orange-800"><strong>Support Technique :</strong> Contactez l'admin au 07 07 00 00 00.</p>
                </div>
            </div>
        </div>
    );
};

// --- Login Screen (Redesigned - Rich & Vibrant) ---
const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('Visiteur');
  const [site, setSite] = useState<Site>(Site.ABIDJAN);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccessMsg('');

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();
    const cleanName = fullName.trim();

    try {
      if (isResetMode) {
        if (authMethod !== 'email') throw new Error("La réinitialisation n'est disponible que par Email.");
        const { error } = await supabase.auth.resetPasswordForEmail(cleanIdentifier, { redirectTo: window.location.origin });
        if (error) throw error;
        setSuccessMsg("Lien envoyé ! Vérifiez vos emails."); setLoading(false); return;
      }

      if (isSignUp) {
        const metadata = { full_name: cleanName, role: role, site: site };
        let signUpResp;
        if (authMethod === 'email') {
          signUpResp = await supabase.auth.signUp({ email: cleanIdentifier, password: cleanPassword, options: { data: metadata } });
        } else {
          signUpResp = await supabase.auth.signUp({ phone: cleanIdentifier, password: cleanPassword, options: { data: metadata } });
        }

        if (signUpResp.error) throw signUpResp.error;

        // CRITICAL: Check if we have a session immediately
        if (signUpResp.data.session) {
             const userId = signUpResp.data.user?.id;
             if (userId) {
                 await supabase.from('profiles').upsert([{
                     id: userId,
                     email: authMethod === 'email' ? cleanIdentifier : '',
                     phone: authMethod === 'phone' ? cleanIdentifier : '',
                     full_name: cleanName,
                     role: role,
                     site: site
                 }]);
                 
                 if (role !== 'Visiteur') {
                     let specialty = role as string;
                     if (role === 'Admin') specialty = 'Administration';
                     await supabase.from('technicians').upsert([{
                         id: userId,
                         name: cleanName,
                         specialty: specialty,
                         site: site,
                         status: 'Available'
                     }]);
                 }
             }
             // DIRECT SUCCESS LOGIN
             onLoginSuccess();
             return; 
        } else {
             // NO SESSION = CONFIRMATION REQUIRED BY SERVER
             setIsSignUp(false);
             setSuccessMsg("Inscription réussie ! Vérifiez vos emails pour valider le compte avant de vous connecter.");
        }

      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword(
            authMethod === 'email' ? { email: cleanIdentifier, password: cleanPassword } : { phone: cleanIdentifier, password: cleanPassword }
        );
        
        if (err) throw err;
        onLoginSuccess();
      }
    } catch (err: any) {
        console.error("Auth Error:", err);
        let userMsg = "Une erreur technique est survenue.";
        // Normalize error message
        const msg = err.message || err.error_description || JSON.stringify(err);

        if (msg.includes("Invalid login credentials") || msg.includes("invalid_grant")) {
            userMsg = "Email ou mot de passe incorrect.";
        } else if (msg.includes("Email not confirmed")) {
            userMsg = "Votre email n'est pas encore confirmé. Vérifiez votre boîte mail (et les spams).";
        } else if (msg.includes("User already registered")) {
            userMsg = "Un compte existe déjà avec cet email/téléphone. Connectez-vous.";
        } else if (msg.includes("Password should be at least")) {
            userMsg = "Le mot de passe doit contenir au moins 6 caractères.";
        } else if (msg.includes("Phone signups are disabled")) {
            userMsg = "L'inscription par téléphone est désactivée. Utilisez l'email.";
        } else if (msg.includes("Failed to fetch") || msg.includes("Network request failed")) {
            userMsg = "Problème de connexion internet. Vérifiez votre réseau.";
        } else if (msg.includes("Too many requests") || msg.includes("rate_limit")) {
            userMsg = "Trop de tentatives. Veuillez patienter quelques minutes.";
        }

        setError(userMsg);
    } finally {
      setLoading(false); // STOP LOADING IN ALL CASES
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ebf-pattern p-4 font-sans relative">
       <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-orange-500/10 pointer-events-none"></div>
       <div className="glass-panel p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden animate-fade-in border-t-4 border-ebf-orange">
          <div className="flex flex-col items-center mb-8">
             {/* Logo SANS rounded-full - Square container */}
             <div className="bg-white p-4 shadow-lg mb-4">
                 <EbfLogo size="normal" />
             </div>
             <h2 className="text-2xl font-extrabold text-gray-800 mt-2 tracking-tight">
                 {isResetMode ? "Récupération" : (isSignUp ? "Rejoindre l'équipe" : "Espace Connexion")}
             </h2>
             <p className="text-gray-500 text-sm mt-1 font-medium">Gérez vos activités en temps réel</p>
          </div>
          {error && (<div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-r mb-6 text-sm font-medium flex items-center gap-2 animate-slide-in shadow-sm"><AlertCircle size={18} className="flex-shrink-0"/> <span>{error}</span></div>)}
          {successMsg && (<div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-3 rounded-r mb-6 text-sm font-medium flex items-center gap-2 animate-slide-in shadow-sm"><CheckCircle size={18} className="flex-shrink-0"/> <span>{successMsg}</span></div>)}
          {!isResetMode && (
            <div className="flex p-1 bg-gray-100 rounded-lg mb-6 shadow-inner">
               <button onClick={() => setAuthMethod('email')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all duration-300 ${authMethod === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Email</button>
               <button onClick={() => setAuthMethod('phone')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all duration-300 ${authMethod === 'phone' ? 'bg-white text-ebf-orange shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Téléphone</button>
            </div>
          )}
          <form onSubmit={handleAuth} className="space-y-4">
                {isSignUp && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Nom Complet</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-gray-400" size={18}/>
                                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ebf-orange focus:border-transparent outline-none transition text-gray-900 font-medium shadow-sm" placeholder="Ex: Jean Kouassi" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Rôle</label>
                                <select value={role} onChange={e => setRole(e.target.value as Role)} className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ebf-orange outline-none text-gray-900 font-medium appearance-none cursor-pointer shadow-sm">
                                    <option value="Visiteur">Visiteur</option>
                                    <option value="Technicien">Technicien</option>
                                    <option value="Secretaire">Secretaire</option>
                                    <option value="Magasinier">Magasinier</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Site</label>
                                <select value={site} onChange={e => setSite(e.target.value as Site)} className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ebf-orange outline-none text-gray-900 font-medium appearance-none cursor-pointer shadow-sm">
                                    <option value="Abidjan">Abidjan</option>
                                    <option value="Bouaké">Bouaké</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">{authMethod === 'email' ? 'Adresse Email' : 'Numéro de Téléphone'}</label>
                    <div className="relative">
                        {authMethod === 'email' ? <Mail className="absolute left-3 top-3 text-gray-400" size={18}/> : <Phone className="absolute left-3 top-3 text-gray-400" size={18}/>}
                        <input required value={identifier} onChange={e => setIdentifier(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ebf-orange focus:border-transparent outline-none transition text-gray-900 font-medium shadow-sm" placeholder={authMethod === 'email' ? 'exemple@ebf.ci' : '0707070707'} />
                    </div>
                </div>
                {!isResetMode && (
                <div>
                    <div className="flex justify-between items-center mb-1.5 ml-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Mot de passe</label>
                        {!isSignUp && <button type="button" onClick={() => setIsResetMode(true)} className="text-xs text-ebf-orange font-bold hover:underline">Oublié ?</button>}
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-gray-400" size={18}/>
                        <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ebf-orange focus:border-transparent outline-none transition text-gray-900 font-medium shadow-sm" placeholder="••••••••" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                             {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>
                )}
                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-ebf-orange to-orange-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:from-orange-600 hover:to-orange-700 transition duration-300 transform hover:-translate-y-0.5 mt-2 flex items-center justify-center gap-2 shadow-orange-200">
                    {loading ? <Loader2 className="animate-spin" size={20}/> : (isResetMode ? "Envoyer le lien" : (isSignUp ? "Créer mon compte" : "Se Connecter"))}
                </button>
            </form>
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
             <button onClick={() => { 
                 if (successMsg && !successMsg.includes("Inscription réussie")) {
                     setSuccessMsg('');
                     setIsSignUp(false);
                 } else if (successMsg && successMsg.includes("Inscription réussie")) {
                     setSuccessMsg('');
                     // Keep on login screen
                 } else {
                     setIsSignUp(!isSignUp); 
                     setIsResetMode(false); 
                     setError('');
                 }
             }} className="text-sm font-semibold text-gray-500 hover:text-orange-600 transition">
                {successMsg && !successMsg.includes("Inscription réussie") ? (
                    <span className="flex items-center justify-center gap-2 font-bold text-orange-600"><ArrowLeft size={16}/> Retour à la connexion</span>
                ) : (isSignUp ? "Déjà un compte ? Se connecter" : "Pas encore de compte ? S'inscrire")}
             </button>
          </div>
       </div>
    </div>
  );
};

// --- Onboarding Flow ---
const OnboardingFlow = ({ role, onComplete }: { role: string, onComplete: () => void }) => {
  const [step, setStep] = useState<'message' | 'biometric'>('message');
  const [error, setError] = useState('');

  useEffect(() => {
    if (step === 'message') {
      const timer = setTimeout(() => {
         setStep('biometric');
      }, 3000); 
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleEnableBiometrics = () => {
    if (window.PublicKeyCredential) {
      localStorage.setItem('ebf_biometric_active', 'true');
      onComplete();
    } else {
      setError("Votre appareil ne supporte pas l'authentification biométrique sécurisée.");
    }
  };

  const handleSkip = () => {
     localStorage.setItem('ebf_biometric_active', 'false');
     onComplete();
  };

  return (
     <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-900/50 backdrop-blur-md transition-all duration-700">
        {step === 'message' && (
           <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center border-t-4 border-ebf-green animate-fade-in relative overflow-hidden mx-4">
              <div className="mx-auto bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm border border-green-100">
                  <CheckCircle className="text-green-600 h-10 w-10" />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-800 mb-4">Connexion réussie</h3>
              <div className="text-gray-600 text-lg leading-relaxed">
                 Vous allez vous connecter en tant que<br/>
                 <span className="text-ebf-orange font-black text-2xl uppercase tracking-wide mt-2 block transform scale-105 transition-transform">
                    {role}
                 </span>
              </div>
           </div>
        )}

        {step === 'biometric' && (
           <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl max-w-md w-full mx-4 border-t-4 border-ebf-orange animate-slide-in relative overflow-hidden">
               <div className="absolute -top-10 -right-10 text-gray-50 opacity-50 pointer-events-none">
                  <ScanFace size={200} />
               </div>
               <div className="flex justify-center mb-8 relative z-10">
                  <div className="p-5 bg-orange-50 rounded-full text-ebf-orange shadow-inner ring-1 ring-orange-100">
                     <Fingerprint size={56} />
                  </div>
               </div>
               <h3 className="text-2xl font-bold text-center text-gray-800 mb-3 relative z-10">Connexion Rapide</h3>
               {error && <p className="text-red-500 bg-red-50 p-3 rounded-lg text-sm text-center mb-4 font-bold relative z-10">{error}</p>}
               <p className="text-gray-500 text-center mb-10 leading-relaxed relative z-10">
                  Souhaitez-vous activer la connexion par <strong className="text-gray-800">empreinte digitale</strong> ou <strong className="text-gray-800">reconnaissance faciale</strong> ?
               </p>
               <div className="space-y-3 relative z-10">
                  <button onClick={handleEnableBiometrics} className="w-full bg-ebf-orange text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-3">
                     <ScanFace size={22}/> Oui, activer
                  </button>
                  <button onClick={handleSkip} className="w-full bg-white text-gray-500 font-bold py-3.5 rounded-xl hover:bg-gray-50 border border-gray-200 transition-colors">
                     Plus tard
                  </button>
               </div>
           </div>
        )}
     </div>
  );
};

// --- Loading Screen ---
const LoadingScreen = () => (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-ebf-pattern">
        <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center backdrop-blur-sm border border-gray-100">
            <Loader2 size={48} className="text-ebf-orange animate-spin mb-4"/>
            <p className="text-gray-700 font-bold animate-pulse text-lg">Chargement EBF Manager...</p>
        </div>
    </div>
);

// --- Confirmation Modal ---
const ConfirmationModal = ({ 
  isOpen, onClose, onConfirm, title, message 
}: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm p-6 shadow-2xl animate-fade-in border-t-4 border-red-500">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600"><AlertTriangle size={28} /></div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
          <div className="flex gap-4 w-full">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-bold">Annuler</button>
            <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold shadow-md">Supprimer</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Add Item Modal (Generic) ---
const AddModal = ({ isOpen, onClose, config, onSubmit, loading }: any) => {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (isOpen) setFormData({}); 
  }, [isOpen]);

  const handleSubmit = () => {
    if (config.title.includes('Rapport') && !formData.method) {
        formData.method = 'Form';
    }
    onSubmit(formData);
  };

  if (!isOpen || !config) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6 shadow-2xl animate-fade-in border-t-4 border-ebf-orange">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{config.title}</h3>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {config.fields.map((field: FormField) => (
             <div key={field.name}>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{field.label}</label>
                {field.type === 'select' ? (
                   <select 
                     className="w-full border border-gray-200 p-2.5 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-ebf-orange focus:border-ebf-orange outline-none"
                     onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                     value={formData[field.name] || ''}
                   >
                     <option value="">Sélectionner...</option>
                     {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                   </select>
                ) : (
                   <input 
                     type={field.type} 
                     className="w-full border border-gray-200 p-2.5 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-ebf-orange focus:border-ebf-orange outline-none"
                     onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                     value={formData[field.name] || ''}
                     placeholder={field.placeholder || ''}
                   />
                )}
             </div>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
           <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50">Annuler</button>
           <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2.5 bg-ebf-orange text-white rounded-lg font-bold hover:bg-orange-600 transition shadow-md">
             {loading ? <Loader2 className="animate-spin mx-auto"/> : "Ajouter"}
           </button>
        </div>
      </div>
    </div>
  );
};

// --- Flash Info Configuration Modal ---
const FlashInfoModal = ({ isOpen, onClose, messages, onSaveMessage, onDeleteMessage }: any) => {
    const [newMessage, setNewMessage] = useState({ text: '', type: 'info' });
    
    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!newMessage.text) return;
        onSaveMessage(newMessage.text, newMessage.type);
        setNewMessage({ text: '', type: 'info' });
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl p-6 shadow-2xl animate-fade-in flex flex-col max-h-[85vh] border-t-4 border-blue-500">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Megaphone className="text-ebf-orange"/> Configuration Flash Info
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6 border border-gray-100">
                    <label className="block text-sm font-bold text-gray-900 dark:text-gray-200 mb-2">Ajouter un message manuel</label>
                    <div className="flex gap-2 mb-2">
                        <input 
                            value={newMessage.text}
                            onChange={(e) => setNewMessage({...newMessage, text: e.target.value})}
                            placeholder="Ex: Réunion générale demain à 10h"
                            className="flex-1 border border-gray-200 p-2 rounded bg-white text-gray-900 focus:ring-2 focus:ring-ebf-orange outline-none"
                        />
                        <select 
                            value={newMessage.type}
                            onChange={(e) => setNewMessage({...newMessage, type: e.target.value})}
                            className="border border-gray-200 p-2 rounded bg-white text-gray-900 outline-none cursor-pointer"
                        >
                            <option value="info">Info (Bleu)</option>
                            <option value="success">Succès (Vert)</option>
                            <option value="alert">Alerte (Rouge)</option>
                        </select>
                        <button onClick={handleSubmit} className="bg-ebf-orange text-white px-4 py-2 rounded font-bold hover:bg-orange-600">
                            Ajouter
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">Messages Actifs (Manuels)</h4>
                    <div className="space-y-2">
                        {messages.filter((m: TickerMessage) => m.isManual).length === 0 ? (
                            <p className="text-gray-400 text-sm italic text-center py-4">Aucun message manuel configuré.</p>
                        ) : (
                            messages.filter((m: TickerMessage) => m.isManual).map((msg: TickerMessage, idx: number) => (
                                <div key={msg.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded shadow-sm hover:shadow-md transition">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${msg.type === 'alert' ? 'bg-red-500' : msg.type === 'success' ? 'bg-green-500' : 'bg-blue-400'}`}></div>
                                        <span className="text-sm font-medium text-gray-800">{msg.text}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-mono">#{idx + 1}</span>
                                        <button onClick={() => onDeleteMessage(msg.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Profile Modal ---
const ProfileModal = ({ isOpen, onClose, profile }: any) => {
  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) setFormData({ full_name: profile.full_name || '', email: profile.email || '', phone: profile.phone || '' });
  }, [profile, isOpen]);

  const handleUpdate = async () => {
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ full_name: formData.full_name, phone: formData.phone }).eq('id', profile.id);
    if (!error && profile.role !== 'Visiteur') {
       await supabase.from('technicians').update({ name: formData.full_name }).eq('id', profile.id);
    }
    setLoading(false);
    if (error) alert("Erreur mise à jour profil");
    else { alert("Profil mis à jour !"); onClose(); window.location.reload(); }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6 shadow-2xl animate-fade-in border-t-4 border-purple-500">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Mon Profil</h3>
        <div className="space-y-4">
           <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Nom Complet</label><input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full border border-gray-200 p-2 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-ebf-orange outline-none" /></div>
           <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Email (Lecture seule)</label><input value={formData.email} disabled className="w-full border border-gray-200 p-2 rounded-lg bg-gray-100 text-gray-500" /></div>
           <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Téléphone</label><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-200 p-2 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-ebf-orange outline-none" /></div>
           <button onClick={handleUpdate} disabled={loading} className="w-full bg-ebf-orange text-white font-bold py-2.5 rounded-lg hover:bg-orange-600 shadow-md">{loading ? '...' : 'Enregistrer'}</button>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X /></button>
      </div>
    </div>
  );
};

// --- HEADER WITH NOTIFICATIONS ---
const HeaderWithNotif = ({ 
  title, onMenuClick, onLogout, onOpenFlashInfo, notifications, userProfile, userRole, markNotificationAsRead, onOpenProfile, onOpenHelp, darkMode, onToggleTheme, onResetBiometrics
}: any) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
    const unreadCount = notifications.filter((n: Notification) => !n.read).length;
    const notifRef = useRef<HTMLDivElement>(null);
    const settingsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) setShowDropdown(false);
            if (settingsRef.current && !settingsRef.current.contains(event.target)) setShowSettingsDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const canEditFlashInfo = userRole === 'Admin';

    return (
        <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 h-16 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
           <div className="flex items-center gap-4">
              <button onClick={onMenuClick} className="lg:hidden p-2 text-gray-600"><Menu/></button>
              <h2 className="text-lg font-extrabold text-green-950 hidden md:block tracking-tight">{title}</h2>
           </div>
           <div className="flex items-center gap-3">
               <div className="flex items-center gap-3 border-l pl-4 ml-2 border-gray-200">
                  <div className="hidden md:block text-right">
                     <p className="text-sm font-bold text-gray-800">{userProfile?.full_name || 'Utilisateur'}</p>
                     <p className="text-[10px] text-ebf-orange font-bold uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded-full inline-block">Mode: {userRole}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-lg shadow-inner border border-green-200">
                      {userProfile?.full_name ? userProfile.full_name.charAt(0) : <User size={20}/>}
                  </div>
               </div>
              <div className="relative ml-2" ref={notifRef}>
                 <button onClick={() => setShowDropdown(!showDropdown)} className="p-2 relative hover:bg-gray-100 rounded-full transition text-gray-600">
                     <Bell />
                     {unreadCount > 0 && <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm">{unreadCount}</span>}
                 </button>
                 {showDropdown && (
                     <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in z-50">
                         <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                             <h3 className="font-bold text-gray-800 text-sm">Notifications</h3>
                             <span className="text-xs text-gray-500">{unreadCount} non lues</span>
                         </div>
                         <div className="max-h-80 overflow-y-auto custom-scrollbar">
                             {notifications.length === 0 ? <div className="p-4 text-center text-gray-400 text-sm">Aucune notification</div> : 
                                 notifications.map((notif: Notification) => (
                                     <div key={notif.id} onClick={() => { markNotificationAsRead(notif); setShowDropdown(false); }} className={`p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition ${!notif.read ? 'bg-orange-50/20' : ''}`}>
                                         <div className="flex items-start gap-3">
                                             <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${notif.type === 'alert' ? 'bg-red-500' : notif.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                             <div>
                                                 <p className={`text-sm ${!notif.read ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{notif.title}</p>
                                                 <p className="text-xs text-gray-500 line-clamp-2">{notif.message}</p>
                                             </div>
                                         </div>
                                     </div>
                                 ))
                             }
                         </div>
                     </div>
                 )}
              </div>
              <div className="relative" ref={settingsRef}>
                 <button onClick={() => setShowSettingsDropdown(!showSettingsDropdown)} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600">
                    <Settings />
                 </button>
                 {showSettingsDropdown && (
                   <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-fade-in z-50">
                      <div className="py-2">
                         <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Mon Compte</div>
                         <button onClick={() => { onOpenProfile(); setShowSettingsDropdown(false); }} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200">
                             <User size={18} className="text-ebf-orange"/> Modifier Profil
                         </button>

                         {canEditFlashInfo && (
                            <>
                                <div className="border-t border-gray-100 dark:border-gray-700 my-2"></div>
                                <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Administration</div>
                                <button onClick={() => { onOpenFlashInfo(); setShowSettingsDropdown(false); }} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200">
                                    <Megaphone size={18} className="text-blue-500"/> Gestion Flash Info
                                </button>
                            </>
                         )}

                         <div className="border-t border-gray-100 dark:border-gray-700 my-2"></div>

                         <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Sécurité</div>
                         <button onClick={() => { onResetBiometrics(); setShowSettingsDropdown(false); }} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200">
                             <ScanFace size={18} className="text-purple-500"/> Réinitialiser Biométrie
                         </button>

                         <div className="border-t border-gray-100 dark:border-gray-700 my-2"></div>
                         
                         <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Application</div>
                         <button onClick={onToggleTheme} className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200">
                            <div className="flex items-center gap-3"><Moon size={18} className="text-indigo-500"/> Mode Sombre</div>
                            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${darkMode ? 'bg-indigo-500' : 'bg-gray-300'}`}><div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${darkMode ? 'translate-x-4' : 'translate-x-0'}`}></div></div>
                         </button>
                         <button onClick={() => { onOpenHelp(); setShowSettingsDropdown(false); }} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200">
                             <HelpCircle size={18} className="text-green-500"/> Aide & Support
                         </button>
                         
                         <div className="border-t border-gray-100 dark:border-gray-700 my-2"></div>
                         <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-sm font-bold text-red-600 bg-red-50/50">
                             <LogOut size={18}/> Se déconnecter
                         </button>
                      </div>
                   </div>
                 )}
              </div>
           </div>
        </header>
    )
};

const AppContent = ({ session, onLogout, userRole, userProfile }: any) => {
  const [currentPath, setCurrentPath] = useState('/');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentSite, setCurrentSite] = useState<Site>(Site.GLOBAL);
  const [currentPeriod, setCurrentPeriod] = useState<Period>(Period.MONTH);
  const [darkMode, setDarkMode] = useState(false);
  
  const [stats, setStats] = useState<StatData[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [manualTickerMessages, setManualTickerMessages] = useState<TickerMessage[]>([]);
  const [autoTickerMessages, setAutoTickerMessages] = useState<TickerMessage[]>([]);

  // NEW STATES FOR CONFIGURED MODULES
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [caisse, setCaisse] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFlashInfoOpen, setIsFlashInfoOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [crudTarget, setCrudTarget] = useState('');
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [crudLoading, setCrudLoading] = useState(false);

  const { canWrite } = getPermission(currentPath, userRole);

  const generateAutoTickerMessages = (data: StatData[]) => {
      const messages: TickerMessage[] = [];
      const calcPerf = (items: StatData[]) => {
          const revenue = items.reduce((acc, curr) => acc + curr.revenue, 0);
          const expenses = items.reduce((acc, curr) => acc + curr.expenses, 0);
          const profit = revenue - expenses;
          const percent = revenue > 0 ? (profit / revenue) * 100 : 0;
          return { profit, percent };
      };
      const todayStats = data.filter(d => isInPeriod(d.date, Period.DAY));
      if (todayStats.length > 0) {
          const { percent } = calcPerf(todayStats);
          if (percent !== 0) messages.push({ id: 'auto-day', text: percent > 0 ? `Félicitations ! Nous sommes à +${percent.toFixed(1)}% de bénéfice aujourd'hui.` : `Alerte : Nous sommes à ${percent.toFixed(1)}% de perte aujourd'hui.`, type: percent > 0 ? 'success' : 'alert', display_order: 100, isManual: false });
      }
      const weekStats = data.filter(d => isInPeriod(d.date, Period.WEEK));
      if (weekStats.length > 0) {
          const { percent } = calcPerf(weekStats);
          if (percent !== 0) messages.push({ id: 'auto-week', text: percent > 0 ? `Bravo ! Cette semaine enregistre +${percent.toFixed(1)}% de marge positive.` : `Attention ! Nous sommes à ${percent.toFixed(1)}% de perte cette semaine.`, type: percent > 0 ? 'success' : 'alert', display_order: 101, isManual: false });
      }
      const monthStats = data.filter(d => isInPeriod(d.date, Period.MONTH));
      if (monthStats.length > 0) {
          const { percent } = calcPerf(monthStats);
          if (percent !== 0) messages.push({ id: 'auto-month', text: percent > 0 ? `Excellent ! Le mois en cours est à +${percent.toFixed(1)}% de rentabilité.` : `Vigilance : Le cumul mensuel est à ${percent.toFixed(1)}%.`, type: percent > 0 ? 'success' : 'alert', display_order: 102, isManual: false });
      }
      const yearStats = data.filter(d => isInPeriod(d.date, Period.YEAR));
      if (yearStats.length > 0) {
           const { percent } = calcPerf(yearStats);
           if (percent !== 0) messages.push({ id: 'auto-year', text: `Bilan Annuel Global : ${percent > 0 ? '+' : ''}${percent.toFixed(1)}% de marge.`, type: percent > 0 ? 'info' : 'alert', display_order: 103, isManual: false });
      }
      setAutoTickerMessages(messages);
  };

  useEffect(() => {
    const fetchData = async () => {
      // Existing
      const { data: intervData } = await supabase.from('interventions').select('*');
      if (intervData) setInterventions(intervData);
      const { data: stockData } = await supabase.from('stocks').select('*');
      if (stockData) setStock(stockData);
      const { data: techData } = await supabase.from('technicians').select('*');
      if (techData) setTechnicians(techData);
      const { data: reportsData } = await supabase.from('reports').select('*');
      if (reportsData) setReports(reportsData);
      const { data: statsData } = await supabase.from('daily_stats').select('*');
      if (statsData) setStats(statsData);
      const { data: notifData } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (notifData) setNotifications(notifData);
      const { data: tickerData } = await supabase.from('ticker_messages').select('*').order('display_order', { ascending: true });
      if (tickerData) setManualTickerMessages(tickerData.map((m: any) => ({ ...m, isManual: true })));

      // New Modules Fetching
      const { data: chantiersData } = await supabase.from('chantiers').select('*');
      if (chantiersData) setChantiers(chantiersData);
      
      const { data: transData } = await supabase.from('transactions').select('*');
      if (transData) setTransactions(transData);
      
      const { data: empData } = await supabase.from('employees').select('*');
      if (empData) setEmployees(empData);
      
      const { data: payrollData } = await supabase.from('payrolls').select('*');
      if (payrollData) setPayrolls(payrollData);
      
      const { data: clientData } = await supabase.from('clients').select('*');
      if (clientData) setClients(clientData);
      
      const { data: caisseData } = await supabase.from('caisse').select('*');
      if (caisseData) setCaisse(caisseData);
      
      const { data: suppData } = await supabase.from('suppliers').select('*');
      if (suppData) setSuppliers(suppData);
      
      const { data: purchData } = await supabase.from('purchases').select('*');
      if (purchData) setPurchases(purchData);
    };

    fetchData();

    // Helper for generic insert/update/delete
    const updateState = (setter: any, payload: any) => {
        if (payload.eventType === 'INSERT') setter((prev: any[]) => [...prev, payload.new]);
        else if (payload.eventType === 'UPDATE') setter((prev: any[]) => prev.map(i => i.id === payload.new.id ? payload.new : i));
        else if (payload.eventType === 'DELETE') setter((prev: any[]) => prev.filter(i => i.id !== payload.old.id));
    };

    const channels = supabase.channel('realtime-ebf')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interventions' }, (payload) => updateState(setInterventions, payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stocks' }, (payload) => updateState(setStock, payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) => {
          updateState(setReports, payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_stats' }, (payload) => {
           if (payload.eventType === 'INSERT') setStats(prev => [...prev, payload.new as StatData]);
           else if (payload.eventType === 'UPDATE') setStats(prev => prev.map(s => (s.date === payload.new.date && s.site === payload.new.site) ? payload.new as StatData : s));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticker_messages' }, (payload) => {
           if (payload.eventType === 'INSERT') setManualTickerMessages(prev => [...prev, { ...payload.new, isManual: true } as TickerMessage]);
           else if (payload.eventType === 'UPDATE') setManualTickerMessages(prev => prev.map(m => m.id === payload.new.id ? { ...payload.new, isManual: true } as TickerMessage : m));
           else if (payload.eventType === 'DELETE') setManualTickerMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => updateState(setNotifications, payload))
      
      // NEW TABLES REALTIME
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chantiers' }, (payload) => updateState(setChantiers, payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => updateState(setTransactions, payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, (payload) => updateState(setEmployees, payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payrolls' }, (payload) => updateState(setPayrolls, payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, (payload) => updateState(setClients, payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'caisse' }, (payload) => updateState(setCaisse, payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, (payload) => updateState(setSuppliers, payload))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, (payload) => updateState(setPurchases, payload))

      .subscribe();
    return () => { supabase.removeChannel(channels); };
  }, []);

  useEffect(() => {
    if (stats.length > 0) generateAutoTickerMessages(stats);
    else setAutoTickerMessages([{ id: 'welcome-default', text: 'Bienvenue sur EBF Manager. Le système est prêt et connecté.', type: 'info', display_order: 0, isManual: false }]);
    const interval = setInterval(() => { if (stats.length > 0) generateAutoTickerMessages(stats); }, 600000);
    return () => clearInterval(interval);
  }, [stats]);

  const combinedTickerMessages = useMemo(() => {
     if (manualTickerMessages.length === 0 && autoTickerMessages.length === 0) return [];
     return [...manualTickerMessages, ...autoTickerMessages];
  }, [manualTickerMessages, autoTickerMessages]);

  const handleNavigate = (path: string) => { setCurrentPath(path); setIsMenuOpen(false); };
  const toggleTheme = () => { setDarkMode(!darkMode); document.documentElement.classList.toggle('dark'); };
  const handleOpenAdd = (table: string) => { setCrudTarget(table); setIsAddOpen(true); };
  const handleOpenDelete = (item: any, table: string) => { setItemToDelete(item); setCrudTarget(table); setIsDeleteOpen(true); };
  
  const handleResetBiometrics = () => {
      localStorage.removeItem('ebf_biometric_active');
      alert("Préférence biométrique réinitialisée. Elle sera demandée à la prochaine connexion.");
  };

  const confirmDelete = async () => {
      if (!itemToDelete || !crudTarget) return;
      setCrudLoading(true);
      const { error } = await supabase.from(crudTarget).delete().eq('id', itemToDelete.id);
      setCrudLoading(false);
      if (error) alert("Erreur: " + error.message);
      else { setIsDeleteOpen(false); setItemToDelete(null); }
  };
  const confirmAdd = async (formData: any) => {
      if (!crudTarget) return;
      setCrudLoading(true);
      if (!formData.site) formData.site = currentSite !== Site.GLOBAL ? currentSite : Site.ABIDJAN;
      const config = FORM_CONFIGS[crudTarget];
      const processedData = { ...formData };
      if (config) config.fields.forEach(f => { if (f.type === 'number' && processedData[f.name]) processedData[f.name] = Number(processedData[f.name]); });
      const { error } = await supabase.from(crudTarget).insert([processedData]);
      setCrudLoading(false);
      if (error) alert("Erreur: " + error.message);
      else setIsAddOpen(false);
  };
  const handleDeleteDirectly = async (id: string, table: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) alert("Erreur: " + error.message);
  };
  const saveManualTickerMessage = async (text: string, type: string) => {
      const { error } = await supabase.from('ticker_messages').insert([{ text, type, display_order: manualTickerMessages.length + 1 }]);
      if (error) alert("Erreur: " + error.message);
  };
  const deleteManualTickerMessage = async (id: string) => {
      const { error } = await supabase.from('ticker_messages').delete().eq('id', id);
      if (error) alert("Erreur: " + error.message);
  };

  const renderContent = () => {
     if (currentPath === '/') return <Dashboard data={stats} reports={reports} tickerMessages={combinedTickerMessages} stock={stock} currentSite={currentSite} currentPeriod={currentPeriod} onSiteChange={setCurrentSite} onPeriodChange={setCurrentPeriod} onNavigate={handleNavigate} onDeleteReport={(id) => handleDeleteDirectly(id, 'reports')} />;
     if (currentPath === '/synthesis') return <DetailedSynthesis data={stats} reports={reports} currentSite={currentSite} currentPeriod={currentPeriod} onSiteChange={setCurrentSite} onPeriodChange={setCurrentPeriod} onNavigate={handleNavigate} onViewReport={(r) => alert(`Détail: ${r.content}`)} />;
     const section = currentPath.substring(1);
     if (MODULE_ACTIONS[section]) return (
             <div className="space-y-6 animate-fade-in">
                 <h2 className="text-2xl font-bold text-gray-800 dark:text-white capitalize flex items-center gap-2"><ArrowLeft className="cursor-pointer" onClick={() => handleNavigate('/')} /> Module {section}</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {MODULE_ACTIONS[section].map((action) => (
                        <button key={action.id} onClick={() => handleNavigate(action.path)} className={`bg-white hover:bg-orange-50 p-6 rounded-xl shadow-md border border-gray-100 hover:border-orange-200 transition transform hover:-translate-y-1 text-left group`}>
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${action.color.replace('bg-', 'bg-').replace('600', '100').replace('500', '100')} ${action.color.replace('bg-', 'text-').replace('600', '600').replace('500', '600')}`}><action.icon size={24} /></div>
                            <h3 className="text-xl font-bold mb-1 text-gray-800 group-hover:text-ebf-orange">{action.label}</h3>
                            <p className="text-gray-500 text-sm">{action.description}</p>
                            {action.managedBy && <p className="text-[10px] text-gray-400 mt-3 font-medium uppercase tracking-wider">{action.managedBy}</p>}
                        </button>
                    ))}
                 </div>
             </div>
     );

     // Existing Routes
     if (currentPath === '/techniciens/interventions') return <ModulePlaceholder title="Interventions" subtitle="Planning" items={interventions} onBack={() => handleNavigate('/techniciens')} color="bg-orange-500" currentSite={currentSite} currentPeriod={currentPeriod} onAdd={() => handleOpenAdd('interventions')} onDelete={(item: any) => handleOpenDelete(item, 'interventions')} readOnly={!canWrite} />;
     if (currentPath === '/techniciens/rapports') return <ReportModeSelector reports={reports} onSelectMode={(mode: string) => { if (mode === 'form') handleOpenAdd('reports'); else alert("Rapport vocal pas encore disponible."); }} onBack={() => handleNavigate('/techniciens')} onViewReport={(r: any) => alert(r.content)} readOnly={!canWrite} />;
     if (currentPath === '/techniciens/materiel') return <ModulePlaceholder title="Matériel" subtitle="Inventaire" items={stock} onBack={() => handleNavigate('/techniciens')} color="bg-blue-600" onAdd={() => handleOpenAdd('stocks')} onDelete={(item: any) => handleOpenDelete(item, 'stocks')} readOnly={!canWrite} />;
     if (currentPath === '/quincaillerie/stocks') return <ModulePlaceholder title="Stocks Quincaillerie" subtitle="Inventaire" items={stock} onBack={() => handleNavigate('/quincaillerie')} color="bg-orange-600" currentSite={currentSite} onAdd={() => handleOpenAdd('stocks')} onDelete={(item: any) => handleOpenDelete(item, 'stocks')} readOnly={!canWrite} />;
     if (currentPath === '/equipe') return <ModulePlaceholder title="Notre Équipe" subtitle="Staff" items={technicians} onBack={() => handleNavigate('/')} color="bg-indigo-500" currentSite={currentSite} onAdd={() => handleOpenAdd('technicians')} onDelete={(item: any) => handleOpenDelete(item, 'technicians')} readOnly={!canWrite} />;

     // NEWLY CONFIGURED ROUTES (ACTIVE)
     if (currentPath === '/techniciens/chantiers') return <ModulePlaceholder title="Chantiers" subtitle="Suivi & Exécution" items={chantiers} onBack={() => handleNavigate('/techniciens')} color="bg-green-600" currentSite={currentSite} onAdd={() => handleOpenAdd('chantiers')} onDelete={(item: any) => handleOpenDelete(item, 'chantiers')} readOnly={!canWrite} />;
     if (currentPath === '/comptabilite/bilan') return <ModulePlaceholder title="Bilan Financier" subtitle="Journal des Transactions" items={transactions} onBack={() => handleNavigate('/comptabilite')} color="bg-green-600" currentSite={currentSite} currentPeriod={currentPeriod} onAdd={() => handleOpenAdd('transactions')} onDelete={(item: any) => handleOpenDelete(item, 'transactions')} readOnly={!canWrite} />;
     if (currentPath === '/comptabilite/rh') return <ModulePlaceholder title="Ressources Humaines" subtitle="Employés & Dossiers" items={employees} onBack={() => handleNavigate('/comptabilite')} color="bg-purple-600" currentSite={currentSite} onAdd={() => handleOpenAdd('employees')} onDelete={(item: any) => handleOpenDelete(item, 'employees')} readOnly={!canWrite} />;
     if (currentPath === '/comptabilite/paie') return <ModulePlaceholder title="Paie & Salaires" subtitle="Virements" items={payrolls} onBack={() => handleNavigate('/comptabilite')} color="bg-orange-500" currentPeriod={currentPeriod} onAdd={() => handleOpenAdd('payrolls')} onDelete={(item: any) => handleOpenDelete(item, 'payrolls')} readOnly={!canWrite} />;
     if (currentPath === '/secretariat/planning') return <ModulePlaceholder title="Planning Équipe" subtitle="Vue d'ensemble Interventions" items={interventions} onBack={() => handleNavigate('/secretariat')} color="bg-indigo-500" currentSite={currentSite} currentPeriod={currentPeriod} readOnly={true} />; 
     if (currentPath === '/secretariat/clients') return <ModulePlaceholder title="Gestion Clients" subtitle="Base de données" items={clients} onBack={() => handleNavigate('/secretariat')} color="bg-blue-500" currentSite={currentSite} onAdd={() => handleOpenAdd('clients')} onDelete={(item: any) => handleOpenDelete(item, 'clients')} readOnly={!canWrite} />;
     if (currentPath === '/secretariat/caisse') return <ModulePlaceholder title="Petite Caisse" subtitle="Entrées / Sorties" items={caisse} onBack={() => handleNavigate('/secretariat')} color="bg-gray-600" currentPeriod={currentPeriod} onAdd={() => handleOpenAdd('caisse')} onDelete={(item: any) => handleOpenDelete(item, 'caisse')} readOnly={!canWrite} />;
     if (currentPath === '/quincaillerie/fournisseurs') return <ModulePlaceholder title="Fournisseurs" subtitle="Partenaires" items={suppliers} onBack={() => handleNavigate('/quincaillerie')} color="bg-green-600" currentSite={currentSite} onAdd={() => handleOpenAdd('suppliers')} onDelete={(item: any) => handleOpenDelete(item, 'suppliers')} readOnly={!canWrite} />;
     if (currentPath === '/quincaillerie/achats') return <ModulePlaceholder title="Bons d'Achat" subtitle="Commandes Matériel" items={purchases} onBack={() => handleNavigate('/quincaillerie')} color="bg-red-500" currentPeriod={currentPeriod} onAdd={() => handleOpenAdd('purchases')} onDelete={(item: any) => handleOpenDelete(item, 'purchases')} readOnly={!canWrite} />;

     return <div className="flex flex-col items-center justify-center h-full text-gray-400"><Wrench size={48} className="mb-4 opacity-50" /><p className="text-xl">Module "{currentPath}" en construction.</p><button onClick={() => handleNavigate('/')} className="mt-4 text-ebf-orange font-bold hover:underline">Retour Accueil</button></div>;
  };

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-green-950 text-white transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-auto shadow-2xl flex flex-col`}>
            {/* Logo SANS rounded-full - Square container */}
            <div className="flex items-center justify-between h-20 px-6 bg-green-950/50">
                <div className="transform scale-75 origin-left bg-white p-2">
                    <EbfLogo size="small" />
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="lg:hidden text-gray-400 hover:text-white"><X /></button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
                <nav className="space-y-2">
                    {MAIN_MENU.map(item => (
                        <button key={item.id} onClick={() => handleNavigate(item.path)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 group ${currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path)) ? 'bg-ebf-orange text-white font-bold shadow-lg transform scale-105' : 'text-gray-300 hover:bg-green-900 hover:text-white'}`}>
                            <item.icon size={20} className={`${currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path)) ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
            </div>
            <div className="p-4 bg-green-900/30">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-green-800 flex items-center justify-center font-bold text-white text-sm border border-green-700">
                        {userProfile?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold truncate text-white">{userProfile?.full_name || 'Utilisateur'}</p>
                        <p className="text-xs text-gray-300 truncate opacity-80">{userRole}</p>
                    </div>
                </div>
            </div>
        </aside>
        <div className="flex-1 flex flex-col overflow-hidden relative">
             <HeaderWithNotif 
                 title="EBF Manager" 
                 onMenuClick={() => setIsMenuOpen(true)} 
                 onLogout={onLogout} 
                 notifications={notifications} 
                 userProfile={userProfile} 
                 userRole={userRole} 
                 markNotificationAsRead={(n: any) => setNotifications(notifications.map(x => x.id === n.id ? {...x, read: true} : x))} 
                 onOpenProfile={() => setIsProfileOpen(true)} 
                 onOpenFlashInfo={() => setIsFlashInfoOpen(true)} 
                 onOpenHelp={() => setIsHelpOpen(true)} 
                 darkMode={darkMode} 
                 onToggleTheme={toggleTheme} 
                 onResetBiometrics={handleResetBiometrics}
             />
             <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 relative bg-ebf-pattern dark:bg-gray-900">{renderContent()}</main>
        </div>
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} profile={userProfile} />
        <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        <FlashInfoModal isOpen={isFlashInfoOpen} onClose={() => setIsFlashInfoOpen(false)} messages={combinedTickerMessages} onSaveMessage={saveManualTickerMessage} onDeleteMessage={deleteManualTickerMessage} />
        <AddModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} config={FORM_CONFIGS[crudTarget]} onSubmit={confirmAdd} loading={crudLoading} />
        <ConfirmationModal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onConfirm={confirmDelete} title="Suppression" message="Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible." />
    </div>
  );
};

// --- App Wrapper with State Machine ---
export default function App() {
  const [appState, setAppState] = useState<'LOADING' | 'LOGIN' | 'ONBOARDING' | 'APP'>('LOADING');
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<Role>('Visiteur');
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  // Helper to fetch profile data
  const fetchUserProfile = async (userId: string) => {
      let { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      
      // Fallback: Create profile if it doesn't exist
      if (!data) {
          const { data: userData } = await supabase.auth.getUser();
          const meta = userData.user?.user_metadata;
          if (meta) {
              const newProfile = {
                  id: userId,
                  full_name: meta.full_name || 'Utilisateur',
                  role: meta.role || 'Visiteur',
                  site: meta.site || 'Global',
                  email: userData.user?.email
              };
              const { error: insertError } = await supabase.from('profiles').insert([newProfile]);
              if (!insertError) data = newProfile as any;
          }
      }

      if (data) {
          setUserRole(data.role);
          setUserProfile(data);
          
          // Ensure user is in 'Notre Équipe' if not Visitor
          if (data.role !== 'Visiteur') {
               const { data: tech } = await supabase.from('technicians').select('id').eq('id', userId).single();
               if (!tech) {
                   let specialty = data.role;
                   if (data.role === 'Admin') specialty = 'Administration';
                   
                   await supabase.from('technicians').insert([{
                       id: userId,
                       name: data.full_name,
                       specialty: specialty,
                       site: data.site,
                       status: 'Available'
                   }]);
               }
          }
          return data;
      }
      return null;
  };

  // Main Effect to check Session on Load
  useEffect(() => {
    const init = async () => {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (existingSession) {
         setSession(existingSession);
         const profile = await fetchUserProfile(existingSession.user.id);
         
         const bioActive = localStorage.getItem('ebf_biometric_active');
         if (bioActive === 'true') {
             setAppState('APP');
         } else {
             setAppState('APP');
         }
      } else {
         setAppState('LOGIN');
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
            setSession(null);
            setUserProfile(null);
            setAppState('LOGIN');
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleExplicitLoginSuccess = async () => {
      setAppState('LOADING');
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
          setSession(session);
          await fetchUserProfile(session.user.id);
          setAppState('ONBOARDING');
      } else {
          setAppState('LOGIN');
      }
  };

  const handleOnboardingComplete = () => {
      setAppState('APP');
  };

  if (appState === 'LOADING') return <LoadingScreen />;
  if (appState === 'LOGIN') return <LoginScreen onLoginSuccess={handleExplicitLoginSuccess} />;
  if (appState === 'ONBOARDING') return <OnboardingFlow role={userRole} onComplete={handleOnboardingComplete} />;

  return (
    <AppContent 
        session={session} 
        onLogout={() => supabase.auth.signOut()} 
        userRole={userRole} 
        userProfile={userProfile} 
    />
  );
}
