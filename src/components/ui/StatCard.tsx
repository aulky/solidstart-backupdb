import { type JSX } from "solid-js";

interface StatCardProps {
  icon: JSX.Element;
  label: string;
  value: string | number;
  subtext?: string;
  accent?: string;
}

export default function StatCard(props: StatCardProps) {
  return (
    <div class="bg-white rounded-2xl shadow-card p-6 animate-fade-in-up">
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0">
          <p class="text-caption text-gray-500 mb-1">{props.label}</p>
          <p class="text-2xl font-semibold font-poppins text-gray-900 truncate">
            {props.value}
          </p>
          {props.subtext && (
            <p class="text-caption text-gray-400 mt-1">{props.subtext}</p>
          )}
        </div>
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ml-3"
          style={{ "background-color": props.accent || "#E11D48", opacity: 0.1 }}
        >
          <div style={{ color: props.accent || "#E11D48" }}>
            {props.icon}
          </div>
        </div>
      </div>
    </div>
  );
}
