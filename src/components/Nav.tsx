import { A } from "@solidjs/router";
import { createSignal } from "solid-js";
import { Database, LayoutDashboard, Settings, FolderArchive, Search, LogOut } from "lucide-solid";
import Dialog from "~/components/ui/Dialog";

interface NavProps {
  onLogout?: () => void;
}

export default function Nav(props: NavProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = createSignal(false);

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    if (props.onLogout) {
      props.onLogout();
    }
  };

  return (
    <>
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

            {/* Navigation Links & Logout */}
            <div class="flex items-center gap-1 sm:gap-2">
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

              {/* Logout Button in Top Right Navbar */}
              <button
                onClick={() => setShowLogoutConfirm(true)}
                class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-950/50 hover:text-red-300 transition-colors duration-150 cursor-pointer ml-1 sm:ml-2"
                title="Sign Out"
              >
                <LogOut size={16} />
                <span class="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={showLogoutConfirm()}
        onClose={() => setShowLogoutConfirm(false)}
        title="Confirm Logout"
        subtitle="Are you sure you want to log out of BackupDB?"
      >
        <div class="space-y-6">
          <p class="text-sm text-gray-600">
            You will need to sign in again to access the dashboard and configuration.
          </p>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              class="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors duration-150 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmLogout}
              class="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors duration-150 cursor-pointer flex items-center gap-2"
            >
              <LogOut size={16} />
              Logout Now
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
