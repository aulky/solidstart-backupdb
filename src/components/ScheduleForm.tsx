import { createSignal } from "solid-js";
import { Plus, Trash2, Clock } from "lucide-solid";

interface ScheduleItem {
  id?: number;
  type: "daily" | "weekly" | "monthly";
  time_of_day: string;
  days_of_week?: string | null;
  days_of_month?: string | null;
  enabled?: number;
}

interface ScheduleFormProps {
  schedules: ScheduleItem[];
  onSaveSchedule: (action: "create" | "update" | "delete", data: Partial<ScheduleItem>) => Promise<void>;
}

export default function ScheduleForm(props: ScheduleFormProps) {
  const [type, setType] = createSignal<"daily" | "weekly" | "monthly">("daily");
  const [time, setTime] = createSignal("02:00");
  const [daysOfWeek, setDaysOfWeek] = createSignal("1"); // Monday
  const [daysOfMonth, setDaysOfMonth] = createSignal("1"); // 1st of month
  const [loading, setLoading] = createSignal(false);

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    try {
      await props.onSaveSchedule("create", {
        type: type(),
        time_of_day: time(),
        days_of_week: type() === "weekly" ? daysOfWeek() : undefined,
        days_of_month: type() === "monthly" ? daysOfMonth() : undefined,
        enabled: 1,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (sched: ScheduleItem) => {
    await props.onSaveSchedule("update", {
      id: sched.id,
      enabled: sched.enabled ? 0 : 1,
    });
  };

  const handleDelete = async (id?: number) => {
    if (!id || !confirm("Delete this schedule?")) return;
    await props.onSaveSchedule("delete", { id });
  };

  return (
    <div class="space-y-6">
      {/* Existing Schedules */}
      <div class="space-y-3">
        <h3 class="text-sm font-medium text-gray-700">Active Schedules</h3>
        <div class="space-y-2">
          {props.schedules.map((sched) => (
            <div class="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50/50">
              <div class="flex items-center gap-3">
                <Clock size={16} class="text-gray-400" />
                <div>
                  <span class="text-sm font-semibold capitalize text-gray-900">{sched.type}</span>
                  <span class="text-xs text-gray-400 ml-2">at {sched.time_of_day}</span>
                  {sched.type === "weekly" && <span class="text-xs text-gray-400 font-mono ml-2">(day {sched.days_of_week})</span>}
                  {sched.type === "monthly" && <span class="text-xs text-gray-400 font-mono ml-2">(date {sched.days_of_month})</span>}
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(sched)}
                  class={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${
                    sched.enabled ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {sched.enabled ? "Enabled" : "Disabled"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(sched.id)}
                  class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {props.schedules.length === 0 && (
            <p class="text-xs text-gray-400 py-3 text-center">No active schedules configured</p>
          )}
        </div>
      </div>

      {/* Add New Schedule Form */}
      <form onSubmit={handleCreate} class="p-4 rounded-xl border border-gray-200 bg-white space-y-4">
        <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Add New Schedule</h4>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs text-gray-400 mb-1">Frequency</label>
            <select
              value={type()}
              onChange={(e) => setType(e.currentTarget.value as "daily" | "weekly" | "monthly")}
              class="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label class="block text-xs text-gray-400 mb-1">Time of Day (HH:MM)</label>
            <input
              type="time"
              value={time()}
              onInput={(e) => setTime(e.currentTarget.value)}
              required
              class="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {type() === "weekly" && (
            <div>
              <label class="block text-xs text-gray-400 mb-1">Day of Week</label>
              <select
                value={daysOfWeek()}
                onChange={(e) => setDaysOfWeek(e.currentTarget.value)}
                class="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
                <option value="0">Sunday</option>
              </select>
            </div>
          )}

          {type() === "monthly" && (
            <div>
              <label class="block text-xs text-gray-400 mb-1">Date of Month</label>
              <input
                type="text"
                placeholder="e.g. 1,15"
                value={daysOfMonth()}
                onInput={(e) => setDaysOfMonth(e.currentTarget.value)}
                class="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading()}
          class="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Plus size={14} /> Add Schedule
        </button>
      </form>
    </div>
  );
}
