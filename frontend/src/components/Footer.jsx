import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Footer() {
  const [hasSeedData, setHasSeedData] = useState(false);

  useEffect(() => {
    checkData();
  }, []);

  const checkData = async () => {
    try {
      const stats = await api.getStats();
      if (stats && stats.total_issues > 0) {
        setHasSeedData(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center text-xs text-slate-500">
        <div>CivicLens Public Infrastructure Platform</div>
        {hasSeedData && (
          <div className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium border border-slate-200">
            Demo data
          </div>
        )}
      </div>
    </footer>
  );
}
