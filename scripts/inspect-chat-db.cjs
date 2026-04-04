const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadEnv(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    process.env[key] = value;
  }
}

async function main() {
  loadEnv(path.join(process.cwd(), ".env.local"));

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const columns = await client.query(
    `select table_name, column_name, data_type, is_nullable, column_default
     from information_schema.columns
     where table_schema='public' and table_name in ('profiles','chats')
     order by table_name, ordinal_position`
  );

  const constraints = await client.query(
    `select tc.table_name, tc.constraint_name, tc.constraint_type,
            kcu.column_name, ccu.table_name as foreign_table_name, ccu.column_name as foreign_column_name
     from information_schema.table_constraints tc
     left join information_schema.key_column_usage kcu
       on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
     left join information_schema.constraint_column_usage ccu
       on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
     where tc.table_schema='public' and tc.table_name in ('profiles','chats')
     order by tc.table_name, tc.constraint_name`
  );

  console.log("COLUMNS\n", columns.rows);
  console.log("\nCONSTRAINTS\n", constraints.rows);

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
