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
  scope_note TEXT NOT NULL DEFAULT ''
);
`;

export function openDatabase(path: string): Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}
