import type { Platform } from "@/types/product";

interface PlatformBadgeProps {
  platform: Platform;
  size?: "sm" | "md";
}

export default function PlatformBadge({
  platform,
  size = "md",
}: PlatformBadgeProps) {
  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  if (platform === "Shopee") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeClasses} bg-shopee-light text-shopee`}
      >
        <svg
          className={size === "sm" ? "w-3 h-3" : "w-4 h-4"}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
        </svg>
        Shopee
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeClasses} bg-lazada-light text-lazada`}
    >
      <svg
        className={size === "sm" ? "w-3 h-3" : "w-4 h-4"}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
      </svg>
      Lazada
    </span>
  );
}
