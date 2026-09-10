import { cn } from '@/lib/utils';

/**
 * SOMNIX brand assets — split from the single source lockup into a standalone
 * bolt mark and wordmark so each can be sized independently.
 *   - /brand/somnix-mark.png     263×197 (green bolt "S")
 *   - /brand/somnix-wordmark.png 828×150 ("SOMNIX" wordmark)
 * Both are transparent PNGs, so they drop straight onto the dark UI.
 */

export function SomnixMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/somnix-mark.png"
      alt="Somnix"
      draggable={false}
      className={cn('h-8 w-auto select-none', className)}
    />
  );
}

export function SomnixWordmark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/somnix-wordmark.png"
      alt=""
      aria-hidden
      draggable={false}
      className={cn('h-5 w-auto select-none', className)}
    />
  );
}

/** Mark + wordmark lockup. The mark carries the accessible name; the wordmark is decorative. */
export function SomnixLogo({
  className,
  markClassName,
  wordmarkClassName,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <SomnixMark className={cn('h-6 w-auto', markClassName)} />
      <SomnixWordmark className={cn('h-[15px] w-auto', wordmarkClassName)} />
    </span>
  );
}
