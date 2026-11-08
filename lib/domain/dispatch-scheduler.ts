export type DispatchTask = { tripId: string; stage: number };

/**
 * Select due work fairly across new and already-searching trips.
 * Preserve each queue's oldest-first order while alternating queues so a
 * sustained backlog in one status cannot starve the other status.
 */
export function selectDispatchBatch(
  pending: readonly DispatchTask[],
  searching: readonly DispatchTask[],
  limit = 20,
): DispatchTask[] {
  if (!Number.isInteger(limit) || limit < 1) return [];

  const selected: DispatchTask[] = [];
  let pendingIndex = 0;
  let searchingIndex = 0;

  while (selected.length < limit &&
    (pendingIndex < pending.length || searchingIndex < searching.length)) {
    if (pendingIndex < pending.length && selected.length < limit) {
      selected.push(pending[pendingIndex]);
      pendingIndex += 1;
    }
    if (searchingIndex < searching.length && selected.length < limit) {
      selected.push(searching[searchingIndex]);
      searchingIndex += 1;
    }
  }

  return selected;
}
