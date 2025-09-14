import React from 'react';

export function DashBoard() {
  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">대시보드</h2>
        <p className="text-gray-600 mb-8">오늘의 출결 현황을 확인하세요</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            { label: '출석', count: 0, color: 'bg-green-500' },
            { label: '지각', count: 0, color: 'bg-yellow-500' },
            { label: '조퇴', count: 0, color: 'bg-orange-500' },
            { label: '결석', count: 0, color: 'bg-red-500' }
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-lg p-6 shadow-sm border">
              <div className={`w-12 h-12 ${item.color} rounded-lg mx-auto mb-4 flex items-center justify-center`}>
                <span className="text-white font-bold">{item.count}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{item.label}</h3>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <p className="text-sm text-gray-500">
            Ctrl+Alt+A (또는 ⌥⌘A)를 눌러 빠른 입력 패널을 열어보세요
          </p>
        </div>
      </div>
    </div>
  );
}