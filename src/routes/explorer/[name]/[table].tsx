import { Title } from "@solidjs/meta";
import { createSignal, createResource, For, Show } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { getTableStructure, getTableData } from "~/lib/api";
import LoadingSpinner from "~/components/ui/LoadingSpinner";

export default function TableDetailPage() {
  const params = useParams<{ name: string; table: string }>();
  const [activeTab, setActiveTab] = createSignal<"structure" | "data">("structure");

  const [structure] = createResource(
    () => ({ db: params.name, table: params.table }),
    async ({ db, table }) => getTableStructure(db, table)
  );

  const [tableData] = createResource(
    () => ({ db: params.name, table: params.table, tab: activeTab() }),
    async ({ db, table, tab }) => {
      if (tab === "data") {
        return getTableData(db, table);
      }
      return null;
    }
  );

  return (
    <main>
      <Title>{params.table} — {params.name} — BackupDB</Title>

      <div class="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div class="flex items-center gap-2 text-sm text-gray-400">
          <A href="/explorer" class="hover:text-gray-600 no-underline text-gray-400">Explorer</A>
          <span>/</span>
          <A href={`/explorer/${encodeURIComponent(params.name)}`} class="hover:text-gray-600 font-mono no-underline text-gray-400">
            {params.name}
          </A>
          <span>/</span>
          <span class="text-gray-700 font-mono font-medium">{params.table}</span>
        </div>

        {/* Title */}
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold font-poppins font-mono text-gray-900">{params.table}</h1>
            <p class="text-sm text-gray-500 mt-1">Database: {params.name}</p>
          </div>

          {/* Tabs */}
          <div class="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("structure")}
              class={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer ${
                activeTab() === "structure"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Structure
            </button>
            <button
              onClick={() => setActiveTab("data")}
              class={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer ${
                activeTab() === "data"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Data Preview (Max 100)
            </button>
          </div>
        </div>

        {/* Tab: Structure */}
        <Show when={activeTab() === "structure"}>
          <Show when={!structure.loading} fallback={<div class="flex justify-center py-12"><LoadingSpinner size={32} /></div>}>
            <div class="bg-white rounded-2xl shadow-card overflow-hidden animate-fade-in-up">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-gray-50/80">
                    <th class="text-left py-3.5 px-5 text-xs text-gray-400 font-medium">Column</th>
                    <th class="text-left py-3.5 px-5 text-xs text-gray-400 font-medium">Type</th>
                    <th class="text-left py-3.5 px-5 text-xs text-gray-400 font-medium">Nullable</th>
                    <th class="text-left py-3.5 px-5 text-xs text-gray-400 font-medium">Key</th>
                    <th class="text-left py-3.5 px-5 text-xs text-gray-400 font-medium">Default</th>
                    <th class="text-left py-3.5 px-5 text-xs text-gray-400 font-medium">Extra</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={structure()?.columns || []}>
                    {(col) => (
                      <tr class="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td class="py-3 px-5 font-mono text-gray-900 font-medium">{col.name}</td>
                        <td class="py-3 px-5 font-mono text-xs text-blue-600">{col.type}</td>
                        <td class="py-3 px-5 text-xs text-gray-500">{col.nullable}</td>
                        <td class="py-3 px-5 text-xs font-mono font-semibold text-rose-600">{col.key}</td>
                        <td class="py-3 px-5 font-mono text-xs text-gray-400">{String(col.default ?? "NULL")}</td>
                        <td class="py-3 px-5 text-xs text-gray-400">{col.extra}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </Show>

        {/* Tab: Data */}
        <Show when={activeTab() === "data"}>
          <Show when={!tableData.loading} fallback={<div class="flex justify-center py-12"><LoadingSpinner size={32} /></div>}>
            <div class="bg-white rounded-2xl shadow-card overflow-hidden animate-fade-in-up">
              <div class="overflow-x-auto scrollbar-thin max-h-[600px]">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="bg-gray-50/80 sticky top-0 border-b border-gray-100">
                      <For each={tableData()?.columns || []}>
                        {(col) => (
                          <th class="text-left py-3 px-4 text-gray-500 font-mono font-medium whitespace-nowrap">{col}</th>
                        )}
                      </For>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={tableData()?.rows || []} fallback={
                      <tr><td class="py-8 text-center text-gray-400">Table is empty</td></tr>
                    }>
                      {(row) => (
                        <tr class="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <For each={tableData()?.columns || []}>
                            {(col) => (
                              <td class="py-2.5 px-4 font-mono text-gray-700 whitespace-nowrap max-w-xs truncate">
                                {row[col] === null ? <span class="text-gray-300 italic">NULL</span> : String(row[col])}
                              </td>
                            )}
                          </For>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          </Show>
        </Show>
      </div>
    </main>
  );
}
