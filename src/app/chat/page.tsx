import { redirect } from "next/navigation";
import { ChatDashboard } from "@/components/chat-dashboard";
import { getAuthSession } from "@/lib/auth";

export default async function ChatPage() {
  const session = await getAuthSession();

  if (!session?.user?.id || !session.user.email) {
    redirect("/");
  }

  return (
    <ChatDashboard
      userName={session.user.name ?? session.user.email.split("@")[0]}
      userEmail={session.user.email}
    />
  );
}
