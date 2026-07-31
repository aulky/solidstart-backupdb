import { type JSX, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { X } from "lucide-solid";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: JSX.Element;
}

export default function Dialog(props: DialogProps) {
  return (
    <Show when={props.open}>
      <Portal>
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in-up">
          <div class="w-full max-w-lg bg-white/95 backdrop-blur-[16px] rounded-3xl p-8 shadow-glass border border-white/30 relative max-h-[90vh] overflow-y-auto scrollbar-thin">
            {/* Close button */}
            <button
              onClick={props.onClose}
              class="absolute top-6 right-6 p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div class="mb-6">
              <h2 class="text-xl font-bold font-poppins text-gray-900">{props.title}</h2>
              {props.subtitle && (
                <p class="text-sm text-gray-500 mt-1">{props.subtitle}</p>
              )}
            </div>

            {/* Content */}
            {props.children}
          </div>
        </div>
      </Portal>
    </Show>
  );
}
