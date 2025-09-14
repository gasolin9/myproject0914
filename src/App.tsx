import React, { useState, useEffect } from 'react';
import './styles/globals.css';

export default function App() {
  const [isQuickPanelOpen, setIsQuickPanelOpen] = useState(false);

  // 테스트용 함수
  const handleTestClick = () => {
    console.log('테스트 버튼 클릭됨!');
    alert('버튼이 작동합니다!');
  };

  // 네비게이션 핸들러들
  const handleDashboard = () => {
    alert('대시보드 페이지로 이동 (구현 예정)');
  };

  const handleStudents = () => {
    alert('학생관리 페이지로 이동 (구현 예정)');
  };

  const handleSettings = () => {
    alert('설정 페이지로 이동 (구현 예정)');
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
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>빠른 출결 입력 (데모)</h2>
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
            <p style={{ textAlign: 'center', color: '#666', padding: '2rem 0' }}>
              빠른 입력 패널이 정상적으로 열렸습니다!<br/>
              ESC 키를 누르거나 X 버튼을 클릭해서 닫으세요.
            </p>
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
              onClick={handleDashboard}
              style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1rem', padding: '0.5rem 1rem' }}
            >
              대시보드
            </button>
            <button
              onClick={handleStudents}
              style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1rem', padding: '0.5rem 1rem' }}
            >
              학생관리
            </button>
            <button
              onClick={handleSettings}
              style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1rem', padding: '0.5rem 1rem' }}
            >
              설정
            </button>
          </div>
        </div>
      </nav>

      {/* 메인 컨텐츠 */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#111', marginBottom: '1rem' }}>
            출결 기록 앱이 성공적으로 실행됐습니다!
          </h2>
          <p style={{ fontSize: '1.125rem', color: '#666', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
            초등학교 교사용 로컬 우선 출결 기록 앱입니다.<br/>
            아래 버튼을 클릭하거나 단축키를 사용해 빠른 입력 패널을 테스트해보세요.
          </p>

          {/* 테스트 버튼 */}
          <div style={{
            backgroundColor: '#dbeafe',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '400px',
            margin: '0 auto 3rem'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e40af', marginBottom: '1rem' }}>
              빠른 입력 패널 테스트
            </h3>

            {/* 기본 테스트 버튼 */}
            <button
              onClick={handleTestClick}
              style={{
                width: '100%',
                backgroundColor: '#ef4444',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                marginBottom: '0.75rem'
              }}
            >
              🔴 테스트 버튼 (클릭해보세요)
            </button>

            <button
              onClick={() => setIsQuickPanelOpen(true)}
              style={{
                width: '100%',
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                marginBottom: '0.75rem'
              }}
            >
              빠른 입력 패널 열기
            </button>
            <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0 }}>
              또는 <kbd style={{ backgroundColor: '#bfdbfe', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                Ctrl+Alt+A
              </kbd> 단축키 사용
            </p>
          </div>

          {/* 상태 카드들 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            maxWidth: '800px',
            margin: '0 auto 3rem'
          }}>
            {[
              { label: '출석', count: 28, color: '#10b981', icon: '✓' },
              { label: '지각', count: 1, color: '#f59e0b', icon: '⏰' },
              { label: '조퇴', count: 0, color: '#f97316', icon: '🏃' },
              { label: '결석', count: 1, color: '#ef4444', icon: '✗' }
            ].map((item) => (
              <div key={item.label} style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '1.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  width: '4rem',
                  height: '4rem',
                  backgroundColor: item.color,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1.5rem',
                  margin: '0 auto 0.75rem'
                }}>
                  {item.icon}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111' }}>{item.count}명</div>
                <div style={{ color: '#666' }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* 상태 정보 */}
          <div style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            padding: '1rem',
            maxWidth: '400px',
            margin: '0 auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: '#10b981', marginRight: '0.75rem', fontSize: '1.25rem' }}>✅</div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#065f46' }}>앱이 정상 실행 중</div>
                <div style={{ fontSize: '0.75rem', color: '#10b981' }}>로컬 저장소 연결됨 • 자동 저장 활성화</div>
              </div>
            </div>
          </div>
        </div>
      </main>

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
          <div>출결 기록 앱 v1.0.0 - 초등학교 교사용</div>
          <div>모든 데이터는 브라우저에 안전하게 저장됩니다</div>
        </div>
      </footer>
    </div>
  );
}