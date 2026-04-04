import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";

export function Icon({
  icon,
  className,
  size = 20,
  strokeWidth = 1.7,
}: {
  icon: IconSvgElement;
  className?: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      color="currentColor"
      className={className}
    />
  );
}
