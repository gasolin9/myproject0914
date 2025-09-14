import React, { useState, useEffect } from 'react';
import './styles/globals.css';

// 타입 정의
interface Student {
  id: number;
  number: number;
  name: string;
  class: string;
}

interface AttendanceRecord {
  id: number;
  studentId: number;
  date: string;
  status: '출석' | '지각' | '조퇴' | '결석';
  note?: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'students' | 'settings'>('dashboard');
  const [isQuickPanelOpen, setIsQuickPanelOpen] = useState(false);

  // 데이터 상태
  const [students, setStudents] = useState<Student[]>([
    { id: 1, number: 1, name: '김가은', class: '6-8' },
    { id: 2, number: 2, name: '박도윤', class: '6-8' },
    { id: 3, number: 3, name: '이서준', class: '6-8' },
    { id: 4, number: 7, name: '윤서아', class: '6-8' },
    { id: 5, number: 15, name: '송지민', class: '6-8' },
    { id: 6, number: 23, name: '남도현', class: '6-8' },
    { id: 7, number: 28, name: '노예진', class: '6-8' },
  ]);

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([
    { id: 1, studentId: 1, date: '2025-09-14', status: '출석' },
    { id: 2, studentId: 2, date: '2025-09-14', status: '지각', note: '버스 지연' },
    { id: 3, studentId: 3, date: '2025-09-14', status: '출석' },
    { id: 4, studentId: 4, date: '2025-09-14', status: '조퇴', note: '병원 진료' },
    { id: 5, studentId: 5, date: '2025-09-14', status: '결석', note: '감기몸살' },
    { id: 6, studentId: 6, date: '2025-09-14', status: '출석' },
    { id: 7, studentId: 7, date: '2025-09-14', status: '출석' },
  ]);

  const [newStudent, setNewStudent] = useState({ number: '', name: '', class: '6-8' });

  // 실제 기능 함수들
  const addStudent = () => {
    if (newStudent.name && newStudent.number) {
      const student: Student = {
        id: Date.now(),
        number: parseInt(newStudent.number),
        name: newStudent.name,
        class: newStudent.class
      };
      setStudents([...students, student]);
      setNewStudent({ number: '', name: '', class: '6-8' });
    }
  };

  const deleteStudent = (id: number) => {
    if (confirm('학생을 삭제하시겠습니까?')) {
      setStudents(students.filter(s => s.id !== id));
      setAttendanceRecords(attendanceRecords.filter(r => r.studentId !== id));
    }
  };

  const recordAttendance = (studentId: number, status: '출석' | '지각' | '조퇴' | '결석') => {
    const today = new Date().toISOString().split('T')[0];
    const existingRecord = attendanceRecords.find(r => r.studentId === studentId && r.date === today);

    if (existingRecord) {
      setAttendanceRecords(attendanceRecords.map(r =>
        r.id === existingRecord.id ? { ...r, status } : r
      ));
    } else {
      const newRecord: AttendanceRecord = {
        id: Date.now(),
        studentId,
        date: today,
        status
      };
      setAttendanceRecords([...attendanceRecords, newRecord]);
    }
    setIsQuickPanelOpen(false);
  };

  const getStudentTodayStatus = (studentId: number) => {
    const today = new Date().toISOString().split('T')[0];
    const record = attendanceRecords.find(r => r.studentId === studentId && r.date === today);
    return record?.status || '미등록';
  };

  const getAttendanceStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceRecords.filter(r => r.date === today);

    return {
      출석: todayRecords.filter(r => r.status === '출석').length,
      지각: todayRecords.filter(r => r.status === '지각').length,
      조퇴: todayRecords.filter(r => r.status === '조퇴').length,
      결석: todayRecords.filter(r => r.status === '결석').length,
      미등록: students.length - todayRecords.length
    };
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

  // 페이지 렌더링
  const renderDashboard = () => (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem' }}>📊 대시보드</h2>

      {/* 오늘 출결 현황 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: '출석', count: stats.출석, color: '#10b981', icon: '✓' },
          { label: '지각', count: stats.지각, color: '#f59e0b', icon: '⏰' },
          { label: '조퇴', count: stats.조퇴, color: '#f97316', icon: '🏃' },
          { label: '결석', count: stats.결석, color: '#ef4444', icon: '✗' },
          { label: '미등록', count: stats.미등록, color: '#6b7280', icon: '❓' }
        ].map((item) => (
          <div key={item.label} style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              backgroundColor: item.color,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.25rem',
              marginBottom: '0.75rem'
            }}>
              {item.icon}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111' }}>{item.count}명</div>
            <div style={{ color: '#666' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* 학생별 출결 현황 */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>오늘 학생별 출결 현황</h3>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {students.map(student => {
            const status = getStudentTodayStatus(student.id);
            const statusColors = {
              '출석': '#10b981',
              '지각': '#f59e0b',
              '조퇴': '#f97316',
              '결석': '#ef4444',
              '미등록': '#6b7280'
            };
            return (
              <div key={student.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                backgroundColor: '#f9fafb',
                borderRadius: '4px'
              }}>
                <span>{student.number}번 {student.name}</span>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  backgroundColor: statusColors[status as keyof typeof statusColors] || '#6b7280',
                  color: 'white',
                  fontSize: '0.875rem'
                }}>
                  {status}
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
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>번호</label>
            <input
              type="number"
              value={newStudent.number}
              onChange={(e) => setNewStudent({ ...newStudent, number: e.target.value })}
              placeholder="번호"
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', width: '80px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>이름</label>
            <input
              type="text"
              value={newStudent.name}
              onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
              placeholder="학생 이름"
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', width: '150px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>학급</label>
            <input
              type="text"
              value={newStudent.class}
              onChange={(e) => setNewStudent({ ...newStudent, class: e.target.value })}
              placeholder="학급"
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', width: '80px' }}
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
              cursor: 'pointer'
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
      {/* 빠른 입력 패널 */}
      {isQuickPanelOpen && (
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

            <div style={{ display: 'grid', gap: '1rem' }}>
              {students.map(student => {
                const currentStatus = getStudentTodayStatus(student.id);
                return (
                  <div key={student.id} style={{
                    padding: '1rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '600' }}>{student.number}번 {student.name}</span>
                      <span style={{ fontSize: '0.875rem', color: '#666' }}>현재: {currentStatus}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {(['출석', '지각', '조퇴', '결석'] as const).map(status => (
                        <button
                          key={status}
                          onClick={() => recordAttendance(student.id, status)}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            backgroundColor:
                              status === '출석' ? '#10b981' :
                              status === '지각' ? '#f59e0b' :
                              status === '조퇴' ? '#f97316' : '#ef4444',
                            color: 'white',
                            opacity: currentStatus === status ? 1 : 0.7
                          }}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
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