'use client';

import type { ReactNode } from 'react';

/** Horizontal scroll wrapper for wide tables on small screens. */
export default function TableScroll({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto rounded-xl ${className}`}>
      <div className="min-w-full inline-block align-middle">{children}</div>
    </div>
  );
}
