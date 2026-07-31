import { A } from "@solidjs/router";
import { Database, LayoutDashboard, Settings, FolderArchive, Search } from "lucide-solid";

export default function Nav() {
  return (
    <nav class="bg-gray-900 sticky top-0 z-50 shadow-lg">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          {/* Brand */}
          <A href="/" class="flex items-center gap-3 text-white no-underline">
            <div class="w-9 h-9 rounded-xl bg-[#E11D48] flex items-center justify-center">
              <Database size={20} class="text-white" />
            </div>
            <span class="text-lg font-semibold font-poppins tracking-tight">BackupDB</span>
          </A>

          {/* Navigation Links */}
          <div class="flex items-center gap-1">
            <A
              href="/"
              class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-150 no-underline"
              activeClass="bg-gray-800 text-white"
              end
            >
              <LayoutDashboard size={16} />
              <span class="hidden sm:inline">Dashboard</span>
            </A>
            <A
              href="/backups"
              class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-150 no-underline"
              activeClass="bg-gray-800 text-white"
            >
              <FolderArchive size={16} />
              <span class="hidden sm:inline">Backups</span>
            </A>
            <A
              href="/explorer"
              class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-150 no-underline"
              activeClass="bg-gray-800 text-white"
            >
              <Search size={16} />
              <span class="hidden sm:inline">Explorer</span>
            </A>
            <A
              href="/settings"
              class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-150 no-underline"
              activeClass="bg-gray-800 text-white"
            >
              <Settings size={16} />
              <span class="hidden sm:inline">Settings</span>
            </A>
          </div>
        </div>
      </div>
    </nav>
  );
}
