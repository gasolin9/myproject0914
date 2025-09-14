import React, { useState, useEffect } from 'react';
import './styles/globals.css';
import { DebugSupabase } from './components/DebugSupabase';
import { QuickPanel } from './components/QuickPanel';

// 확장된 타입 정의
interface Student {
  id: number;
  number: number;
  name: string;
  class: string;
  transferInDate?: string;  // 전입일 (YYYY-MM-DD)
  transferOutDate?: string; // 전출일 (YYYY-MM-DD)
}

interface AttendanceRecord {
  id: number;
  studentId: number;
  date: string;
  status: '출석' | '지각' | '조퇴' | '결석';
  subStatus?: '체험' | '병결' | '기타'; // 결석 세부 사유
  period?: number; // 지각/조퇴 교시 (1-6)
  note?: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'students' | 'settings'>('dashboard');
  const [isQuickPanelOpen, setIsQuickPanelOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);

  // 데이터 상태 (실제 학교 상황 반영)
  const [students, setStudents] = useState<Student[]>([
    { id: 1, number: 1, name: '김가은', class: '6-8' },
    { id: 2, number: 2, name: '박도윤', class: '6-8' },
    { id: 3, number: 3, name: '이서준', class: '6-8' },
    { id: 4, number: 7, name: '윤서아', class: '6-8' },
    { id: 5, number: 15, name: '송지민', class: '6-8' },
    { id: 6, number: 23, name: '남도현', class: '6-8' },
    { id: 7, number: 28, name: '노예진', class: '6-8' },
    // 전입/전출 예시 학생
    { id: 8, number: 5, name: '이하늘', class: '6-8', transferInDate: '2025-09-10' },
    { id: 9, number: 12, name: '정민수', class: '6-8', transferOutDate: '2025-09-12' },
  ]);

  // 여러 날짜의 출결 기록 (어제, 오늘 데이터)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const records: AttendanceRecord[] = [];

    // 어제 데이터
    students.forEach(student => {
      records.push({
        id: Date.now() + Math.random(),
        studentId: student.id,
        date: yesterday,
        status: '출석' // 기본값 출석
      });
    });

    // 오늘 데이터 (일부만 입력된 상황)
    records.push(
      { id: Date.now() + Math.random(), studentId: 2, date: today, status: '지각', period: 2, note: '버스 지연' },
      { id: Date.now() + Math.random(), studentId: 4, date: today, status: '조퇴', period: 4, note: '병원 진료' },
      { id: Date.now() + Math.random(), studentId: 5, date: today, status: '결석', subStatus: '병결', note: '감기' }
    );

    return records;
  });

  const [newStudent, setNewStudent] = useState({ number: '', name: '', class: '6-8', transferDate: '', transferType: 'in' as 'in' | 'out' });

  // 날짜 관련 함수들
  const changeDate = (days: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const getDateString = (date: string) => {
    const d = new Date(date);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (date === today) return `${date} (오늘)`;
    if (date === yesterday) return `${date} (어제)`;
    return date;
  };

  // 전입/전출 관련 함수들
  const getActiveStudentsForDate = (date: string) => {
    return students.filter(student => {
      // 전입일 체크: 전입일이 없거나 선택한 날짜보다 이전이어야 함
      const transferInOk = !student.transferInDate || student.transferInDate <= date;
      // 전출일 체크: 전출일이 없거나 선택한 날짜보다 이후여야 함
      const transferOutOk = !student.transferOutDate || student.transferOutDate > date;

      return transferInOk && transferOutOk;
    });
  };

  const getStudentStatusForDate = (studentId: number, date: string) => {
    const record = attendanceRecords.find(r => r.studentId === studentId && r.date === date);
    const student = students.find(s => s.id === studentId);

    // 전입/전출 상태 체크
    if (student?.transferInDate === date) {
      return `전입 (${date})`;
    }
    if (student?.transferOutDate === date) {
      return `전출 (${date})`;
    }

    return record ? formatAttendanceStatus(record) : '출석'; // 기본값 출석
  };

  const formatAttendanceStatus = (record: AttendanceRecord) => {
    let status = record.status;
    if (record.status === '결석' && record.subStatus) {
      status = record.subStatus;
    }
    if (record.period && (record.status === '지각' || record.status === '조퇴')) {
      status += ` (${record.period}교시)`;
    }
    return status;
  };

  // 학생 관리 함수들
  const addStudent = () => {
    if (newStudent.name && newStudent.number) {
      const student: Student = {
        id: Date.now(),
        number: parseInt(newStudent.number),
        name: newStudent.name,
        class: newStudent.class
      };

      // 전입/전출 날짜 설정
      if (newStudent.transferDate) {
        if (newStudent.transferType === 'in') {
          student.transferInDate = newStudent.transferDate;
        } else {
          student.transferOutDate = newStudent.transferDate;
        }
      }

      setStudents([...students, student]);
      setNewStudent({ number: '', name: '', class: '6-8', transferDate: '', transferType: 'in' });
    }
  };

  const deleteStudent = (id: number) => {
    if (confirm('학생을 삭제하시겠습니까?')) {
      setStudents(students.filter(s => s.id !== id));
      setAttendanceRecords(attendanceRecords.filter(r => r.studentId !== id));
    }
  };

  // 출결 기록 함수들
  const recordAttendance = (studentId: number, status: '출석' | '지각' | '조퇴' | '결석', options?: { subStatus?: '체험' | '병결' | '기타', period?: number, note?: string }) => {
    const existingRecord = attendanceRecords.find(r => r.studentId === studentId && r.date === selectedDate);

    const newRecord: AttendanceRecord = {
      id: existingRecord?.id || Date.now(),
      studentId,
      date: selectedDate,
      status,
      ...options
    };

    if (existingRecord) {
      setAttendanceRecords(attendanceRecords.map(r =>
        r.id === existingRecord.id ? newRecord : r
      ));
    } else {
      setAttendanceRecords([...attendanceRecords, newRecord]);
    }
  };

  const getAttendanceStats = () => {
    const activeStudents = getActiveStudentsForDate(selectedDate);
    const dateRecords = attendanceRecords.filter(r => r.date === selectedDate);

    const stats = {
      출석: 0,
      지각: 0,
      조퇴: 0,
      결석: 0,
      체험: 0,
      병결: 0,
      기타: 0
    };

    activeStudents.forEach(student => {
      const record = dateRecords.find(r => r.studentId === student.id);
      if (record) {
        if (record.status === '결석' && record.subStatus) {
          stats[record.subStatus]++;
        } else {
          stats[record.status]++;
        }
      } else {
        stats.출석++; // 기본값 출석
      }
    });

    return stats;
  };

  // 전역 단축키 설정
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey && event.altKey && event.key === 'a') ||
          (event.metaKey && event.altKey && event.key === 'a')) {
        event.preventDefault();
        setIsQuickPanelOpen(prev => !prev);
      }
      if (event.key === 'Escape') {
        setIsQuickPanelOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  const stats = getAttendanceStats();
  const activeStudents = getActiveStudentsForDate(selectedDate);

  // 페이지 렌더링
  const renderDashboard = () => (
    <div style={{ padding: '2rem' }}>
      {/* 날짜 선택 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>📊 출결 대시보드</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => changeDate(-1)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            ← 어제
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px'
              }}
            />
            <span style={{ color: '#666', fontSize: '0.875rem' }}>
              {getDateString(selectedDate)}
            </span>
          </div>
          <button
            onClick={() => changeDate(1)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            내일 →
          </button>
        </div>
      </div>

      {/* 출결 통계 카드들 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: '출석', count: stats.출석, color: '#10b981', icon: '✓' },
          { label: '지각', count: stats.지각, color: '#f59e0b', icon: '⏰' },
          { label: '조퇴', count: stats.조퇴, color: '#f97316', icon: '🏃' },
          { label: '체험', count: stats.체험, color: '#8b5cf6', icon: '🎓' },
          { label: '병결', count: stats.병결, color: '#ef4444', icon: '🏥' },
          { label: '기타', count: stats.기타, color: '#6b7280', icon: '❓' }
        ].map((item) => (
          <div key={item.label} style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1rem',
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              backgroundColor: item.color,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1rem',
              margin: '0 auto 0.5rem'
            }}>
              {item.icon}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111' }}>{item.count}명</div>
            <div style={{ color: '#666', fontSize: '0.875rem' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* 학생별 출결 현황 */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          {getDateString(selectedDate)} 학생별 출결 현황 ({activeStudents.length}명)
        </h3>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {activeStudents.map(student => {
            const status = getStudentStatusForDate(student.id, selectedDate);
            const statusColors = {
              '출석': '#10b981',
              '지각': '#f59e0b',
              '조퇴': '#f97316',
              '체험': '#8b5cf6',
              '병결': '#ef4444',
              '기타': '#6b7280'
            };

            // 전입/전출 표시
            let statusDisplay = status;
            let statusColor = statusColors[status.split(' ')[0] as keyof typeof statusColors] || '#10b981';

            if (status.includes('전입') || status.includes('전출')) {
              statusColor = '#3b82f6';
            }

            return (
              <div key={student.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                backgroundColor: '#f9fafb',
                borderRadius: '4px'
              }}>
                <div>
                  <span style={{ fontWeight: '600' }}>{student.number}번 {student.name}</span>
                  {student.transferInDate && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#3b82f6' }}>
                      (전입: {student.transferInDate})
                    </span>
                  )}
                  {student.transferOutDate && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#ef4444' }}>
                      (전출: {student.transferOutDate})
                    </span>
                  )}
                </div>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  backgroundColor: statusColor,
                  color: 'white',
                  fontSize: '0.875rem'
                }}>
                  {statusDisplay}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderStudents = () => (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem' }}>👥 학생 관리</h2>

      {/* 학생 추가 폼 */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', border: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>새 학생 추가</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>번호</label>
            <input
              type="number"
              value={newStudent.number}
              onChange={(e) => setNewStudent({ ...newStudent, number: e.target.value })}
              placeholder="번호"
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>이름</label>
            <input
              type="text"
              value={newStudent.name}
              onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
              placeholder="학생 이름"
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>학급</label>
            <input
              type="text"
              value={newStudent.class}
              onChange={(e) => setNewStudent({ ...newStudent, class: e.target.value })}
              placeholder="학급"
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>전입/전출</label>
            <select
              value={newStudent.transferType}
              onChange={(e) => setNewStudent({ ...newStudent, transferType: e.target.value as 'in' | 'out' })}
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', width: '100%' }}
            >
              <option value="in">전입</option>
              <option value="out">전출</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>날짜 (선택)</label>
            <input
              type="date"
              value={newStudent.transferDate}
              onChange={(e) => setNewStudent({ ...newStudent, transferDate: e.target.value })}
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', width: '100%' }}
            />
          </div>
          <button
            onClick={addStudent}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              height: 'fit-content'
            }}
          >
            추가
          </button>
        </div>
      </div>

      {/* 학생 목록 */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>학생 목록 ({students.length}명)</h3>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {students.map(student => (
            <div key={student.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '4px'
            }}>
              <div>
                <span style={{ fontWeight: '600' }}>{student.number}번 {student.name}</span>
                <span style={{ marginLeft: '1rem', color: '#666' }}>({student.class})</span>
              </div>
              <button
                onClick={() => deleteStudent(student.id)}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem' }}>⚙️ 설정</h2>
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>앱 정보</h3>
        <div style={{ color: '#666', lineHeight: '1.6' }}>
          <p>📚 출결 기록 앱 v1.0.0</p>
          <p>초등학교 교사용 출결 관리 시스템</p>
          <p>빠른 출결 입력: Ctrl+Alt+A</p>
          <p>모든 데이터는 브라우저에 저장됩니다</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
      {/* Supabase 연동 QuickPanel */}
      <QuickPanel
        isOpen={isQuickPanelOpen}
        onClose={() => setIsQuickPanelOpen(false)}
      />

      {/* 기존 패널 (임시 비활성화) */}
      {false && isQuickPanelOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>⚡ 빠른 출결 입력</h2>
              <button
                onClick={() => setIsQuickPanelOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '2rem',
                  color: '#666',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {activeStudents.map(student => {
                const currentStatus = getStudentStatusForDate(student.id, selectedDate);
                const isSelected = selectedStudent === student.id;

                return (
                  <div key={student.id} style={{
                    padding: '1rem',
                    backgroundColor: isSelected ? '#dbeafe' : '#f9fafb',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '600' }}>{student.number}번 {student.name}</span>
                      <span style={{ fontSize: '0.875rem', color: '#666' }}>현재: {currentStatus}</span>
                    </div>

                    {/* 기본 출결 버튼들 */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <button
                        onClick={() => recordAttendance(student.id, '출석')}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          backgroundColor: '#10b981',
                          color: 'white',
                          opacity: currentStatus === '출석' ? 1 : 0.7
                        }}
                      >
                        출석
                      </button>

                      <button
                        onClick={() => setSelectedStudent(selectedStudent === student.id ? null : student.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          backgroundColor: '#f59e0b',
                          color: 'white'
                        }}
                      >
                        지각 (교시선택)
                      </button>

                      <button
                        onClick={() => setSelectedStudent(selectedStudent === student.id ? null : student.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          backgroundColor: '#f97316',
                          color: 'white'
                        }}
                      >
                        조퇴 (교시선택)
                      </button>

                      <button
                        onClick={() => setSelectedStudent(selectedStudent === student.id ? null : student.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          backgroundColor: '#ef4444',
                          color: 'white'
                        }}
                      >
                        결석 (사유선택)
                      </button>
                    </div>

                    {/* 세부 선택 옵션들 */}
                    {isSelected && (
                      <div style={{
                        padding: '1rem',
                        backgroundColor: 'white',
                        borderRadius: '4px',
                        border: '1px solid #e5e7eb',
                        marginTop: '0.5rem'
                      }}>
                        {/* 지각/조퇴 교시 선택 */}
                        <div style={{ marginBottom: '1rem' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600' }}>교시 선택 (지각/조퇴):</h4>
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {[1, 2, 3, 4, 5, 6].map(period => (
                              <button
                                key={period}
                                onClick={() => {
                                  // 지각 또는 조퇴를 마지막으로 클릭한 상태에 따라 결정
                                  recordAttendance(student.id, '지각', { period });
                                  setSelectedStudent(null);
                                }}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  border: '1px solid #f59e0b',
                                  backgroundColor: 'white',
                                  color: '#f59e0b',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {period}교시 지각
                              </button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                            {[1, 2, 3, 4, 5, 6].map(period => (
                              <button
                                key={period}
                                onClick={() => {
                                  recordAttendance(student.id, '조퇴', { period });
                                  setSelectedStudent(null);
                                }}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  border: '1px solid #f97316',
                                  backgroundColor: 'white',
                                  color: '#f97316',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {period}교시 조퇴
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 결석 사유 선택 */}
                        <div>
                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600' }}>결석 사유:</h4>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {(['체험', '병결', '기타'] as const).map(subStatus => (
                              <button
                                key={subStatus}
                                onClick={() => {
                                  recordAttendance(student.id, '결석', { subStatus });
                                  setSelectedStudent(null);
                                }}
                                style={{
                                  padding: '0.5rem 1rem',
                                  borderRadius: '4px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  backgroundColor:
                                    subStatus === '체험' ? '#8b5cf6' :
                                    subStatus === '병결' ? '#ef4444' : '#6b7280',
                                  color: 'white'
                                }}
                              >
                                {subStatus}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <nav style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#2563eb', margin: 0 }}>
            📚 출결 기록 앱
          </h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setCurrentPage('dashboard')}
              style={{
                background: 'none',
                border: 'none',
                color: currentPage === 'dashboard' ? '#2563eb' : '#666',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: '0.5rem 1rem',
                fontWeight: currentPage === 'dashboard' ? '600' : '400',
                textDecoration: currentPage === 'dashboard' ? 'underline' : 'none'
              }}
            >
              대시보드
            </button>
            <button
              onClick={() => setCurrentPage('students')}
              style={{
                background: 'none',
                border: 'none',
                color: currentPage === 'students' ? '#2563eb' : '#666',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: '0.5rem 1rem',
                fontWeight: currentPage === 'students' ? '600' : '400',
                textDecoration: currentPage === 'students' ? 'underline' : 'none'
              }}
            >
              학생관리
            </button>
            <button
              onClick={() => setCurrentPage('settings')}
              style={{
                background: 'none',
                border: 'none',
                color: currentPage === 'settings' ? '#2563eb' : '#666',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: '0.5rem 1rem',
                fontWeight: currentPage === 'settings' ? '600' : '400',
                textDecoration: currentPage === 'settings' ? 'underline' : 'none'
              }}
            >
              설정
            </button>
          </div>
        </div>
      </nav>

      {/* 메인 컨텐츠 */}
      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {currentPage === 'dashboard' && renderDashboard()}
        {currentPage === 'students' && renderStudents()}
        {currentPage === 'settings' && renderSettings()}
      </main>

      {/* 빠른 패널 토글 버튼 (고정) */}
      <button
        onClick={() => setIsQuickPanelOpen(true)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          fontSize: '1.5rem',
          cursor: 'pointer',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="빠른 출결 입력 (Ctrl+Alt+A)"
      >
        ⚡
      </button>

      {/* 디버그 컴포넌트 */}
      <DebugSupabase />

      {/* 하단 정보 */}
      <footer style={{
        backgroundColor: 'white',
        borderTop: '1px solid #e5e7eb',
        marginTop: '4rem'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.875rem',
          color: '#6b7280',
          flexWrap: 'wrap'
        }}>
          <div>📚 출결 기록 앱 v1.0.0 - 초등학교 교사용</div>
          <div>모든 데이터는 브라우저에 안전하게 저장됩니다</div>
        </div>
      </footer>
    </div>
  );
}