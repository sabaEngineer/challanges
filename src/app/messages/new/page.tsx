import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateConversation } from "@/actions/messages";

interface PageProps {
  searchParams: Promise<{ userId?: string }>;
}

export default async function NewMessagePage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { userId } = await searchParams;
  if (!userId) redirect("/messages");

  const result = await getOrCreateConversation(userId);

  if (result.success && "conversationId" in result) {
    redirect(`/messages/${result.conversationId}`);
  }

  redirect("/messages");
}
