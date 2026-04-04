import { Pool, type QueryResultRow } from "pg";

declare global {
  var __varityPool: Pool | undefined;
  var __varitySchemaReady: Promise<void> | undefined;
}

function getPool() {
  if (global.__varityPool) {
    return global.__varityPool;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL in environment variables.");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  if (process.env.NODE_ENV !== "production") {
    global.__varityPool = pool;
  }

  return pool;
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = []
) {
  const pool = getPool();
  return pool.query<T>(text, values);
}

export async function ensureSchema() {
  if (!global.__varitySchemaReady) {
    global.__varitySchemaReady = (async () => {
      await dbQuery(`
        create table if not exists profiles (
          id uuid primary key,
          email text,
          full_name text,
          password_hash text,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
      `);

      await dbQuery(`alter table profiles add column if not exists email text;`);
      await dbQuery(`alter table profiles add column if not exists full_name text;`);
      await dbQuery(`alter table profiles add column if not exists password_hash text;`);
      await dbQuery(`alter table profiles add column if not exists created_at timestamptz default now();`);
      await dbQuery(`alter table profiles add column if not exists updated_at timestamptz default now();`);
      await dbQuery(`update profiles set created_at = now() where created_at is null;`);
      await dbQuery(`update profiles set updated_at = now() where updated_at is null;`);
      await dbQuery(`create unique index if not exists profiles_email_unique_idx on profiles (lower(email));`);

      await dbQuery(`
        create table if not exists chats (
          id uuid primary key,
          profile_id uuid not null references profiles(id) on delete cascade,
          session_id uuid not null,
          role text not null check (role in ('user', 'assistant', 'system')),
          content text not null,
          user_id uuid,
          title text,
          messages jsonb default '[]'::jsonb,
          created_at timestamptz not null default now(),
          updated_at timestamptz default now()
        );
      `);

      await dbQuery(`alter table chats add column if not exists profile_id uuid;`);
      await dbQuery(`alter table chats add column if not exists session_id uuid;`);
      await dbQuery(`alter table chats add column if not exists role text;`);
      await dbQuery(`alter table chats add column if not exists content text;`);
      await dbQuery(`alter table chats add column if not exists user_id uuid;`);
      await dbQuery(`alter table chats add column if not exists title text;`);
      await dbQuery(`alter table chats add column if not exists messages jsonb default '[]'::jsonb;`);
      await dbQuery(`alter table chats add column if not exists created_at timestamptz default now();`);
      await dbQuery(`alter table chats add column if not exists updated_at timestamptz default now();`);
      await dbQuery(`update chats set user_id = profile_id where user_id is null and profile_id is not null;`);
      await dbQuery(`update chats set role = 'assistant' where role is null;`);
      await dbQuery(`update chats set content = '' where content is null;`);
      await dbQuery(`update chats set title = 'New Chat' where title is null;`);
      await dbQuery(`update chats set messages = '[]'::jsonb where messages is null;`);
      await dbQuery(`update chats set created_at = now() where created_at is null;`);
      await dbQuery(`update chats set updated_at = now() where updated_at is null;`);

      await dbQuery(`
        create index if not exists chats_user_id_updated_at_idx
        on chats(user_id, updated_at desc);
      `);

      await dbQuery(`
        create or replace function set_timestamp()
        returns trigger as $$
        begin
          new.updated_at = now();
          return new;
        end;
        $$ language plpgsql;
      `);

      await dbQuery(`
        drop trigger if exists trg_profiles_updated_at on profiles;
        create trigger trg_profiles_updated_at
        before update on profiles
        for each row execute procedure set_timestamp();
      `);

      await dbQuery(`
        drop trigger if exists trg_chats_updated_at on chats;
        create trigger trg_chats_updated_at
        before update on chats
        for each row execute procedure set_timestamp();
      `);
    })();
  }

  await global.__varitySchemaReady;
}
