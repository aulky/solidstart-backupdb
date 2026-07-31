const BASE = "";

async function request<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...opts,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...opts.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Auth
export function login(username: string, password: string) {
  return request<{ success: boolean; message: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function checkSession() {
  return request<{
    authenticated: boolean;
    user?: { username: string; role: string };
    isDefaultPassword?: boolean;
  }>("/api/auth/session");
}

export function logout() {
  return request<{ success: boolean }>("/api/auth/session", { method: "POST" });
}

// Backup
export function triggerBackup(databases?: string[]) {
  return request<{
    success: boolean;
    folderName: string;
    results: Array<{ db: string; status: string; size: number; error?: string }>;
  }>("/api/backup", {
    method: "POST",
    body: JSON.stringify({ databases }),
  });
}

export function getBackupStatus() {
  return request<{ running: boolean }>("/api/backup/status");
}

// Settings
export function getSettings() {
  return request<{
    settings: Record<string, unknown>;
    schedules: Array<Record<string, unknown>>;
    disk: { freeBytes: number; totalBytes: number };
  }>("/api/settings");
}

export function updateSettings(data: Record<string, unknown>) {
  return request<{ success: boolean }>("/api/settings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Logs
export function getLogs(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  return request<{
    logs: Array<Record<string, unknown>>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
    chartData: Array<{ date: string; success_count: number; fail_count: number }>;
  }>(`/api/logs${query ? `?${query}` : ""}`);
}

export function getLogStats() {
  return request<{
    totalDatabases: number;
    activeSchedules: number;
    lastRunSuccess: string | null;
    lastRunFail: string | null;
    totalBackupSize: number;
    totalFolders: number;
    disk: { freeBytes: number; totalBytes: number };
  }>("/api/logs/stats");
}

// Download
export function downloadBackup(folder: string, file: string) {
  window.open(`/api/download?folder=${encodeURIComponent(folder)}&file=${encodeURIComponent(file)}`, "_blank");
}

// Delete
export function deleteBackup(folder: string) {
  return request<{ success: boolean }>("/api/delete-backup", {
    method: "DELETE",
    body: JSON.stringify({ folder }),
  });
}

// Databases (Explorer)
export function getDatabases() {
  return request<{ databases: string[] }>("/api/databases");
}

export function getTables(dbName: string) {
  return request<{
    database: string;
    tables: Array<{ name: string; rowCount: number; sizeBytes: number; lastUpdated: string | null }>;
  }>(`/api/databases/${encodeURIComponent(dbName)}/tables`);
}

export function getTableStructure(dbName: string, tableName: string) {
  return request<{
    database: string;
    table: string;
    columns: Array<{ name: string; type: string; nullable: string; key: string; default: unknown; extra: string }>;
  }>(`/api/databases/${encodeURIComponent(dbName)}/tables/${encodeURIComponent(tableName)}/structure`);
}

export function getTableData(dbName: string, tableName: string) {
  return request<{
    database: string;
    table: string;
    columns: string[];
    rows: Array<Record<string, unknown>>;
  }>(`/api/databases/${encodeURIComponent(dbName)}/tables/${encodeURIComponent(tableName)}/data`);
}
