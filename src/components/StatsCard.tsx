"use client";

interface StatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  trend?: string;
  color?: string;
}

export function StatsCard({ icon, label, value, trend, color = "#0FED9D" }: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5">
      <div className="mb-4 flex items-center justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}20` }}
        >
          <span className="text-xl">{icon}</span>
        </div>
        {trend && (
          <span className="text-xs text-[#0FED9D]">{trend}</span>
        )}
      </div>
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      <p className="mt-1 text-sm text-white/50">{label}</p>
    </div>
  );
}
