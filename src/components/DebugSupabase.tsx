// ==============================================
// Supabase 연결 디버깅 컴포넌트
// ==============================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../db/supabase';

export function DebugSupabase() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  const testSupabaseConnection = async () => {
    setIsLoading(true);
    setLogs([]);

    try {
      addLog('=== 환경 변수 확인 ===');
      addLog(`VITE_SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL || '❌ 없음'}`);
      addLog(`VITE_SUPABASE_ANON_KEY: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ 설정됨' : '❌ 없음'}`);

      addLog('=== Supabase 연결 테스트 ===');

      // students 테이블 확인
      addLog('1. students 테이블 테스트...');
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('count')
        .limit(1);

      if (studentsError) {
        addLog(`❌ students 테이블 오류: ${studentsError.message}`);
      } else {
        addLog('✅ students 테이블 접근 성공');
      }

      // attendances 테이블 확인
      addLog('2. attendances 테이블 테스트...');
      const { data: attendances, error: attendancesError } = await supabase
        .from('attendances')
        .select('count')
        .limit(1);

      if (attendancesError) {
        addLog(`❌ attendances 테이블 오류: ${attendancesError.message}`);
      } else {
        addLog('✅ attendances 테이블 접근 성공');
      }

      // 기존 테스트 데이터 정리
      addLog('3. 기존 테스트 데이터 정리...');
      const { error: cleanupError } = await supabase
        .from('students')
        .delete()
        .eq('name', '테스트학생')
        .eq('class_name', '테스트반');

      if (cleanupError) {
        addLog(`⚠️ 기존 데이터 정리: ${cleanupError.message}`);
      } else {
        addLog('✅ 기존 테스트 데이터 정리 완료');
      }

      // 실제 데이터 추가 테스트 (고유한 번호 사용)
      const randomNumber = Math.floor(Math.random() * 1000) + 1;
      addLog(`4. 테스트 학생 추가 (번호: ${randomNumber})...`);
      const { data: testStudent, error: addStudentError } = await supabase
        .from('students')
        .insert({
          name: '테스트학생',
          number: randomNumber,
          class_name: '테스트반',
          grade: 1,
          active: true
        })
        .select()
        .single();

      if (addStudentError) {
        addLog(`❌ 학생 추가 실패: ${addStudentError.message}`);
      } else {
        addLog(`✅ 학생 추가 성공: ${testStudent.name} (ID: ${testStudent.id})`);

        // 추가한 테스트 데이터 즉시 삭제
        const { error: deleteError } = await supabase
          .from('students')
          .delete()
          .eq('id', testStudent.id);

        if (deleteError) {
          addLog(`⚠️ 테스트 데이터 삭제 실패: ${deleteError.message}`);
        } else {
          addLog('✅ 테스트 데이터 정리 완료');
        }
      }

    } catch (error) {
      addLog(`❌ 전체 테스트 실패: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    testSupabaseConnection();
  }, []);

  return (
    <div className="fixed top-4 right-4 w-96 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">🔍 Supabase 디버그</h3>
        <button
          onClick={testSupabaseConnection}
          disabled={isLoading}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? '테스트 중...' : '다시 테스트'}
        </button>
      </div>

      <div className="space-y-1">
        {logs.length === 0 && isLoading && (
          <div className="text-gray-500">연결 테스트 중...</div>
        )}
        {logs.map((log, index) => (
          <div
            key={index}
            className={`text-xs font-mono p-1 rounded ${
              log.includes('❌')
                ? 'bg-red-50 text-red-700'
                : log.includes('✅')
                ? 'bg-green-50 text-green-700'
                : log.includes('===')
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'bg-gray-50 text-gray-700'
            }`}
          >
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}