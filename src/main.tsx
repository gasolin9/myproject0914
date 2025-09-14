// ==============================================
// 메인 엔트리 포인트
// ==============================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 앱 시작
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 핫 모듈 리플레이스먼트 지원
if (import.meta.env.DEV) {
  // HMR 지원은 Vite에서 자동으로 처리됩니다
}