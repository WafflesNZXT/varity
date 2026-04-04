const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const tables = await client.query(
    "select table_name from information_schema.tables where table_schema='public' order by table_name"
  );
  console.log("tables", tables.rows);

  for (const tableName of ["profiles", "chats"]) {
    const columns = await client.query(
      "select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position",
      [tableName]
    );
    console.log("---", tableName, columns.rows);
  }

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
