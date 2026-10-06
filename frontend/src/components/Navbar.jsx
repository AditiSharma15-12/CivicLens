import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Overview' },
    { path: '/report', label: 'Report a problem' },
    { path: '/map', label: 'Map' },
    { path: '/issues', label: 'Issues' },
    { path: '/analytics', label: 'Analytics' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="text-lg font-bold text-slate-900 tracking-tight">
            CivicLens
          </Link>

          <nav className="flex space-x-6">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center h-14 border-b-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-[#0F766E] text-[#0F766E]'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
