import { Title } from "@solidjs/meta";
import { createSignal, createResource, Show } from "solid-js";
import { getSettings, updateSettings } from "~/lib/api";
import LoadingSpinner from "~/components/ui/LoadingSpinner";
import DatabaseSelector from "~/components/DatabaseSelector";
import ScheduleForm from "~/components/ScheduleForm";
import { Save, Shield, FolderArchive, Calendar, AlertCircle, CheckCircle2 } from "lucide-solid";

interface ScheduleItem {
  id?: number;
  type: "daily" | "weekly" | "monthly";
  time_of_day: string;
  days_of_week?: string | null;
  days_of_month?: string | null;
  enabled?: number;
}

export default function SettingsPage() {
  const [data, { refetch }] = createResource(async () => getSettings());

  const [retentionLimit, setRetentionLimit] = createSignal(10);
  const [backupDir, setBackupDir] = createSignal("./backups");
  const [backupAll, setBackupAll] = createSignal(true);
  const [selectedDbs, setSelectedDbs] = createSignal<string[]>([]);

  const [newUsername, setNewUsername] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");

  const [saving, setSaving] = createSignal(false);
  const [message, setMessage] = createSignal<{ type: "success" | "error"; text: string } | null>(null);

  const syncState = () => {
    const s = data()?.settings;
    if (s) {
      setRetentionLimit(Number(s.retention_limit) || 10);
      setBackupDir(String(s.backup_dir || "./backups"));
      setBackupAll(Boolean(s.backup_all));
      setSelectedDbs((s.selected_dbs as string[]) || []);
      setNewUsername(String(s.admin_username || ""));
    }
  };

  const settingsData = () => {
    const d = data();
    if (d && !data.loading) {
      syncState();
    }
    return d;
  };

  const handleSaveGeneral = async (e: Event) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateSettings({
        retention_limit: retentionLimit(),
        backup_dir: backupDir(),
        backup_all: backupAll(),
        selected_dbs: selectedDbs(),
      });
      setMessage({ type: "success", text: "General settings saved successfully" });
      refetch();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async (e: Event) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {};
      if (newUsername().trim()) payload.admin_username = newUsername().trim();
      if (newPassword().trim()) payload.admin_password = newPassword().trim();
      if (Object.keys(payload).length === 0) {
        setMessage({ type: "error", text: "No changes to save" });
        return;
      }
      await updateSettings(payload);
      setNewPassword("");
      setMessage({ type: "success", text: "Security settings updated. You may need to re-login." });
      refetch();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleAction = async (
    action: "create" | "update" | "delete",
    schedData: Partial<ScheduleItem>
  ) => {
    try {
      await updateSettings({
        schedule: { action, ...schedData },
      });
      refetch();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Schedule action failed" });
    }
  };

  return (
    <main>
      <Title>Settings — BackupDB</Title>

      <div class="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 class="text-2xl font-bold font-poppins text-gray-900">Settings</h1>
          <p class="text-sm text-gray-500 mt-1">Manage backup configuration, admin credentials, and schedules</p>
        </div>

        {message() && (
          <div
            class={`flex items-center gap-2 p-4 rounded-xl text-sm animate-fade-in-up ${
              message()!.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            }`}
          >
            {message()!.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{message()!.text}</span>
          </div>
        )}

        <Show when={!data.loading && settingsData()} fallback={
          <div class="flex justify-center py-12"><LoadingSpinner size={32} /></div>
        }>
          {/* General Settings */}
          <form onSubmit={handleSaveGeneral} class="bg-white rounded-2xl shadow-card p-6 animate-fade-in-up space-y-5">
            <div class="flex items-center gap-3 mb-2">
              <FolderArchive size={20} class="text-[#E11D48]" />
              <h2 class="text-lg font-semibold font-poppins text-gray-900">General</h2>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Retention Limit</label>
                <input
                  type="number"
                  min="1"
                  value={retentionLimit()}
                  onInput={(e) => setRetentionLimit(Number(e.currentTarget.value))}
                  class="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p class="text-xs text-gray-400 mt-1">Max backup folders to keep (oldest deleted first)</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Backup Directory</label>
                <input
                  type="text"
                  value={backupDir()}
                  onInput={(e) => setBackupDir(e.currentTarget.value)}
                  class="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div class="space-y-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupAll()}
                  onChange={(e) => setBackupAll(e.currentTarget.checked)}
                  class="w-4 h-4 rounded accent-[#E11D48]"
                />
                <span class="text-sm text-gray-700">Backup all databases (except system databases)</span>
              </label>

              <Show when={!backupAll()}>
                <DatabaseSelector selected={selectedDbs()} onSelect={setSelectedDbs} />
              </Show>
            </div>

            <button
              type="submit"
              disabled={saving()}
              class="px-5 py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-sm font-medium flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={16} />
              Save General Settings
            </button>
          </form>

          {/* Admin Security */}
          <form onSubmit={handleSaveSecurity} class="bg-white rounded-2xl shadow-card p-6 animate-fade-in-up space-y-5">
            <div class="flex items-center gap-3 mb-2">
              <Shield size={20} class="text-[#E11D48]" />
              <h2 class="text-lg font-semibold font-poppins text-gray-900">Admin Security</h2>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Admin Username</label>
                <input
                  type="text"
                  value={newUsername()}
                  onInput={(e) => setNewUsername(e.currentTarget.value)}
                  class="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword()}
                  onInput={(e) => setNewPassword(e.currentTarget.value)}
                  placeholder="Leave blank to keep current"
                  class="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p class="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving()}
              class="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Shield size={16} />
              Update Security
            </button>
          </form>

          {/* Schedules */}
          <div class="bg-white rounded-2xl shadow-card p-6 animate-fade-in-up">
            <div class="flex items-center gap-3 mb-5">
              <Calendar size={20} class="text-[#E11D48]" />
              <h2 class="text-lg font-semibold font-poppins text-gray-900">Backup Schedules</h2>
            </div>

            <ScheduleForm
              schedules={(data()?.schedules || []) as unknown as ScheduleItem[]}
              onSaveSchedule={handleScheduleAction}
            />
          </div>
        </Show>
      </div>
    </main>
  );
}
