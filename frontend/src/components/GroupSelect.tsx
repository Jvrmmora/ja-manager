import React, { useState, useRef, useEffect } from 'react';

interface Props {
  value?: number | '' | undefined;
  onChange: (val?: number) => void;
  className?: string;
}

const OPTIONS: Array<{ value: number; label: string; color: string }> = [
  { value: 1, label: '1 — Nivel 1', color: '#34C759' },
  { value: 2, label: '2 — Nivel 2', color: '#FF9500' },
  { value: 3, label: '3 — Nivel 3', color: '#FFCC00' },
  { value: 4, label: '4 — Nivel 4', color: '#0EA5E9' },
  { value: 5, label: '5 — Nivel 5', color: '#9CA3AF' },
];

const getColor = (v?: number | '' | undefined) => {
  const found = OPTIONS.find(o => o.value === v);
  if (found) return found.color;
  return '#7C3AED';
};

const GroupSelect: React.FC<Props> = ({ value, onChange, className }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const handleSelect = (v?: number) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div className={className} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(s => !s)}
        className="w-full border rounded-lg px-3 py-2 flex items-center justify-between bg-white"
      >
        <div className="flex items-center gap-3">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-white" style={{ backgroundColor: getColor(value) }} />
          <span className="text-sm text-gray-800">{value ? `${value} — Nivel ${value}` : 'No asignado'}</span>
        </div>
        <svg className={`w-4 h-4 text-gray-500 transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 bg-white border rounded-lg shadow-md z-50 absolute w-full">
          <button
            onClick={() => handleSelect(undefined)}
            className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3"
          >
            <span className="inline-block w-3 h-3 rounded-full border-2 border-white" style={{ backgroundColor: '#7C3AED' }} />
            <span className="text-sm">No asignado</span>
          </button>
          {OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3"
            >
              <span className="inline-block w-3 h-3 rounded-full border-2 border-white" style={{ backgroundColor: opt.color }} />
              <span className="text-sm">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupSelect;
