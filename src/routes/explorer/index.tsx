import { Title } from "@solidjs/meta";
import { createResource, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { getDatabases } from "~/lib/api";
import LoadingSpinner from "~/components/ui/LoadingSpinner";
import { Database, ChevronRight } from "lucide-solid";

export default function ExplorerIndex() {
  const [data] = createResource(async () => getDatabases());

  return (
    <main>
      <Title>Database Explorer — BackupDB</Title>

      <div class="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 class="text-2xl font-bold font-poppins text-gray-900">Database Explorer</h1>
          <p class="text-sm text-gray-500 mt-1">Browse databases, inspect tables, and preview data (Read-Only)</p>
        </div>

        <Show when={!data.loading} fallback={
          <div class="flex justify-center py-12"><LoadingSpinner size={32} /></div>
        }>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <For each={data()?.databases || []} fallback={
              <p class="text-gray-400 text-sm col-span-full py-8 text-center">No databases found</p>
            }>
              {(dbName) => (
                <A
                  href={`/explorer/${encodeURIComponent(dbName)}`}
                  class="bg-white rounded-2xl shadow-card p-5 border border-transparent hover:border-[#E11D48]/20 transition-all duration-150 flex items-center justify-between group no-underline"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-[#E11D48]">
                      <Database size={20} />
                    </div>
                    <div>
                      <h2 class="text-base font-semibold font-mono text-gray-900 group-hover:text-[#E11D48] transition-colors">{dbName}</h2>
                    </div>
                  </div>
                  <ChevronRight size={18} class="text-gray-300 group-hover:text-[#E11D48] transition-colors" />
                </A>
              )}
            </For>
          </div>
        </Show>
      </div>
    </main>
  );
}
