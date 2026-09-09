import { cn } from '@/lib/utils';

/**
 * SOMNIX brand lockup — the green bolt-S mark + wordmark asset
 * (public/brand/somnix-logo.png, trimmed to its glow at 1161×303).
 * Replaces the old "[SX box] + SOMNIX text" inline lockups.
 */
export function SomnixLogo({
  className,
  alt = 'SOMNIX',
}: {
  className?: string;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand asset, same pattern as ui/public-icon
    <img
      src="/brand/somnix-logo.png"
      alt={alt}
      width={1161}
      height={303}
      draggable={false}
      className={cn('h-8 w-auto select-none', className)}
    />
  );
}
