import { getCurrentUser } from "@/lib/auth";
import { FeedbackButton } from "./feedback-button";

export async function FeedbackWrapper() {
  const user = await getCurrentUser();
  
  // Only show feedback button to logged-in users
  if (!user) {
    return null;
  }

  return <FeedbackButton />;
}
