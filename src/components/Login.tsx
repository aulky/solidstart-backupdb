import { createSignal } from "solid-js";
import { login } from "~/lib/api";
import { Database, Lock, AlertCircle } from "lucide-solid";

export default function Login(props: { onSuccess: () => void }) {
  const [username, setUsername] = createSignal("admin");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username(), password());
      props.onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4">
      <div class="w-full max-w-md bg-white rounded-3xl p-8 shadow-glass animate-fade-in-up">
        {/* Header */}
        <div class="flex flex-col items-center text-center mb-8">
          <div class="w-14 h-14 rounded-2xl bg-[#E11D48] flex items-center justify-center mb-4 shadow-md">
            <Database size={28} class="text-white" />
          </div>
          <h1 class="text-2xl font-bold font-poppins text-gray-900">Sign in to BackupDB</h1>
          <p class="text-sm text-gray-500 mt-1">Enter your administrator credentials</p>
        </div>

        {/* Error Alert */}
        {error() && (
          <div class="flex items-center gap-2 p-4 mb-6 rounded-xl bg-red-50 text-red-600 text-sm">
            <AlertCircle size={18} class="shrink-0" />
            <span>{error()}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
            <input
              type="text"
              value={username()}
              onInput={(e) => setUsername(e.currentTarget.value)}
              required
              class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150"
              placeholder="admin"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div class="relative">
              <input
                type="password"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                required
                class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150 pr-10"
                placeholder="••••••••"
              />
              <Lock size={18} class="absolute right-3.5 top-3.5 text-gray-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading()}
            class="w-full py-3.5 px-4 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white font-medium shadow-sm hover:shadow transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading() ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
