// ==============================================
// Supabase 클라이언트 설정
// ==============================================

import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// 환경 변수에서 Supabase 설정 읽기
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL과 Anon Key가 환경 변수에 설정되지 않았습니다.');
}

// Supabase 클라이언트 생성
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// 연결 상태 확인
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('students').select('count').limit(1);
    return !error;
  } catch (error) {
    console.error('Supabase 연결 확인 실패:', error);
    return false;
  }
}