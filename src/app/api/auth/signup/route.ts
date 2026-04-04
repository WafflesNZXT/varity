import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { dbQuery, ensureSchema } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      fullName?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const fullName = body.fullName?.trim() || null;

    if (!email || !password) {
      return Response.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    await ensureSchema();

    const existing = await dbQuery<{ id: string }>(
      `select id from profiles where lower(email) = lower($1) limit 1`,
      [email]
    );

    if (existing.rows[0]) {
      return Response.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await hash(password, 10);
    const userId = randomUUID();

    const created = await dbQuery<{ id: string; email: string; full_name: string | null }>(
      `
        insert into profiles (id, email, full_name, password_hash)
        values ($1, $2, $3, $4)
        returning id, email, full_name
      `,
      [userId, email, fullName, passwordHash]
    );

    if (!created.rows[0]) {
      return Response.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("signup_error", error);
    }
    return Response.json({ error: "Failed to create account." }, { status: 500 });
  }
}
