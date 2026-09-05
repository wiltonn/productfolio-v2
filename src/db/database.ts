import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type Database = DatabaseSync;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS quarter (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS holiday (
  date TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS team (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS person (
  id INTEGER PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES team(id),
  name TEXT NOT NULL,
  joined_on TEXT,
  left_on TEXT
);

CREATE TABLE IF NOT EXISTS schedule (
  id INTEGER PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  fraction REAL NOT NULL,
  effective_from TEXT
);

CREATE TABLE IF NOT EXISTS absence (
  id INTEGER PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS overhead (
  person_id INTEGER NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  quarter_id INTEGER NOT NULL REFERENCES quarter(id),
  percent REAL NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (person_id, quarter_id)
);

CREATE TABLE IF NOT EXISTS work_package (
  id INTEGER PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES team(id),
  quarter_id INTEGER NOT NULL REFERENCES quarter(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  estimate_ew REAL NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  changed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assignment (
  work_package_id INTEGER NOT NULL REFERENCES work_package(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES team(id),
  engineer_weeks REAL NOT NULL,
  PRIMARY KEY (work_package_id, team_id)
);

CREATE TABLE IF NOT EXISTS reserve (
  team_id INTEGER NOT NULL REFERENCES team(id),
  quarter_id INTEGER NOT NULL REFERENCES quarter(id),
  engineer_weeks REAL NOT NULL,
  PRIMARY KEY (team_id, quarter_id)
);

CREATE TABLE IF NOT EXISTS feasibility (
  id INTEGER PRIMARY KEY,
  work_package_id INTEGER NOT NULL REFERENCES work_package(id) ON DELETE CASCADE,
  verdict TEXT NOT NULL,
  judged_by TEXT NOT NULL,
  judged_at TEXT NOT NULL,
  assumptions TEXT NOT NULL,
  scope_note TEXT NOT NULL DEFAULT '',
  ctx_estimate_ew REAL,
  ctx_assigned_ew REAL,
  ctx_net_delivery_ew REAL,
  ctx_reserve_ew REAL,
  ctx_shortfall_ew REAL,
  plan_change_id INTEGER
);

-- Append-only log of material changes to a team-quarter's planning inputs. A judgment
-- records the latest id at the time it is made; later rows mean it needs reassessment.
CREATE TABLE IF NOT EXISTS plan_change (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES team(id),
  quarter_id INTEGER NOT NULL REFERENCES quarter(id),
  work_package_id INTEGER,
  changed_at TEXT NOT NULL,
  description TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS plan_change_team_quarter ON plan_change (team_id, quarter_id, id);
`;

/** Columns added after the first schema; existing databases gain them on open. */
const ADDED_COLUMNS: Array<{ table: string; column: string; definition: string }> = [
  { table: 'feasibility', column: 'ctx_estimate_ew', definition: 'REAL' },
  { table: 'feasibility', column: 'ctx_assigned_ew', definition: 'REAL' },
  { table: 'feasibility', column: 'ctx_net_delivery_ew', definition: 'REAL' },
  { table: 'feasibility', column: 'ctx_reserve_ew', definition: 'REAL' },
  { table: 'feasibility', column: 'ctx_shortfall_ew', definition: 'REAL' },
  { table: 'feasibility', column: 'plan_change_id', definition: 'INTEGER' },
];

function migrate(db: DatabaseSync): void {
  for (const { table, column, definition } of ADDED_COLUMNS) {
    const existing = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as Array<{ name: string }>;
    if (!existing.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function openDatabase(path: string): Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  migrate(db);
  return db;
}
