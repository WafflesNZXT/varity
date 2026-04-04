import { getAuthSession } from "@/lib/auth";
import { dbQuery, ensureSchema } from "@/lib/db";
import { randomUUID } from "crypto";

type ChatRow = {
  id: string;
  title: string;
  updated_at: string;
  created_at: string;
};

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  const result = await dbQuery<ChatRow>(
    `
      select id, title, updated_at, created_at
      from chats
      where user_id = $1
      order by updated_at desc
    `,
    [session.user.id]
  );

  const chats = result.rows.map((chat) => ({
    id: chat.id,
    title: chat.title,
    updatedAt: chat.updated_at,
    createdAt: chat.created_at
  }));

  return Response.json({ chats });
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { title?: string };
  const title = body.title?.trim() || "New Chat";
  const chatId = randomUUID();
  const sessionId = randomUUID();

  await ensureSchema();

  const created = await dbQuery<ChatRow>(
    `
      insert into chats (id, profile_id, session_id, role, content, user_id, title, messages)
      values ($1, $2, $3, 'assistant', '', $2, $4, '[]'::jsonb)
      returning id, title, updated_at, created_at
    `,
    [chatId, session.user.id, sessionId, title]
  );

  const chat = created.rows[0];

  return Response.json(
    {
      chat: {
        id: chat.id,
        title: chat.title,
        updatedAt: chat.updated_at,
        createdAt: chat.created_at
      }
    },
    { status: 201 }
  );
}
