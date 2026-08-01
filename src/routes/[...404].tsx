import { Title } from "@solidjs/meta";
import { HttpStatusCode } from "@solidjs/start";
import { A } from "@solidjs/router";
import { Database, Home } from "lucide-solid";

export default function NotFound() {
  return (
    <main class="min-h-[70vh] flex items-center justify-center p-4">
      <Title>Page Not Found | BackupDB</Title>
      <HttpStatusCode code={404} />

      <div class="text-center space-y-5 animate-fade-in-up max-w-md">
        <div class="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-[#E11D48] mx-auto">
          <Database size={32} />
        </div>
        <h1 class="text-4xl font-bold font-poppins text-gray-900">404</h1>
        <p class="text-lg font-medium text-gray-700">Page Not Found</p>
        <p class="text-sm text-gray-500">
          The page you are looking for does not exist or has been moved.
        </p>

        <A
          href="/"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-sm font-medium transition-colors duration-150 no-underline shadow-sm"
        >
          <Home size={16} />
          Back to Dashboard
        </A>
      </div>
    </main>
  );
}
