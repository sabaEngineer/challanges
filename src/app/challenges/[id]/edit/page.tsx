import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { EditChallengeForm } from "./edit-form";
import { BackButton } from "@/components/back-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditChallengePage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const challenge = await db.challenge.findUnique({
    where: { id },
    include: {
      requirements: true,
    },
  });

  if (!challenge) {
    notFound();
  }

  // Only the owner can edit
  if (challenge.createdBy !== user.id) {
    redirect(`/challenges/${id}`);
  }

  // Transform data for the form
  const challengeData = {
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    imageUrl: challenge.imageUrl,
    startDate: challenge.startDate.toISOString().split("T")[0],
    endDate: challenge.endDate.toISOString().split("T")[0],
    requirements: challenge.requirements.map((req) => ({
      id: req.id,
      title: req.title || "",
      type: req.type,
      targetValue: req.targetValue?.toString() || "",
      unit: req.unit,
      group: req.requirementGroup,
    })),
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <BackButton fallbackHref={`/challenges/${id}`} label="Back to Challenge" />
        
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Edit Challenge
        </h1>
        <p className="text-slate-400 mb-8">
          Update your challenge details
        </p>

        <EditChallengeForm challenge={challengeData} />
      </div>
    </div>
  );
}

