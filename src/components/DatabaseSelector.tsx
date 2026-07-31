import { createResource, For, Show } from "solid-js";
import { getDatabases } from "~/lib/api";
import { Database } from "lucide-solid";
import LoadingSpinner from "~/components/ui/LoadingSpinner";

interface DatabaseSelectorProps {
  selected: string[];
  onSelect: (dbs: string[]) => void;
}

export default function DatabaseSelector(props: DatabaseSelectorProps) {
  const [databases] = createResource(async () => {
    const result = await getDatabases();
    return result.databases;
  });

  const toggle = (dbName: string) => {
    const current = [...props.selected];
    const idx = current.indexOf(dbName);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(dbName);
    }
    props.onSelect(current);
  };

  const selectAll = () => {
    const dbs = databases();
    if (dbs) {
      props.onSelect([...dbs]);
    }
  };

  const deselectAll = () => {
    props.onSelect([]);
  };

  return (
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium text-gray-700">Select Databases</label>
        <div class="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            class="text-xs text-blue-600 hover:underline cursor-pointer"
          >
            Select All
          </button>
          <span class="text-xs text-gray-300">|</span>
          <button
            type="button"
            onClick={deselectAll}
            class="text-xs text-gray-500 hover:underline cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>

      <Show when={!databases.loading} fallback={
        <div class="flex items-center justify-center py-4">
          <LoadingSpinner size={20} />
        </div>
      }>
        <div class="grid gap-2 max-h-48 overflow-y-auto scrollbar-thin pr-1">
          <For each={databases()} fallback={
            <p class="text-sm text-gray-400 text-center py-3">No databases found</p>
          }>
            {(db) => (
              <label
                class={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer border transition-colors duration-150 ${
                  props.selected.includes(db)
                    ? "border-[#E11D48]/30 bg-rose-50/50"
                    : "border-gray-100 hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={props.selected.includes(db)}
                  onChange={() => toggle(db)}
                  class="w-4 h-4 rounded accent-[#E11D48]"
                />
                <Database size={14} class="text-gray-400 shrink-0" />
                <span class="text-sm text-gray-700 font-mono">{db}</span>
              </label>
            )}
          </For>
        </div>
      </Show>

      <p class="text-xs text-gray-400">{props.selected.length} database(s) selected</p>
    </div>
  );
}
