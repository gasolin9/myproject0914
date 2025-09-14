// Supabase 연결 테스트
import { createClient } from '@supabase/supabase-js';

// 환경 변수 확인
console.log('=== 환경 변수 확인 ===');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '설정됨' : '없음');

const supabaseUrl = 'https://uzocdchyuhoqytukvvgp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2NkY2h5dWhvcXl0dWt2dmdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MjUzNjAsImV4cCI6MjA3MzQwMTM2MH0.MP1OPufzsQfqPapbQB-Xa-I-w1mGr0V37fp1e5hIlIA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('=== Supabase 연결 테스트 ===');
console.log('URL:', supabaseUrl);
console.log('Key 길이:', supabaseAnonKey.length);

// 테이블 존재 확인
async function testConnection() {
  try {
    console.log('1. 연결 테스트...');

    // students 테이블 확인
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('count')
      .limit(1);

    if (studentsError) {
      console.error('❌ students 테이블 오류:', studentsError);
    } else {
      console.log('✅ students 테이블 접근 성공');
    }

    // attendances 테이블 확인
    const { data: attendances, error: attendancesError } = await supabase
      .from('attendances')
      .select('count')
      .limit(1);

    if (attendancesError) {
      console.error('❌ attendances 테이블 오류:', attendancesError);
    } else {
      console.log('✅ attendances 테이블 접근 성공');
    }

    // settings 테이블 확인
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('count')
      .limit(1);

    if (settingsError) {
      console.error('❌ settings 테이블 오류:', settingsError);
    } else {
      console.log('✅ settings 테이블 접근 성공');
    }

    // history_logs 테이블 확인
    const { data: history, error: historyError } = await supabase
      .from('history_logs')
      .select('count')
      .limit(1);

    if (historyError) {
      console.error('❌ history_logs 테이블 오류:', historyError);
    } else {
      console.log('✅ history_logs 테이블 접근 성공');
    }

  } catch (error) {
    console.error('❌ 전체 연결 실패:', error);
  }
}

testConnection();