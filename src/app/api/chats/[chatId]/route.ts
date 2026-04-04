import { getAuthSession } from "@/lib/auth";
import { dbQuery, ensureSchema } from "@/lib/db";

type StoredMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type ChatRow = {
  id: string;
  title: string;
  messages: StoredMessage[];
  created_at: string;
  updated_at: string;
};

type Params = {
  params: {
    chatId: string;
  };
};

export async function GET(_: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  const result = await dbQuery<ChatRow>(
    `
      select id, title, messages, created_at, updated_at
      from chats
      where id = $1 and user_id = $2
      limit 1
    `,
    [params.chatId, session.user.id]
  );

  const chat = result.rows[0];
  if (!chat) {
    return Response.json({ error: "Chat not found." }, { status: 404 });
  }

  return Response.json({
    chat: {
      id: chat.id,
      title: chat.title,
      messages: chat.messages ?? [],
      createdAt: chat.created_at,
      updatedAt: chat.updated_at
    }
  });
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  const deleted = await dbQuery<{ id: string }>(
    `
      delete from chats
      where id = $1 and user_id = $2
      returning id
    `,
    [params.chatId, session.user.id]
  );

  if (!deleted.rows[0]) {
    return Response.json({ error: "Chat not found." }, { status: 404 });
  }

  return Response.json({ success: true });
}
