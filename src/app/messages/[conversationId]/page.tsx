import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getConversationInfo } from "@/actions/messages";
import { ChatView } from "./chat-view";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: PageProps) {
  const { conversationId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const info = await getConversationInfo(conversationId);
  if (!info) notFound();

  return (
    <div className="-mt-16">
      <ChatView
        conversationId={info.id}
        currentUserId={user.id}
        otherUser={info.otherUser!}
      />
    </div>
  );
}
