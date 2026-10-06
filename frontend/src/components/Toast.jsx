import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';

export default function Toast({ message, type = 'error', onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(), 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const styles = {
    error: 'bg-red-50 border-red-300 text-red-800',
    success: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  };

  const Icon = type === 'error' ? AlertTriangle : CheckCircle;

  return (
    <div className={`flex items-start space-x-2 px-4 py-3 border rounded-md text-xs font-medium ${styles[type]}`}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="flex-shrink-0 hover:opacity-70 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
