import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense, createSignal, onMount, Show } from "solid-js";
import { checkSession, logout } from "~/lib/api";
import Nav from "~/components/Nav";
import Login from "~/components/Login";
import "./app.css";

export default function App() {
  const [authenticated, setAuthenticated] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const [defaultPassword, setDefaultPassword] = createSignal(false);

  const verifySession = async () => {
    try {
      const session = await checkSession();
      setAuthenticated(session.authenticated);
      setDefaultPassword(session.isDefaultPassword ?? false);
    } catch {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    verifySession();
  });

  const handleLogout = async () => {
    await logout();
    setAuthenticated(false);
    setDefaultPassword(false);
  };

  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Title>BackupDB — MySQL Backup Automation</Title>
          <Show when={!loading()} fallback={
            <div class="min-h-screen flex items-center justify-center">
              <div class="animate-pulse text-gray-400 text-lg">Loading...</div>
            </div>
          }>
            <Show
              when={authenticated()}
              fallback={<Login onSuccess={verifySession} />}
            >
              {/* Default Password Warning Banner — FEATURES.md §2 */}
              <Show when={defaultPassword()}>
                <div class="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center text-sm text-amber-700">
                  ⚠️ You are using the default password. Please change it in{" "}
                  <a href="/settings" class="font-medium underline hover:text-amber-900">Settings</a>
                  {" "}for security.
                </div>
              </Show>

              <Nav />

              {/* Logout button floating */}
              <button
                onClick={handleLogout}
                class="fixed bottom-6 right-6 z-40 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm hover:bg-gray-800 shadow-lg transition-all duration-150 cursor-pointer"
              >
                Logout
              </button>

              <main class="px-4 sm:px-6 lg:px-8 py-8">
                <Suspense>{props.children}</Suspense>
              </main>
            </Show>
          </Show>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
