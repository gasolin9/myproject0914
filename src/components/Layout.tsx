import React from 'react';
import { Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">출결 기록 앱</h1>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}