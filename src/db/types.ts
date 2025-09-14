// ==============================================
// Supabase 데이터베이스 타입 정의
// ==============================================

export interface Database {
  public: {
    Tables: {
      students: {
        Row: {
          id: string;
          number: number;
          name: string;
          class_name: string;
          grade: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          number: number;
          name: string;
          class_name: string;
          grade: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          number?: number;
          name?: string;
          class_name?: string;
          grade?: number;
          active?: boolean;
          updated_at?: string;
        };
      };
      attendances: {
        Row: {
          id: string;
          student_id: string;
          date: string;
          period: number | null;
          status: '출석' | '지각' | '조퇴' | '결석';
          reason: string | null;
          timestamp: string;
          last_modified: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          date: string;
          period?: number | null;
          status: '출석' | '지각' | '조퇴' | '결석';
          reason?: string | null;
          timestamp?: string;
          last_modified?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          date?: string;
          period?: number | null;
          status?: '출석' | '지각' | '조퇴' | '결석';
          reason?: string | null;
          last_modified?: string;
        };
      };
      settings: {
        Row: {
          id: string;
          school_name: string;
          periods_per_day: number;
          start_date: string;
          end_date: string;
          theme: 'light' | 'dark' | 'auto';
          notifications_enabled: boolean;
          backup_enabled: boolean;
          backup_interval: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_name?: string;
          periods_per_day?: number;
          start_date?: string;
          end_date?: string;
          theme?: 'light' | 'dark' | 'auto';
          notifications_enabled?: boolean;
          backup_enabled?: boolean;
          backup_interval?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_name?: string;
          periods_per_day?: number;
          start_date?: string;
          end_date?: string;
          theme?: 'light' | 'dark' | 'auto';
          notifications_enabled?: boolean;
          backup_enabled?: boolean;
          backup_interval?: number;
          updated_at?: string;
        };
      };
      history_logs: {
        Row: {
          id: string;
          action: 'create' | 'update' | 'delete' | 'bulk_import';
          entity_type: 'student' | 'attendance' | 'settings';
          entity_id: string;
          changes: any;
          timestamp: string;
        };
        Insert: {
          id?: string;
          action: 'create' | 'update' | 'delete' | 'bulk_import';
          entity_type: 'student' | 'attendance' | 'settings';
          entity_id: string;
          changes?: any;
          timestamp?: string;
        };
        Update: {
          id?: string;
          action?: 'create' | 'update' | 'delete' | 'bulk_import';
          entity_type?: 'student' | 'attendance' | 'settings';
          entity_id?: string;
          changes?: any;
          timestamp?: string;
        };
      };
    };
  };
}