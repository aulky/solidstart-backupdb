import { createSignal } from "solid-js";
import Dialog from "~/components/ui/Dialog";
import DatabaseSelector from "~/components/DatabaseSelector";
import { triggerBackup } from "~/lib/api";
import { Play } from "lucide-solid";

interface BackupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BackupModal(props: BackupModalProps) {
  const [selectedDbs, setSelectedDbs] = createSignal<string[]>([]);
  const [mode, setMode] = createSignal<"default" | "custom">("default");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  const handleStart = async () => {
    setError("");
    setLoading(true);

    try {
      const target = mode() === "custom" ? selectedDbs() : undefined;
      await triggerBackup(target);
      props.onSuccess();
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title="Run Manual Backup"
      subtitle="Start an instant database backup job"
    >
      <div class="space-y-6">
        {/* Mode selector */}
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode("default")}
            class={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
              mode() === "default"
                ? "border-[#E11D48] bg-rose-50/40 text-gray-900 font-medium"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div class="text-sm">Default Config</div>
            <div class="text-xs text-gray-400 mt-0.5">Use settings selection</div>
          </button>
          <button
            type="button"
            onClick={() => setMode("custom")}
            class={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
              mode() === "custom"
                ? "border-[#E11D48] bg-rose-50/40 text-gray-900 font-medium"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div class="text-sm">Custom Selection</div>
            <div class="text-xs text-gray-400 mt-0.5">Choose databases now</div>
          </button>
        </div>

        {/* Custom DB Selector */}
        {mode() === "custom" && (
          <DatabaseSelector
            selected={selectedDbs()}
            onSelect={setSelectedDbs}
          />
        )}

        {/* Error message */}
        {error() && (
          <div class="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error()}</div>
        )}

        {/* Action Button */}
        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={props.onClose}
            class="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors duration-150 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={loading() || (mode() === "custom" && selectedDbs().length === 0)}
            class="px-5 py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-sm font-medium transition-colors duration-150 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            <Play size={16} />
            <span>{loading() ? "Running Backup..." : "Start Backup Now"}</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
}
