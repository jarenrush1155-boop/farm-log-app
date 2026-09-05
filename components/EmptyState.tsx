'use client';

import type { ReactNode } from 'react';

/** Shared empty-state panel for lists, tables, and summary views. */
export default function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
      <p className="font-medium text-gray-700">{title}</p>
      {description && <p className="mt-1.5 text-sm text-gray-500">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
