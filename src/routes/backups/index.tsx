import { Title } from "@solidjs/meta";
import { createSignal, createResource, Show, For } from "solid-js";
import { getLogs, deleteBackup, downloadBackup } from "~/lib/api";
import { formatBytes, formatDate, timeAgo } from "~/lib/format";
import StatusChip from "~/components/ui/StatusChip";
import LoadingSpinner from "~/components/ui/LoadingSpinner";
import ErrorModal from "~/components/ErrorModal";
import { Download, Trash2, Search, ChevronLeft, ChevronRight, Folder, FolderOpen, AlertTriangle, ChevronDown } from "lucide-solid";

interface LogEntry {
  id: number;
  db_name: string;
  executed_at: string;
  type: "scheduled" | "manual" | "retention";
  status: "success" | "failed";
  file_size: number;
  error_message: string | null;
  folder_name: string;
}

interface GroupedFolder {
  folder_name: string;
  executed_at: string;
  type: "scheduled" | "manual" | "retention";
  total_size: number;
  has_failed: boolean;
  items: LogEntry[];
}

export default function BackupsPage() {
  const [page, setPage] = createSignal(1);
  const [filters, setFilters] = createSignal<Record<string, string>>({});
  const [expandedFolders, setExpandedFolders] = createSignal<Record<string, boolean>>({});

  // Error modal state
  const [selectedError, setSelectedError] = createSignal<{
    open: boolean;
    dbName?: string;
    folderName?: string;
    errorMessage?: string;
  }>({ open: false });

  const [data, { refetch }] = createResource(
    () => ({ page: page(), filters: filters() }),
    async ({ page: p, filters: f }) => {
      return getLogs({ ...f, page: String(p), limit: "50" });
    }
  );

  // Group log items by folder_name — FEATURES.md §6
  const groupedFolders = () => {
    const rawLogs = (data()?.logs || []) as unknown as LogEntry[];
    const map = new Map<string, GroupedFolder>();

    for (const log of rawLogs) {
      if (!map.has(log.folder_name)) {
        map.set(log.folder_name, {
          folder_name: log.folder_name,
          executed_at: log.executed_at,
          type: log.type,
          total_size: 0,
          has_failed: false,
          items: [],
        });
      }

      const grp = map.get(log.folder_name)!;
      grp.items.push(log);
      grp.total_size += Number(log.file_size || 0);
      if (log.status === "failed") grp.has_failed = true;
    }

    return Array.from(map.values());
  };

  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

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

  const handleDeleteFolder = async (folder: string, e: Event) => {
    e.stopPropagation();
    if (!confirm(`Delete backup folder "${folder}" and all SQL files inside?`)) return;
    try {
      await deleteBackup(folder);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const showErrorDetails = (log: LogEntry, e: Event) => {
    e.stopPropagation();
    setSelectedError({
      open: true,
      dbName: log.db_name,
      folderName: log.folder_name,
      errorMessage: log.error_message || "No detail provided",
    });
  };

  return (
    <main>
      <Title>Backups — BackupDB</Title>

      <div class="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 class="text-2xl font-bold font-poppins text-gray-900">Backup Folders & Files</h1>
          <p class="text-sm text-gray-500 mt-1">Browse backups grouped by execution folder and inspect SQL files</p>
        </div>

        {/* Filters */}
        <div class="bg-white rounded-2xl shadow-card p-5 animate-fade-in-up">
          <div class="flex flex-wrap gap-4 items-end">
            <div class="flex-1 min-w-[200px]">
              <label class="block text-xs text-gray-400 mb-1">Search</label>
              <div class="relative">
                <Search size={16} class="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search database, folder name..."
                  onInput={(e) => applyFilter("search", e.currentTarget.value)}
                  class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Type</label>
              <select
                onChange={(e) => applyFilter("type", e.currentTarget.value)}
                class="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="manual">Manual</option>
                <option value="scheduled">Scheduled</option>
                <option value="retention">Retention</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Status</label>
              <select
                onChange={(e) => applyFilter("status", e.currentTarget.value)}
                class="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grouped Folders List */}
        <Show when={!data.loading} fallback={
          <div class="flex justify-center py-12"><LoadingSpinner size={32} /></div>
        }>
          <div class="space-y-4">
            <For each={groupedFolders()} fallback={
              <div class="bg-white rounded-2xl p-10 text-center text-gray-400 text-sm shadow-card">
                No backup folders found matching filters
              </div>
            }>
              {(folder) => {
                const isExpanded = () => expandedFolders()[folder.folder_name] ?? true;

                return (
                  <div class="bg-white rounded-2xl shadow-card overflow-hidden transition-all duration-150 border border-gray-100">
                    {/* Folder Header */}
                    <div
                      onClick={() => toggleFolder(folder.folder_name)}
                      class="flex items-center justify-between p-4 px-5 bg-gray-50/60 hover:bg-gray-100/60 cursor-pointer select-none border-b border-gray-100 transition-colors"
                    >
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                          {isExpanded() ? <FolderOpen size={20} /> : <Folder size={20} />}
                        </div>
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="font-mono font-semibold text-gray-900 text-sm">{folder.folder_name}</span>
                            <StatusChip status={folder.type} />
                            <Show when={folder.has_failed}>
                              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                <AlertTriangle size={12} /> Has Failures
                              </span>
                            </Show>
                          </div>
                          <p class="text-xs text-gray-400 mt-0.5" title={formatDate(folder.executed_at)}>
                            {timeAgo(folder.executed_at)} ({formatDate(folder.executed_at)}) — {folder.items.length} file(s)
                          </p>
                        </div>
                      </div>

                      <div class="flex items-center gap-3">
                        <span class="text-xs font-mono font-medium text-gray-500 hidden sm:inline">
                          Total: {formatBytes(folder.total_size)}
                        </span>
                        <Show when={folder.type !== "retention"}>
                          <button
                            onClick={(e) => handleDeleteFolder(folder.folder_name, e)}
                            class="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete whole folder"
                          >
                            <Trash2 size={16} />
                          </button>
                        </Show>
                        <ChevronDown
                          size={18}
                          class={`text-gray-400 transition-transform duration-200 ${isExpanded() ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>

                    {/* Files inside Folder */}
                    <Show when={isExpanded()}>
                      <div class="divide-y divide-gray-50">
                        <For each={folder.items}>
                          {(log) => (
                            <div class={`flex items-center justify-between p-3.5 px-6 hover:bg-gray-50/50 transition-colors text-sm ${log.status === "failed" ? "bg-red-50/30" : ""}`}>
                              <div class="flex items-center gap-3 min-w-0">
                                <span class="font-mono text-gray-800 font-medium truncate">{log.db_name}.sql</span>
                                <StatusChip status={log.status} />
                              </div>

                              <div class="flex items-center gap-4 shrink-0">
                                <span class="text-xs text-gray-500 font-mono">
                                  {log.status === "success" ? formatBytes(Number(log.file_size || 0)) : "0 B"}
                                </span>

                                {/* Download or View Error */}
                                <Show
                                  when={log.status === "success" && log.type !== "retention"}
                                  fallback={
                                    <Show when={log.status === "failed"}>
                                      <button
                                        onClick={(e) => showErrorDetails(log, e)}
                                        class="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                      >
                                        <AlertTriangle size={13} />
                                        View Error Log
                                      </button>
                                    </Show>
                                  }
                                >
                                  <button
                                    onClick={() => handleDownload(log.folder_name, log.db_name)}
                                    class="px-3 py-1 rounded-xl border border-gray-200 hover:border-blue-500 text-gray-700 hover:text-blue-600 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <Download size={14} /> Download SQL
                                  </button>
                                </Show>
                              </div>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>

          {/* Pagination */}
          <Show when={data()?.pagination && data()!.pagination.totalPages > 1}>
            <div class="flex items-center justify-between px-5 py-4 bg-white rounded-2xl shadow-card">
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

      {/* Error Log Modal */}
      <ErrorModal
        open={selectedError().open}
        onClose={() => setSelectedError({ open: false })}
        dbName={selectedError().dbName}
        folderName={selectedError().folderName}
        errorMessage={selectedError().errorMessage}
      />
    </main>
  );
}
