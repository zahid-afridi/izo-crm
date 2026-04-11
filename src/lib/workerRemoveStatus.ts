/** Stored values for `Worker.removeStatus` (legacy client value `removed` maps to `disabled`). */
export type WorkerRemoveStatus = 'active' | 'on_leave' | 'disabled';

export function normalizeWorkerRemoveStatus(
  status: string | null | undefined,
  fallback: WorkerRemoveStatus = 'active'
): WorkerRemoveStatus {
  if (status == null || status === '') return fallback;
  if (status === 'removed') return 'disabled';
  return status as WorkerRemoveStatus;
}
