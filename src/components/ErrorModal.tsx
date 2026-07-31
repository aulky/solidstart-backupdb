import Dialog from "~/components/ui/Dialog";
import { AlertTriangle } from "lucide-solid";

interface ErrorModalProps {
  open: boolean;
  onClose: () => void;
  dbName?: string;
  folderName?: string;
  errorMessage?: string;
  executedAt?: string;
}

export default function ErrorModal(props: ErrorModalProps) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title="Backup Execution Error"
      subtitle={`Failure log for ${props.dbName || "database"}`}
    >
      <div class="space-y-4">
        <div class="flex items-center gap-3 p-3.5 bg-red-50 text-red-700 rounded-xl text-sm">
          <AlertTriangle size={20} class="shrink-0 text-red-600" />
          <div>
            <div class="font-semibold">Backup Failed</div>
            <div class="text-xs opacity-90">Folder: <span class="font-mono">{props.folderName}</span></div>
          </div>
        </div>

        <div>
          <label class="block text-xs text-gray-500 font-medium mb-1">Error Message Detail</label>
          <div class="p-4 bg-gray-900 text-red-400 font-mono text-xs rounded-xl overflow-x-auto scrollbar-thin whitespace-pre-wrap max-h-60 border border-gray-800">
            {props.errorMessage || "No detailed error message recorded."}
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <button
            type="button"
            onClick={props.onClose}
            class="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );
}
