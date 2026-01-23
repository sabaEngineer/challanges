import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CreateChallengeForm } from "./create-form";

export default async function CreateChallengePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create a Challenge</h1>
          <p className="text-slate-400">
            Start a new challenge and invite others to join
          </p>
        </div>

        <CreateChallengeForm />
      </div>
    </div>
  );
}

