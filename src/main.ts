import { DEFAULT_DB_PATH, DEFAULT_PORT } from './config.js';
import { openDatabase } from './db/database.js';
import { startServer } from './web/server.js';

const db = openDatabase(DEFAULT_DB_PATH);
startServer(db, DEFAULT_PORT);
console.log(`ProductFolio planning: http://127.0.0.1:${DEFAULT_PORT}/  (database: ${DEFAULT_DB_PATH})`);
