// app/components/TimeframeSelector.tsx
'use client';

interface TimeframeSelectorProps {
  value: '24h' | '7d' | '30d' | 'all';
  onChange: (value: '24h' | '7d' | '30d' | 'all') => void;
}

export default function TimeframeSelector({ value, onChange }: TimeframeSelectorProps) {
  const options = [
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="flex border border-gray-300 rounded-lg overflow-hidden">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value as any)}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            value === option.value
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}