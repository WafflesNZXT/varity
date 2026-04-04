import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { getAuthSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getAuthSession();
  if (session?.user?.id) {
    redirect("/chat");
  }

  return (
    <main className="auth-wrap">
      <AuthCard />
    </main>
  );
}
