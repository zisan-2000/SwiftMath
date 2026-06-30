// Pure helpers for admin bank question ordering (orderIndex).

/** Swap one item up or down in a stable id list. */
export function applyMoveInOrder(
  orderedIds: readonly string[],
  questionId: string,
  direction: "up" | "down",
): string[] | null {
  const index = orderedIds.indexOf(questionId);
  if (index === -1) return null;

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= orderedIds.length) return null;

  const next = [...orderedIds];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

/** Move an item from one index to another (drag-and-drop). */
export function applyDragReorder(
  orderedIds: readonly string[],
  fromIndex: number,
  toIndex: number,
): string[] | null {
  if (fromIndex === toIndex) return null;
  if (
    fromIndex < 0 ||
    fromIndex >= orderedIds.length ||
    toIndex < 0 ||
    toIndex >= orderedIds.length
  ) {
    return null;
  }

  const next = [...orderedIds];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/** Map ordered ids to contiguous orderIndex values (0-based). */
export function buildOrderIndexUpdates(
  orderedIds: readonly string[],
): Array<{ id: string; orderIndex: number }> {
  return orderedIds.map((id, orderIndex) => ({ id, orderIndex }));
}
