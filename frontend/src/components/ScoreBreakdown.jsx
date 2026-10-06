import React from 'react';

export default function ScoreBreakdown({ score, priority, breakdown }) {
  if (!breakdown) return null;

  const factors = [
    { key: 'type_weight', label: 'Issue Type', color: 'bg-[#0F766E]' },
    { key: 'size_ratio', label: 'Physical Size', color: 'bg-amber-600' },
    { key: 'confidence', label: 'Confidence', color: 'bg-blue-600' },
    { key: 'location_risk', label: 'Location Risk', color: 'bg-purple-600' },
    { key: 'duplicates', label: 'Report Count', color: 'bg-rose-600' },
  ];

  // Generate plain English explanation summary
  const getExplanationSentence = () => {
    const sizeContribution = breakdown.size_ratio?.contribution || 0;
    const dupContribution = breakdown.duplicates?.contribution || 0;
    const typeContribution = breakdown.type_weight?.contribution || 0;

    const reasons = [];
    if (sizeContribution >= 10) reasons.push('large physical size');
    if (dupContribution >= 10) reasons.push('multiple duplicate reports');
    if (typeContribution >= 25) reasons.push('high severity issue category');

    if (reasons.length > 0) {
      return `${priority} priority mainly due to ${reasons.join(' and ')}.`;
    }
    return `${priority} priority based on standard algorithmic factor evaluation.`;
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-3 text-xs">
      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
        <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
          Priority Score: {score} / 100 ({priority})
        </span>
        <span className="text-slate-500 font-medium">{getExplanationSentence()}</span>
      </div>

      {/* Horizontal Stacked Bar */}
      <div className="space-y-1">
        <div className="h-3 w-full bg-slate-200 rounded-sm overflow-hidden flex">
          {factors.map(({ key, color }) => {
            const item = breakdown[key];
            const widthPct = item ? item.contribution : 0;
            return (
              <div
                key={key}
                className={`${color} h-full transition-all`}
                style={{ width: `${widthPct}%` }}
                title={`${key}: +${widthPct} pts`}
              />
            );
          })}
        </div>
      </div>

      {/* Contribution Breakdown Table */}
      <table className="w-full text-left border-collapse mt-2">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500 font-medium text-[11px]">
            <th className="py-1 font-medium">Factor</th>
            <th className="py-1 font-medium text-right">Raw Value</th>
            <th className="py-1 font-medium text-right">Weight</th>
            <th className="py-1 font-medium text-right">Contribution</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/60 text-slate-700 font-mono text-[11px]">
          {factors.map(({ key, label }) => {
            const item = breakdown[key] || { raw_value: 0, weight: 0, contribution: 0 };
            return (
              <tr key={key}>
                <td className="py-1 font-sans text-slate-800 font-medium">{label}</td>
                <td className="py-1 text-right">{item.raw_value}</td>
                <td className="py-1 text-right">{(item.weight * 100).toFixed(0)}%</td>
                <td className="py-1 text-right font-bold text-slate-900">+{item.contribution} pts</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
