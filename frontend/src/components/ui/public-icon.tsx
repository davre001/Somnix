'use client';

import React from 'react';

/**
 * Renders an SVG from /public/icons/<name>.svg as a mask, so it inherits the
 * current text color (currentColor) and can be tinted with Tailwind text-* /
 * inline color exactly like a lucide glyph — but with zero JS icon library.
 *
 * The source SVGs are single-color line icons; the mask ignores their own
 * stroke color and paints the element's `color` through the shape instead.
 */
export type PublicIconName =
  | 'bolt'
  | 'eye'
  | 'eye-off'
  | 'lock'
  | 'shield'
  | 'target'
  | 'trophy'
  | 'users'
  | 'wallet'
  | 'arrow-right'
  | 'x'
  | 'external-link'
  | 'alert-circle'
  | 'sparkles'
  | 'check'
  | 'wallet-metamask'
  | 'wallet-rabby'
  | 'wallet-phantom';

interface PublicIconProps {
  name: PublicIconName;
  className?: string;
  /** pixel size; sets both width & height. Defaults to 20. */
  size?: number;
  title?: string;
  /**
   * Render the SVG in its own colors (as an <img>) instead of masking it to
   * currentColor. Use for multi-color brand marks (wallet logos).
   */
  colored?: boolean;
  'aria-hidden'?: boolean;
}

export function PublicIcon({
  name,
  className = '',
  size = 20,
  title,
  colored = false,
  ...rest
}: PublicIconProps) {
  const url = `/icons/${name}.svg`;

  if (colored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={title ?? ''}
        aria-hidden={title ? undefined : (rest['aria-hidden'] ?? true)}
        width={size}
        height={size}
        className={`inline-block shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : (rest['aria-hidden'] ?? true)}
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: 'currentColor',
        WebkitMaskImage: `url(${url})`,
        maskImage: `url(${url})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  );
}
