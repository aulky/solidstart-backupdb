import { CheckCircle2, XCircle, RefreshCw, Archive, Calendar, Hand } from "lucide-solid";

export type StatusType = "success" | "failed" | "running" | "retention" | "scheduled" | "manual";

interface StatusChipProps {
  status: StatusType;
  label?: string;
}

export default function StatusChip(props: StatusChipProps) {
  const isRunning = () => props.status === "running";
  const label = () => props.label;

  return (
    <span
      class={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
        props.status === "success"
          ? "bg-green-50 text-green-600"
          : props.status === "failed"
          ? "bg-red-50 text-red-600"
          : props.status === "running"
          ? "bg-amber-50 text-amber-600"
          : props.status === "retention"
          ? "bg-amber-100 text-amber-700"
          : props.status === "scheduled"
          ? "bg-blue-100 text-blue-700"
          : "bg-purple-100 text-purple-700"
      }`}
    >
      {props.status === "success" && <CheckCircle2 size={14} />}
      {props.status === "failed" && <XCircle size={14} />}
      {props.status === "running" && <RefreshCw size={14} class="animate-spin" />}
      {props.status === "retention" && <Archive size={14} />}
      {props.status === "scheduled" && <Calendar size={14} />}
      {props.status === "manual" && <Hand size={14} />}
      <span>{label() || props.status}</span>
    </span>
  );
}
