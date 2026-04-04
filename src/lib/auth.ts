import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { dbQuery, ensureSchema } from "@/lib/db";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  password_hash: string;
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        await ensureSchema();

        const result = await dbQuery<ProfileRow>(
          `select id, email, full_name, password_hash from profiles where email = $1 limit 1`,
          [email]
        );

        const user = result.rows[0];
        if (!user) {
          return null;
        }

        const passwordMatches = await compare(password, user.password_hash);
        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.full_name ?? user.email.split("@")[0]
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
      }
      return session;
    }
  },
  pages: {
    signIn: "/"
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
};

export function getAuthSession() {
  return getServerSession(authOptions);
}
