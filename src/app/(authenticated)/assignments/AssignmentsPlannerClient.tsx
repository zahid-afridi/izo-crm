'use client';

import dynamic from 'next/dynamic';

/**
 * Client-only wrapper: `ssr: false` is not allowed on `next/dynamic` in Server Components (Next 15).
 * Heavy planner loads in a separate chunk after first paint.
 */
const AssignmentsPlanner = dynamic(
  () => import(/* webpackChunkName: "assignments-planner" */ './AssignmentsPlanner'),
  {
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center bg-gray-50">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      </div>
    ),
    ssr: false,
  }
);

export function AssignmentsPlannerClient() {
  return <AssignmentsPlanner />;
}
