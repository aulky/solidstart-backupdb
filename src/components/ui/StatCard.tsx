import { type JSX } from "solid-js";

interface StatCardProps {
  icon: JSX.Element;
  label: string;
  value: string | number;
  subtext?: string;
  accent?: string;
}

export default function StatCard(props: StatCardProps) {
  const accentColor = () => props.accent || "#E11D48";

  return (
    <div class="bg-white rounded-2xl shadow-card p-6 animate-fade-in-up">
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-500 mb-1 font-medium">{props.label}</p>
          <p class="text-2xl font-semibold font-poppins text-gray-900 truncate">
            {props.value}
          </p>
          {props.subtext && (
            <p class="text-xs text-gray-400 mt-1">{props.subtext}</p>
          )}
        </div>
        {/* Fix opacity: beri alpha pada background color, bukan opacity CSS pada seluruh element */}
        <div
          class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ml-3"
          style={{ "background-color": `${accentColor()}15`, color: accentColor() }}
        >
          {props.icon}
        </div>
      </div>
    </div>
  );
}
