export interface User {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'expert' | 'constateur';
  full_name?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  fullName: string;
  phone?: string;
}

// Technical elements interface for better typing - Updated to match database structure
interface TechnicalElements {
  semelles?: string[];
  elevations?: string[];
  ossature?: string[];
  portes?: string[];
  fenetres?: string[];
  grillage?: string[];
  chassis?: string[];
  facade?: string[];
  toiture?: string[];
  sol?: string[];
  plafond?: string[];
  escalier?: string[];
  cloisonnement?: string[];
}

// Building types - Updated with new fields
export interface Building {
  id: string;
  designation: string;
  // Nouvelles surfaces détaillées
  basement_area_sqm?: number;
  ground_floor_area_sqm?: number;
  first_floor_area_sqm?: number;
  total_area?: number; // Colonne calculée automatiquement
  // Éléments techniques (stockés en JSONB)
  technical_elements?: TechnicalElements;
  // Éléments divers (stockés en tableau JSON)
  miscellaneous_elements?: string[];
  // Valeurs financières
  new_value_mad?: number;
  obsolescence_percentage?: number;
  depreciated_value_mad?: number;
  // Contiguïté et communication (propriétés directes, pas dans technical_elements)
  contiguity?: string;
  communication?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Material types - Enhanced with new fields (removed category)
export interface Material {
  id: string;
  building_id: string;
  name: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  installation_date?: string;
  warranty_end_date?: string;
  location_details?: string;
  specifications?: any;
  maintenance_notes?: string;
  status: 'operational' | 'maintenance' | 'out_of_order' | 'retired';
  // New fields for enhanced material management
  quantity?: number;
  manufacturing_year?: number;
  condition?: 'bon' | 'acceptable' | 'vetuste';
  new_value_mad?: number;
  obsolescence_percentage?: number;
  depreciated_value_mad?: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Mission types - Updated with plan de masse fields
export interface Mission {
  id: string;
  title: string;
  description?: string;
  mission_type: 'inspection' | 'maintenance' | 'audit' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_start_date?: string;
  scheduled_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  assigned_to?: string;
  created_by: string;
  approved_by?: string;
  instructions?: string;
  report?: string;
  attachments?: any;
  // Plan de masse fields
  plan_de_masse_url?: string;
  plan_de_masse_path?: string;
  plan_de_masse_filename?: string;
  plan_de_masse_size?: number;
  plan_de_masse_uploaded_at?: string;
  created_at: string;
  updated_at: string;
}

interface MissionBuilding {
  mission_id: string;
  building_id: string;
  created_at: string;
}