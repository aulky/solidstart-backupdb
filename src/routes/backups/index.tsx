import { Title } from "@solidjs/meta";
import { createSignal, createResource, Show, For } from "solid-js";
import { getLogs, deleteBackup, downloadBackup } from "~/lib/api";
import { formatBytes, formatDate, timeAgo } from "~/lib/format";
import StatusChip from "~/components/ui/StatusChip";
import LoadingSpinner from "~/components/ui/LoadingSpinner";
import { Download, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-solid";

export default function BackupsPage() {
  const [page, setPage] = createSignal(1);
  const [filters, setFilters] = createSignal<Record<string, string>>({});

  const [data, { refetch }] = createResource(
    () => ({ page: page(), filters: filters() }),
    async ({ page: p, filters: f }) => {
      return getLogs({ ...f, page: String(p), limit: "20" });
    }
  );

  const applyFilter = (key: string, value: string) => {
    setPage(1);
    if (value) {
      setFilters((prev) => ({ ...prev, [key]: value }));
    } else {
      setFilters((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleDownload = (folder: string, dbName: string) => {
    downloadBackup(folder, `${dbName}.sql`);
  };

  const handleDelete = async (folder: string) => {
    if (!confirm(`Delete backup folder "${folder}" and all its files?`)) return;
    try {
      await deleteBackup(folder);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <main>
      <Title>Backups — BackupDB</Title>

      <div class="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 class="text-2xl font-bold font-poppins text-gray-900">Backup History</h1>
          <p class="text-sm text-gray-500 mt-1">View, download, and manage your backup logs</p>
        </div>

        {/* Filters */}
        <div class="bg-white rounded-2xl shadow-card p-6 animate-fade-in-up">
          <div class="flex flex-wrap gap-4 items-end">
            {/* Search */}
            <div class="flex-1 min-w-[200px]">
              <label class="block text-xs text-gray-400 mb-1">Search</label>
              <div class="relative">
                <Search size={16} class="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search database, folder..."
                  onInput={(e) => applyFilter("search", e.currentTarget.value)}
                  class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            {/* Type */}
            <div>
              <label class="block text-xs text-gray-400 mb-1">Type</label>
              <select
                onChange={(e) => applyFilter("type", e.currentTarget.value)}
                class="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="manual">Manual</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
            {/* Status */}
            <div>
              <label class="block text-xs text-gray-400 mb-1">Status</label>
              <select
                onChange={(e) => applyFilter("status", e.currentTarget.value)}
                class="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div class="bg-white rounded-2xl shadow-card animate-fade-in-up overflow-hidden">
          <Show when={!data.loading} fallback={
            <div class="flex justify-center py-12"><LoadingSpinner size={32} /></div>
          }>
            <div class="overflow-x-auto scrollbar-thin">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-gray-50/80">
                    <th class="text-left py-3.5 px-5 text-xs text-gray-400 font-medium">Database</th>
                    <th class="text-left py-3.5 px-5 text-xs text-gray-400 font-medium">Type</th>
                    <th class="text-left py-3.5 px-5 text-xs text-gray-400 font-medium">Status</th>
                    <th class="text-left py-3.5 px-5 text-xs text-gray-400 font-medium">Size</th>
                    <th class="text-left py-3.5 px-5 text-xs text-gray-400 font-medium">Time</th>
                    <th class="text-left py-3.5 px-5 text-xs text-gray-400 font-medium">Folder</th>
                    <th class="text-left py-3.5 px-5 text-xs text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={data()?.logs || []}>
                    {(log: Record<string, unknown>) => (
                      <tr class="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td class="py-3 px-5 font-mono text-gray-700">{String(log.db_name)}</td>
                        <td class="py-3 px-5">
                          <StatusChip status={String(log.type) as "manual" | "scheduled" | "retention"} />
                        </td>
                        <td class="py-3 px-5">
                          <StatusChip status={String(log.status) as "success" | "failed"} />
                        </td>
                        <td class="py-3 px-5 text-gray-500">{formatBytes(Number(log.file_size || 0))}</td>
                        <td class="py-3 px-5 text-gray-500 text-xs" title={formatDate(String(log.executed_at))}>{timeAgo(String(log.executed_at))}</td>
                        <td class="py-3 px-5 font-mono text-xs text-gray-400">{String(log.folder_name)}</td>
                        <td class="py-3 px-5">
                          <div class="flex items-center gap-1">
                            <Show when={String(log.status) === "success" && String(log.type) !== "retention"}>
                              <button
                                onClick={() => handleDownload(String(log.folder_name), String(log.db_name))}
                                class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Download"
                              >
                                <Download size={15} />
                              </button>
                            </Show>
                            <Show when={String(log.type) !== "retention"}>
                              <button
                                onClick={() => handleDelete(String(log.folder_name))}
                                class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete folder"
                              >
                                <Trash2 size={15} />
                              </button>
                            </Show>
                          </div>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>

              <Show when={!data()?.logs?.length}>
                <p class="text-center text-gray-400 text-sm py-10">No backup records found</p>
              </Show>
            </div>

            {/* Pagination */}
            <Show when={data()?.pagination && data()!.pagination.totalPages > 1}>
              <div class="flex items-center justify-between px-5 py-4 border-t border-gray-50">
                <span class="text-xs text-gray-400">
                  Page {data()!.pagination.page} of {data()!.pagination.totalPages} — {data()!.pagination.total} records
                </span>
                <div class="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page() <= 1}
                    class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data()!.pagination.totalPages, p + 1))}
                    disabled={page() >= (data()?.pagination.totalPages ?? 1)}
                    class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </Show>
          </Show>
        </div>
      </div>
    </main>
  );
}
