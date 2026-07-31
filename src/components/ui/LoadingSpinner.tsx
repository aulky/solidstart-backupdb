export default function LoadingSpinner(props: { size?: number; class?: string }) {
  const s = props.size || 24;
  return (
    <svg
      class={`animate-spin ${props.class || "text-gray-400"}`}
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        class="opacity-25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        class="opacity-75"
      />
    </svg>
  );
}
