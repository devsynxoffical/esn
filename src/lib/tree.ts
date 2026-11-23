import { q, one, type Row } from "./db";

/** Nodes of the subtree under rootId, down to `levels` levels (inclusive of root). */
export async function subtree(rootId: number, levels = 4): Promise<Row[]> {
  return q(
    `WITH RECURSIVE t AS (
       SELECT id, 0 AS d FROM users WHERE id = $1
       UNION ALL
       SELECT u.id, t.d + 1 FROM users u JOIN t ON u.parent_id = t.id WHERE t.d < $2
     )
     SELECT u.id, u.code, u.name, u.status, u.parent_id, u.position, u.left_count, u.right_count, u.left_carry, u.right_carry,
            u.total_pairs, u.rank_level, u.sponsor_id
     FROM t JOIN users u ON u.id = t.id`,
    [rootId, levels - 1],
  );
}

/** True when `nodeId` is `ancestorId` or somewhere below it in the tree. */
export async function isInDownline(ancestorId: number, nodeId: number): Promise<boolean> {
  if (ancestorId === nodeId) return true;
  const r = await one(
    `WITH RECURSIVE up AS (
       SELECT parent_id AS id FROM users WHERE id = $2
       UNION ALL
       SELECT u.parent_id FROM users u JOIN up ON u.id = up.id WHERE u.parent_id IS NOT NULL
     ) SELECT 1 AS ok FROM up WHERE id = $1 LIMIT 1`,
    [ancestorId, nodeId],
  );
  return !!r;
}

/** Path of ancestors from `fromId` down to `toId` (for breadcrumbs). */
export async function pathBetween(fromId: number, toId: number): Promise<Row[]> {
  const rows = await q(
    `WITH RECURSIVE up AS (
       SELECT id, parent_id, code, name, 0 AS d FROM users WHERE id = $2
       UNION ALL
       SELECT u.id, u.parent_id, u.code, u.name, up.d + 1 FROM users u JOIN up ON u.id = up.parent_id WHERE up.id <> $1
     ) SELECT * FROM up ORDER BY d DESC`,
    [fromId, toId],
  );
  return rows;
}

/** Bottom of the extreme left or right leg under a node. */
export async function extremeNode(rootId: number, leg: "L" | "R"): Promise<Row | null> {
  return one(
    `WITH RECURSIVE chain AS (
       SELECT id, 0 AS d FROM users WHERE id = $1
       UNION ALL
       SELECT u.id, chain.d + 1 FROM users u JOIN chain ON u.parent_id = chain.id AND u.position = $2
     ) SELECT u.code FROM chain JOIN users u ON u.id = chain.id ORDER BY d DESC LIMIT 1`,
    [rootId, leg],
  );
}
