import { Title } from "@solidjs/meta";
import { createResource, For, Show } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { getTables } from "~/lib/api";
import { formatBytes } from "~/lib/format";
import LoadingSpinner from "~/components/ui/LoadingSpinner";
import { Table, ChevronRight, ArrowLeft } from "lucide-solid";

export default function TablesPage() {
  const params = useParams<{ name: string }>();

  const [data] = createResource(
    () => params.name,
    async (name) => getTables(name)
  );

  return (
    <main>
      <Title>{params.name} — Tables | BackupDB</Title>

      <div class="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div class="flex items-center gap-2 text-sm text-gray-400">
          <A href="/explorer" class="hover:text-gray-600 flex items-center gap-1 no-underline text-gray-400">
            <ArrowLeft size={14} />
            Explorer
          </A>
          <span>/</span>
          <span class="text-gray-700 font-mono font-medium">{params.name}</span>
        </div>

        <div>
          <h1 class="text-2xl font-bold font-poppins text-gray-900 font-mono">{params.name}</h1>
          <p class="text-sm text-gray-500 mt-1">Tables in this database</p>
        </div>

        <Show when={!data.loading} fallback={
          <div class="flex justify-center py-12"><LoadingSpinner size={32} /></div>
        }>
          <div class="bg-white rounded-2xl shadow-card overflow-hidden animate-fade-in-up">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50/80">
                  <th class="text-left py-3.5 px-5 text-xs text-gray-400 font-medium">Table Name</th>
                  <th class="text-left py-3.5 px-5 text-xs text-gray-400 font-medium">Rows</th>
                  <th class="text-left py-3.5 px-5 text-xs text-gray-400 font-medium">Size</th>
                  <th class="text-left py-3.5 px-5 text-xs text-gray-400 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                <For each={data()?.tables || []} fallback={
                  <tr><td colspan="4" class="py-10 text-center text-gray-400">No tables found</td></tr>
                }>
                  {(table) => (
                    <tr class="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td class="py-3 px-5">
                        <div class="flex items-center gap-2">
                          <Table size={14} class="text-gray-400" />
                          <span class="font-mono text-gray-700">{table.name}</span>
                        </div>
                      </td>
                      <td class="py-3 px-5 text-gray-500">{Number(table.rowCount).toLocaleString()}</td>
                      <td class="py-3 px-5 text-gray-500">{formatBytes(Number(table.sizeBytes || 0))}</td>
                      <td class="py-3 px-5 text-right">
                        <A
                          href={`/explorer/${encodeURIComponent(params.name)}/${encodeURIComponent(table.name)}`}
                          class="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 no-underline"
                        >
                          View <ChevronRight size={14} />
                        </A>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </div>
    </main>
  );
}
