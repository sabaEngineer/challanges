import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getNotifications } from "@/actions/notifications";
import { NotificationsList } from "./notifications-list";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const notifications = await getNotifications();

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-12">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-white mb-8">Notifications</h1>
        <NotificationsList initialNotifications={notifications} />
      </div>
    </div>
  );
}

