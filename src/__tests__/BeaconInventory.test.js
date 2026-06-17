// Unit tests for BeaconInventory utility functions and logic.
// These test pure functions extracted from the component file.

import { describe, it, expect } from "vitest";

// ─── Re-implement pure utilities under test ───────────────────────────────────
const fmt$ = n => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = n => `${Number(n || 0).toFixed(1)}%`;
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const today = () => new Date().toISOString().slice(0, 10);
const toCSV = rows => rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");

const CAT_TO_WALK = {
  "Food - Protein": "w-walkin", "Food - Produce": "w-walkin", "Food - Dairy": "w-walkin",
  "Food - Dry": "w-dry", "Food - Misc": "w-dry", "Supplies": "w-dry", "Other": "w-dry",
  "Food - Frozen": "w-freeze",
  "Beverage - NA": "w-bar", "Liquor": "w-bar", "Beer": "w-bar", "Wine": "w-bar",
};

function autoAssign(itemList, walks) {
  const updated = walks.map(w => ({ ...w, itemIds: [...w.itemIds] }));
  itemList.forEach(item => {
    const wid = CAT_TO_WALK[item.category] || "w-dry";
    const w = updated.find(x => x.id === wid);
    if (w && !w.itemIds.includes(item.id)) w.itemIds.push(item.id);
  });
  return updated;
}

const DEFAULT_WALKS = [
  { id: "w-walkin", name: "Walk-In Cooler", emoji: "🥩", itemIds: [] },
  { id: "w-dry",    name: "Dry Storage",    emoji: "🥫", itemIds: [] },
  { id: "w-freeze", name: "Freezer",        emoji: "❄️",  itemIds: [] },
  { id: "w-bar",    name: "Bar",            emoji: "🍺", itemIds: [] },
];

// parseSmartCSV extracted for testing
function parseSmartCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  const isSmart = headers.includes("needsReview");
  const rows = lines.slice(1).map(line => {
    const vals = []; let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { vals.push(cur); cur = ""; }
      else cur += ch;
    }
    vals.push(cur);
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] || "").trim()]));
  }).filter(r => r.name);
  return { isSmart, rows };
}

// ─── fmt$ ─────────────────────────────────────────────────────────────────────
describe("fmt$", () => {
  it("formats zero", () => expect(fmt$(0)).toBe("$0.00"));
  it("formats integer", () => expect(fmt$(100)).toBe("$100.00"));
  it("formats decimal", () => expect(fmt$(12.5)).toBe("$12.50"));
  it("formats large number with comma", () => expect(fmt$(1234.56)).toBe("$1,234.56"));
  it("handles null/undefined as 0", () => {
    expect(fmt$(null)).toBe("$0.00");
    expect(fmt$(undefined)).toBe("$0.00");
  });
  it("handles negative (locale puts $ before minus)", () => expect(fmt$(-5)).toBe("$-5.00"));
});

// ─── fmtPct ───────────────────────────────────────────────────────────────────
describe("fmtPct", () => {
  it("formats zero", () => expect(fmtPct(0)).toBe("0.0%"));
  it("formats integer", () => expect(fmtPct(29)).toBe("29.0%"));
  it("formats decimal one place", () => expect(fmtPct(28.567)).toBe("28.6%"));
  it("handles null", () => expect(fmtPct(null)).toBe("0.0%"));
});

// ─── uid ──────────────────────────────────────────────────────────────────────
describe("uid", () => {
  it("returns a non-empty string", () => expect(typeof uid()).toBe("string"));
  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 100 }, uid));
    expect(ids.size).toBe(100);
  });
  it("contains a hyphen separator", () => expect(uid()).toMatch(/-/));
});

// ─── today ────────────────────────────────────────────────────────────────────
describe("today", () => {
  it("returns YYYY-MM-DD format", () => expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  it("matches current date", () => {
    const d = new Date().toISOString().slice(0, 10);
    expect(today()).toBe(d);
  });
});

// ─── toCSV ────────────────────────────────────────────────────────────────────
describe("toCSV", () => {
  it("wraps all values in quotes", () => {
    expect(toCSV([["a", "b"]])).toBe('"a","b"');
  });
  it("escapes internal quotes", () => {
    expect(toCSV([['say "hello"']])).toBe('"say ""hello"""');
  });
  it("joins rows with newline", () => {
    const csv = toCSV([["a"], ["b"]]);
    expect(csv).toBe('"a"\n"b"');
  });
  it("handles null/undefined as empty string", () => {
    expect(toCSV([[null, undefined, 0]])).toBe('"","","0"');
  });
  it("handles numbers", () => {
    expect(toCSV([[1, 2.5]])).toBe('"1","2.5"');
  });
});

// ─── autoAssign ───────────────────────────────────────────────────────────────
describe("autoAssign", () => {
  const freshWalks = () => DEFAULT_WALKS.map(w => ({ ...w, itemIds: [] }));

  it("assigns Food - Protein to walk-in", () => {
    const item = { id: "i1", category: "Food - Protein" };
    const result = autoAssign([item], freshWalks());
    expect(result.find(w => w.id === "w-walkin").itemIds).toContain("i1");
  });

  it("assigns Liquor to bar", () => {
    const item = { id: "i2", category: "Liquor" };
    const result = autoAssign([item], freshWalks());
    expect(result.find(w => w.id === "w-bar").itemIds).toContain("i2");
  });

  it("assigns Food - Frozen to freezer", () => {
    const item = { id: "i3", category: "Food - Frozen" };
    const result = autoAssign([item], freshWalks());
    expect(result.find(w => w.id === "w-freeze").itemIds).toContain("i3");
  });

  it("assigns unknown category to dry storage", () => {
    const item = { id: "i4", category: "Totally Unknown" };
    const result = autoAssign([item], freshWalks());
    expect(result.find(w => w.id === "w-dry").itemIds).toContain("i4");
  });

  it("does not duplicate items already in a walk", () => {
    const item = { id: "i5", category: "Food - Dry" };
    const walks = freshWalks().map(w => w.id === "w-dry" ? { ...w, itemIds: ["i5"] } : w);
    const result = autoAssign([item], walks);
    const dryIds = result.find(w => w.id === "w-dry").itemIds;
    expect(dryIds.filter(id => id === "i5").length).toBe(1);
  });

  it("handles multiple items in a single call", () => {
    const items = [
      { id: "a", category: "Beer" },
      { id: "b", category: "Wine" },
      { id: "c", category: "Food - Produce" },
    ];
    const result = autoAssign(items, freshWalks());
    const bar = result.find(w => w.id === "w-bar").itemIds;
    const walkin = result.find(w => w.id === "w-walkin").itemIds;
    expect(bar).toContain("a");
    expect(bar).toContain("b");
    expect(walkin).toContain("c");
  });

  it("does not mutate the original walks array", () => {
    const walks = freshWalks();
    const origLen = walks[0].itemIds.length;
    autoAssign([{ id: "x", category: "Food - Protein" }], walks);
    expect(walks[0].itemIds.length).toBe(origLen);
  });
});

// ─── parseSmartCSV ────────────────────────────────────────────────────────────
describe("parseSmartCSV", () => {
  it("detects smart format by needsReview header", () => {
    const csv = `name,unitCost,unit,needsReview\nChicken,4.5,lb,False`;
    const { isSmart } = parseSmartCSV(csv);
    expect(isSmart).toBe(true);
  });

  it("parses rows correctly", () => {
    const csv = `name,unitCost,unit,needsReview\nChicken,4.5,lb,False\nRibeye,18.0,lb,True`;
    const { rows } = parseSmartCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Chicken");
    expect(rows[0].unitCost).toBe("4.5");
    expect(rows[1].needsReview).toBe("True");
  });

  it("handles quoted CSV values with commas", () => {
    const csv = `name,unitCost\n"Chicken, fresh",4.5`;
    const { rows } = parseSmartCSV(csv);
    expect(rows[0].name).toBe("Chicken, fresh");
  });

  it("filters out rows with no name", () => {
    const csv = `name,unitCost\nChicken,4.5\n,3.0`;
    const { rows } = parseSmartCSV(csv);
    expect(rows).toHaveLength(1);
  });

  it("returns isSmart=false for non-smart CSV", () => {
    const csv = `name,unitCost\nChicken,4.5`;
    const { isSmart } = parseSmartCSV(csv);
    expect(isSmart).toBe(false);
  });
});

// ─── Food cost calculation ────────────────────────────────────────────────────
describe("Food cost percentage", () => {
  const calcFcPct = (purchases, sales) => sales > 0 ? (purchases / sales) * 100 : null;

  it("returns null when sales is 0", () => expect(calcFcPct(1000, 0)).toBeNull());
  it("returns 100% when purchases equal sales", () => expect(calcFcPct(1000, 1000)).toBe(100));
  it("returns 29% for typical scenario", () => expect(calcFcPct(290, 1000)).toBeCloseTo(29, 5));
  it("returns correct pct for fractional values", () => expect(calcFcPct(1450.75, 5000)).toBeCloseTo(29.015, 2));
});

// ─── Inventory value calculation ─────────────────────────────────────────────
describe("Inventory value", () => {
  const totalValue = items => items.reduce((s, i) => s + i.qty * i.unitCost, 0);

  it("returns 0 for empty list", () => expect(totalValue([])).toBe(0));
  it("sums single item", () => expect(totalValue([{ qty: 5, unitCost: 10 }])).toBe(50));
  it("sums multiple items", () => {
    const items = [{ qty: 2, unitCost: 5 }, { qty: 3, unitCost: 4 }];
    expect(totalValue(items)).toBe(22);
  });
  it("handles zero qty", () => expect(totalValue([{ qty: 0, unitCost: 10 }])).toBe(0));
  it("handles fractional qty (tenths for liquor)", () => {
    expect(totalValue([{ qty: 2.7, unitCost: 30 }])).toBeCloseTo(81, 5);
  });
});

// ─── Below-par detection ──────────────────────────────────────────────────────
describe("Below-par detection", () => {
  const isBelowPar = item => item.par > 0 && item.qty < item.par;

  it("detects item below par", () => expect(isBelowPar({ qty: 2, par: 5 })).toBe(true));
  it("item at par is not below par", () => expect(isBelowPar({ qty: 5, par: 5 })).toBe(false));
  it("item above par is not below par", () => expect(isBelowPar({ qty: 6, par: 5 })).toBe(false));
  it("item with par=0 is never below par", () => expect(isBelowPar({ qty: 0, par: 0 })).toBe(false));
});
