import { getAuthSession } from "@/lib/auth";
import { dbQuery, ensureSchema } from "@/lib/db";
import { randomUUID } from "crypto";

type StoredMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type ChatRow = {
  id: string;
  title: string;
  messages: StoredMessage[];
  updated_at: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

const SYSTEM_PROMPT = `
You are Varity, a helpful AI assistant for a coding bootcamp student.
- Maintain short, clear answers unless the user asks for detail.
- Use practical examples when useful.
- If code is requested, provide complete runnable snippets.
- Be honest when uncertain.
Expected answer style: direct and student-friendly.
`.trim();

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "how",
  "i",
  "in",
  "into",
  "is",
  "it",
  "my",
  "of",
  "on",
  "or",
  "so",
  "that",
  "the",
  "to",
  "we",
  "me",
  "what",
  "with",
  "you",
  "your",
  "help",
  "create",
  "build",
  "make",
  "need",
  "want",
  "generate",
  "write",
  "show",
  "code",
  "hi",
  "hello",
  "hey"
]);

const INTENT_PREFIXES = [
  /^(hi|hello|hey|yo|hiya)\b[\s,.!?-]*/i,
  /^help me\s+/i,
  /^can you\s+/i,
  /^please\s+/i,
  /^i want to\s+/i,
  /^i need to\s+/i,
  /^how do i\s+/i,
  /^how to\s+/i,
  /^let'?s\s+/i
];

const ACRONYMS = new Set(["ai", "api", "ui", "ux", "sql", "saas"]);

function toDisplayWord(word: string) {
  if (ACRONYMS.has(word)) return word.toUpperCase();
  return `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`;
}

function summarizeTitleFromPrompt(prompt: string) {
  let normalizedPrompt = prompt.trim();

  let didStripPrefix = true;
  while (didStripPrefix && normalizedPrompt.length > 0) {
    didStripPrefix = false;

    for (const prefix of INTENT_PREFIXES) {
      const nextPrompt = normalizedPrompt.replace(prefix, "").trim();
      if (nextPrompt !== normalizedPrompt) {
        normalizedPrompt = nextPrompt;
        didStripPrefix = true;
      }
    }
  }

  const words = normalizedPrompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const keywords = words.filter((word) => !STOP_WORDS.has(word));
  const picked = (keywords.length >= 2 ? keywords : words).slice(0, 4);

  if (picked.length === 0) {
    return "New Chat";
  }

  return picked.map(toDisplayWord).join(" ");
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { chatId?: string; prompt?: string };
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return Response.json({ error: "Prompt is required." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Missing GEMINI_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

    await ensureSchema();

    let chat: ChatRow | undefined;

    if (body.chatId) {
      const chatResult = await dbQuery<ChatRow>(
        `
          select id, title, messages, updated_at
          from chats
          where id = $1 and user_id = $2
          limit 1
        `,
        [body.chatId, session.user.id]
      );
      chat = chatResult.rows[0];
    }

    if (!chat) {
      const title = summarizeTitleFromPrompt(prompt);
      const chatId = randomUUID();
      const sessionId = randomUUID();
      const created = await dbQuery<ChatRow>(
        `
          insert into chats (id, profile_id, session_id, role, content, user_id, title, messages)
          values ($1, $2, $3, 'assistant', '', $2, $4, '[]'::jsonb)
          returning id, title, messages, updated_at
        `,
        [chatId, session.user.id, sessionId, title]
      );
      chat = created.rows[0];
    }

    const existingMessages = Array.isArray(chat.messages) ? chat.messages : [];

    const nextMessages: StoredMessage[] = [
      ...existingMessages,
      {
        role: "user",
        content: prompt,
        createdAt: new Date().toISOString()
      }
    ];

    const geminiContents = nextMessages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }]
    }));

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: geminiContents,
        generationConfig: {
          temperature: 0.7
        }
      })
    }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return Response.json(
        { error: `Gemini request failed: ${errorText}` },
        { status: geminiResponse.status }
      );
    }

    const data = (await geminiResponse.json()) as GeminiResponse;
    const reply = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();

    const assistantReply = reply || "No response generated.";

    nextMessages.push({
      role: "assistant",
      content: assistantReply,
      createdAt: new Date().toISOString()
    });

    const updated = await dbQuery<ChatRow>(
      `
        update chats
        set messages = $1::jsonb,
            updated_at = now()
        where id = $2 and user_id = $3
        returning id, title, updated_at
      `,
      [JSON.stringify(nextMessages), chat.id, session.user.id]
    );

    const updatedChat = updated.rows[0];

    return Response.json({
      reply: assistantReply,
      messages: nextMessages,
      chat: {
        id: updatedChat.id,
        title: updatedChat.title,
        updatedAt: updatedChat.updated_at
      }
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("chat_route_error", error);
    }
    return Response.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
