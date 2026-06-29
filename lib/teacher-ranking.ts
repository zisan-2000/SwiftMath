export type TeacherRankingScope = "institute" | "mine" | "group";

/** Parse the combined view filter (institute / mine / group:id). */
export function parseTeacherRankingView(
  viewParam: string | undefined,
  ownedGroupIds: Set<string>,
): { scope: TeacherRankingScope; groupId?: string } {
  if (viewParam === "mine") {
    return { scope: "mine" };
  }

  if (viewParam?.startsWith("group:")) {
    const groupId = viewParam.slice("group:".length);
    if (ownedGroupIds.has(groupId)) {
      return { scope: "group", groupId };
    }
  }

  return { scope: "institute" };
}

/** Build the `view` select value from parsed scope. */
export function buildTeacherRankingViewValue(
  scope: TeacherRankingScope,
  groupId?: string,
): string {
  if (scope === "mine") return "mine";
  if (scope === "group" && groupId) return `group:${groupId}`;
  return "institute";
}

function buildTeacherRankingSubtitle(
  total: number,
  filters: {
    scope: TeacherRankingScope;
    groupName: string | null;
    period: "all" | "week" | "month";
    levelName: string | null;
  },
): string {
  const parts: string[] = [`${total} qualifying students`];

  if (filters.scope === "mine") {
    parts.push("in your groups");
  } else if (filters.scope === "group" && filters.groupName) {
    parts.push(`in ${filters.groupName}`);
  } else {
    parts.push("in your institute");
  }

  if (filters.period === "week") parts.push("(last 7 days)");
  else if (filters.period === "month") parts.push("(last 30 days)");

  if (filters.levelName) {
    parts.push(`· stats for ${filters.levelName}`);
  }

  return parts.join(" ") + ".";
}

export { buildTeacherRankingSubtitle };
