import { describe, expect, it } from "vitest";

import {
  applyDragReorder,
  applyMoveInOrder,
  buildOrderIndexUpdates,
} from "@/lib/level-question-order";

describe("applyMoveInOrder", () => {
  const ids = ["a", "b", "c"];

  it("moves an item up", () => {
    expect(applyMoveInOrder(ids, "b", "up")).toEqual(["b", "a", "c"]);
  });

  it("moves an item down", () => {
    expect(applyMoveInOrder(ids, "b", "down")).toEqual(["a", "c", "b"]);
  });

  it("returns null at boundaries", () => {
    expect(applyMoveInOrder(ids, "a", "up")).toBeNull();
    expect(applyMoveInOrder(ids, "c", "down")).toBeNull();
  });
});

describe("applyDragReorder", () => {
  it("moves an item to a new position", () => {
    expect(applyDragReorder(["a", "b", "c", "d"], 0, 2)).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
  });

  it("returns null for invalid indices", () => {
    expect(applyDragReorder(["a", "b"], 0, 0)).toBeNull();
    expect(applyDragReorder(["a", "b"], -1, 1)).toBeNull();
  });
});

describe("buildOrderIndexUpdates", () => {
  it("assigns contiguous order indexes", () => {
    expect(buildOrderIndexUpdates(["x", "y"])).toEqual([
      { id: "x", orderIndex: 0 },
      { id: "y", orderIndex: 1 },
    ]);
  });
});
