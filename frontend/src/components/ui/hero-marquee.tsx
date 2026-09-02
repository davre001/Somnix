'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HeroMarqueeProps {
  images: { src: string; alt: string }[];
  className?: string;
}

export function HeroMarquee({ images, className }: HeroMarqueeProps) {
  // Duplicate to fill the marquee seamlessly
  const items = [...images, ...images];

  return (
    <div
      className={cn(
        'w-full overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_80%,transparent)]',
        className
      )}
    >
      <motion.div
        className="flex gap-4 will-change-transform"
        animate={{ x: ['0%', '-50%'] }}
        transition={{
          ease: 'linear',
          duration: 38,
          repeat: Infinity,
        }}
      >
        {items.map((img, i) => (
          <div
            key={i}
            className="relative flex-shrink-0 h-36 xs:h-44 sm:h-56 md:h-64 aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border border-white/5"
            style={{ rotate: `${i % 2 === 0 ? '-2deg' : '3deg'}` }}
          >
            <img
              src={img.src}
              alt={img.alt}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* subtle dark overlay so images don't overpower the dark UI */}
            <div className="absolute inset-0 bg-black/25" />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
