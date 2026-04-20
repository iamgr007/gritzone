export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          created_at?: string;
        };
        Update: {
          display_name?: string;
        };
      };
      checkins: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          morning_weight: number | null;
          breakfast: string;
          lunch: string;
          dinner: string;
          snacks: string;
          workout_done: boolean;
          workout_details: string;
          steps_count: number;
          water_intake: number;
          sleep_hours: number;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          morning_weight?: number | null;
          breakfast?: string;
          lunch?: string;
          dinner?: string;
          snacks?: string;
          workout_done?: boolean;
          workout_details?: string;
          steps_count?: number;
          water_intake?: number;
          sleep_hours?: number;
          notes?: string;
        };
        Update: {
          morning_weight?: number | null;
          breakfast?: string;
          lunch?: string;
          dinner?: string;
          snacks?: string;
          workout_done?: boolean;
          workout_details?: string;
          steps_count?: number;
          water_intake?: number;
          sleep_hours?: number;
          notes?: string;
        };
      };
    };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type CheckIn = Database["public"]["Tables"]["checkins"]["Row"];
export type CheckInInsert = Database["public"]["Tables"]["checkins"]["Insert"];
export type CheckInUpdate = Database["public"]["Tables"]["checkins"]["Update"];
