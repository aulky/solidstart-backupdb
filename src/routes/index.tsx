import { Title } from "@solidjs/meta";
import { createSignal, createResource, onMount, onCleanup, Show } from "solid-js";
import { getLogStats, getLogs, getBackupStatus } from "~/lib/api";
import { formatBytes, formatDate, timeAgo } from "~/lib/format";
import StatCard from "~/components/ui/StatCard";
import StatusChip from "~/components/ui/StatusChip";
import BackupChart from "~/components/BackupChart";
import BackupModal from "~/components/BackupModal";
import LoadingSpinner from "~/components/ui/LoadingSpinner";
import {
  Database,
  Calendar,
  Clock,
  HardDrive,
  Play,
  RefreshCw,
} from "lucide-solid";

export default function Dashboard() {
  const [backupModalOpen, setBackupModalOpen] = createSignal(false);
  const [running, setRunning] = createSignal(false);

  const [stats, { refetch: refetchStats }] = createResource(async () => {
    return getLogStats();
  });

  const [logs, { refetch: refetchLogs }] = createResource(async () => {
    return getLogs({ limit: "15" });
  });

  let pollInterval: ReturnType<typeof setInterval>;
  onMount(() => {
    pollInterval = setInterval(async () => {
      try {
        const status = await getBackupStatus();
        setRunning(status.running);
      } catch {
        // Ignore
      }
    }, 5000);
  });
  onCleanup(() => clearInterval(pollInterval));

  const handleBackupSuccess = () => {
    refetchStats();
    refetchLogs();
  };

  return (
    <main>
      <Title>Dashboard | BackupDB</Title>

      <div class="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold font-poppins text-gray-900">Dashboard</h1>
            <p class="text-sm text-gray-500 mt-1">Monitor your database backup operations</p>
          </div>
          <div class="flex items-center gap-3">
            <Show when={running()}>
              <StatusChip status="running" label="Backup Running" />
            </Show>
            <button
              onClick={() => setBackupModalOpen(true)}
              disabled={running()}
              class="px-5 py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-sm font-medium shadow-sm hover:shadow transition-all duration-150 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <Play size={16} />
              Backup Now
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <Show when={!stats.loading} fallback={
          <div class="flex justify-center py-8"><LoadingSpinner size={32} /></div>
        }>
          <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Database size={20} />}
              label="Total Databases"
              value={stats()?.totalDatabases ?? 0}
              accent="#E11D48"
            />
            <StatCard
              icon={<Calendar size={20} />}
              label="Active Schedules"
              value={stats()?.activeSchedules ?? 0}
              accent="#2563EB"
            />
            <StatCard
              icon={<Clock size={20} />}
              label="Last Backup"
              value={stats()?.lastRunSuccess ? timeAgo(stats()!.lastRunSuccess) : "Never"}
              subtext={formatDate(stats()?.lastRunSuccess ?? null)}
              accent="#16A34A"
            />
            <StatCard
              icon={<HardDrive size={20} />}
              label="Disk Usage"
              value={stats()?.disk ? formatBytes(stats()!.disk.totalBytes - stats()!.disk.freeBytes) : "N/A"}
              subtext={stats()?.disk ? `${formatBytes(stats()!.disk.freeBytes)} free` : ""}
              accent="#7C3AED"
            />
          </div>
        </Show>

        {/* Storage Bar */}
        <Show when={stats()?.disk}>
          {(disk) => {
            const usedPercent = () => {
              const d = disk();
              if (!d.totalBytes) return 0;
              return Math.round(((d.totalBytes - d.freeBytes) / d.totalBytes) * 100);
            };
            return (
              <div class="bg-white rounded-2xl shadow-card p-6 animate-fade-in-up">
                <div class="flex items-center justify-between mb-3">
                  <span class="text-sm font-medium text-gray-700">Storage</span>
                  <span class="text-sm text-gray-500">{usedPercent()}% used</span>
                </div>
                <div class="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full bg-[#E11D48] transition-all duration-500"
                    style={{ width: `${usedPercent()}%` }}
                  />
                </div>
                <div class="flex justify-between text-xs text-gray-400 mt-2">
                  <span>{formatBytes(stats()!.totalBackupSize)} in backups ({stats()!.totalFolders} folders)</span>
                  <span>{formatBytes(disk().freeBytes)} free of {formatBytes(disk().totalBytes)}</span>
                </div>
              </div>
            );
          }}
        </Show>

        {/* Chart */}
        <Show when={logs()?.chartData && logs()!.chartData.length > 0}>
          <div class="bg-white rounded-2xl shadow-card p-6 animate-fade-in-up">
            <h2 class="text-lg font-semibold font-poppins text-gray-900 mb-4">Backup History (30 days)</h2>
            <BackupChart data={logs()!.chartData} />
          </div>
        </Show>

        {/* Activity Log */}
        <div class="bg-white rounded-2xl shadow-card p-6 animate-fade-in-up">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold font-poppins text-gray-900">Recent Activity</h2>
            <button
              onClick={() => { refetchLogs(); refetchStats(); }}
              class="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <Show when={!logs.loading} fallback={
            <div class="flex justify-center py-6"><LoadingSpinner size={24} /></div>
          }>
            <div class="overflow-x-auto scrollbar-thin">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-100">
                    <th class="text-left py-3 px-3 text-xs text-gray-400 font-medium">Database</th>
                    <th class="text-left py-3 px-3 text-xs text-gray-400 font-medium">Type</th>
                    <th class="text-left py-3 px-3 text-xs text-gray-400 font-medium">Status</th>
                    <th class="text-left py-3 px-3 text-xs text-gray-400 font-medium">Size</th>
                    <th class="text-left py-3 px-3 text-xs text-gray-400 font-medium">Time</th>
                    <th class="text-left py-3 px-3 text-xs text-gray-400 font-medium">Folder</th>
                  </tr>
                </thead>
                <tbody>
                  {(logs()?.logs || []).map((log: Record<string, unknown>) => (
                    <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td class="py-3 px-3 font-mono text-gray-700">{String(log.db_name)}</td>
                      <td class="py-3 px-3">
                        <StatusChip status={String(log.type) as "scheduled" | "manual" | "retention"} />
                      </td>
                      <td class="py-3 px-3">
                        <StatusChip status={String(log.status) as "success" | "failed"} />
                      </td>
                      <td class="py-3 px-3 text-gray-500">{formatBytes(Number(log.file_size || 0))}</td>
                      <td class="py-3 px-3 text-gray-500 text-xs">{timeAgo(String(log.executed_at))}</td>
                      <td class="py-3 px-3 font-mono text-xs text-gray-400">{String(log.folder_name)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Show when={!logs()?.logs?.length}>
                <p class="text-center text-gray-400 text-sm py-8">No backup history yet</p>
              </Show>
            </div>
          </Show>
        </div>
      </div>

      {/* Backup Modal */}
      <BackupModal
        open={backupModalOpen()}
        onClose={() => setBackupModalOpen(false)}
        onSuccess={handleBackupSuccess}
      />
    </main>
  );
}
