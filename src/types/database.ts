export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: 'super_admin' | 'admin' | 'expert' | 'constateur';
          full_name: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: 'super_admin' | 'admin' | 'expert' | 'constateur';
          full_name?: string | null;
          phone?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'super_admin' | 'admin' | 'expert' | 'constateur';
          full_name?: string | null;
          phone?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      buildings: {
        Row: {
          id: string;
          designation: string;
          basement_area_sqm: number | null;
          ground_floor_area_sqm: number | null;
          first_floor_area_sqm: number | null;
          technical_elements: any | null;
          miscellaneous_elements: any | null;
          new_value_mad: number | null;
          obsolescence_percentage: number | null;
          depreciated_value_mad: number | null;
          contiguity: string | null;
          communication: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          designation: string;
          basement_area_sqm?: number | null;
          ground_floor_area_sqm?: number | null;
          first_floor_area_sqm?: number | null;
          technical_elements?: any | null;
          miscellaneous_elements?: any | null;
          new_value_mad?: number | null;
          obsolescence_percentage?: number | null;
          depreciated_value_mad?: number | null;
          contiguity?: string | null;
          communication?: string | null;
          is_active?: boolean;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          designation?: string;
          basement_area_sqm?: number | null;
          ground_floor_area_sqm?: number | null;
          first_floor_area_sqm?: number | null;
          technical_elements?: any | null;
          miscellaneous_elements?: any | null;
          new_value_mad?: number | null;
          obsolescence_percentage?: number | null;
          depreciated_value_mad?: number | null;
          contiguity?: string | null;
          communication?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          updated_at?: string;
        };
      };
      materials: {
        Row: {
          id: string;
          building_id: string;
          name: string;
          category: string;
          brand: string | null;
          model: string | null;
          serial_number: string | null;
          installation_date: string | null;
          warranty_end_date: string | null;
          location_details: string | null;
          specifications: any | null;
          maintenance_notes: string | null;
          status: 'operational' | 'maintenance' | 'out_of_order' | 'retired';
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          building_id: string;
          name: string;
          category: string;
          brand?: string | null;
          model?: string | null;
          serial_number?: string | null;
          installation_date?: string | null;
          warranty_end_date?: string | null;
          location_details?: string | null;
          specifications?: any | null;
          maintenance_notes?: string | null;
          status?: 'operational' | 'maintenance' | 'out_of_order' | 'retired';
          is_active?: boolean;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          building_id?: string;
          name?: string;
          category?: string;
          brand?: string | null;
          model?: string | null;
          serial_number?: string | null;
          installation_date?: string | null;
          warranty_end_date?: string | null;
          location_details?: string | null;
          specifications?: any | null;
          maintenance_notes?: string | null;
          status?: 'operational' | 'maintenance' | 'out_of_order' | 'retired';
          is_active?: boolean;
          created_by?: string | null;
          updated_at?: string;
        };
      };
      missions: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          mission_type: 'inspection' | 'maintenance' | 'audit' | 'emergency';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          status: 'draft' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
          scheduled_start_date: string | null;
          scheduled_end_date: string | null;
          actual_start_date: string | null;
          actual_end_date: string | null;
          assigned_to: string | null;
          created_by: string;
          approved_by: string | null;
          instructions: string | null;
          report: string | null;
          attachments: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          mission_type: 'inspection' | 'maintenance' | 'audit' | 'emergency';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'draft' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
          scheduled_start_date?: string | null;
          scheduled_end_date?: string | null;
          actual_start_date?: string | null;
          actual_end_date?: string | null;
          assigned_to?: string | null;
          created_by: string;
          approved_by?: string | null;
          instructions?: string | null;
          report?: string | null;
          attachments?: any | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          mission_type?: 'inspection' | 'maintenance' | 'audit' | 'emergency';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'draft' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
          scheduled_start_date?: string | null;
          scheduled_end_date?: string | null;
          actual_start_date?: string | null;
          actual_end_date?: string | null;
          assigned_to?: string | null;
          created_by?: string;
          approved_by?: string | null;
          instructions?: string | null;
          report?: string | null;
          attachments?: any | null;
          updated_at?: string;
        };
      };
      mission_buildings: {
        Row: {
          mission_id: string;
          building_id: string;
          created_at: string;
        };
        Insert: {
          mission_id: string;
          building_id: string;
        };
        Update: {
          mission_id?: string;
          building_id?: string;
        };
      };
    };
  };
}