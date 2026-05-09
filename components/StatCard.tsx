interface Props {
  label: string;
  value: string | number;
  sub?: string;
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'default';
}

const COLORS = {
  green: 'text-emerald-400',
  red: 'text-red-400',
  yellow: 'text-amber-400',
  blue: 'text-blue-400',
  default: 'text-white',
};

export default function StatCard({ label, value, sub, color = 'default' }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${COLORS[color]}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}
