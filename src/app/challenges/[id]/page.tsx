import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getUserMembershipStatus } from "@/actions/members";
import { getTodayCheckin } from "@/actions/checkins";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { MembersList } from "@/components/members-list";
import { PastCheckinsSection } from "@/components/past-checkins";
import { JoinButton } from "./join-button";
import { CheckinButton } from "./checkin-button";
import { AddDefaultRequirementButton } from "./add-requirement-button";
import {
  challengeTypeLabels,
  challengeUnitLabels,
  ChallengeType,
  ChallengeUnit,
} from "@/lib/types";

// Force dynamic rendering to avoid caching issues
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChallengePage({ params }: PageProps) {
  const { id } = await params;
  const [user, challenge, members, memberStatus, todayCheckin] = await Promise.all([
    getCurrentUser(),
    db.challenge.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
        requirements: true,
        _count: {
          select: {
            members: {
              where: { status: "active" },
            },
          },
        },
      },
    }),
    db.challengeMember.findMany({
      where: {
        challengeId: id,
        status: { in: ["active", "pending"] },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { currentStreak: "desc" }, { bestStreak: "desc" }],
    }),
    getUserMembershipStatus(id),
    getTodayCheckin(id),
  ]);

  if (!challenge) {
    notFound();
  }

  // Calculate "today" with timezone offset (UTC+4 for Georgia)
  const TIMEZONE_OFFSET_HOURS = 4;
  const now = new Date();
  const adjustedNow = new Date(now.getTime() + TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);
  const todayLocal = new Date(Date.UTC(adjustedNow.getUTCFullYear(), adjustedNow.getUTCMonth(), adjustedNow.getUTCDate()));
  const start = new Date(challenge.startDate);
  const startDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const end = new Date(challenge.endDate);
  const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  
  const isActive = todayLocal >= startDay && todayLocal <= endDay;
  const isUpcoming = todayLocal < startDay;
  const isStarted = !isUpcoming; // Challenge has started (active or ended)
  const isEnded = todayLocal > endDay;
  const isOneTime = startDay.getTime() === endDay.getTime();
  const isOwner = user?.id === challenge.createdBy;
  const isMember = memberStatus === "active";
  
  // Get current user's membership for streak info
  const currentUserMembership = user 
    ? members.find((m) => m.userId === user.id && m.status === "active")
    : null;

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // Calculate days
  const totalDays = Math.ceil(
    (new Date(challenge.endDate).getTime() -
      new Date(challenge.startDate).getTime()) /
      (1000 * 60 * 60 * 24)
  ) + 1;

  const daysElapsed = isUpcoming
    ? 0
    : Math.min(
        Math.ceil(
          (now.getTime() - new Date(challenge.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1,
        totalDays
      );

  const formatRequirement = (req: { title?: string | null; type: string; targetValue: unknown; unit: string }) => {
    const type = req.type as ChallengeType;
    const unit = req.unit as ChallengeUnit;
    const value = type === "yes_no" 
      ? "Complete daily"
      : `${req.targetValue} ${challengeUnitLabels[unit]}`;
    return value;
  };

  // Transform members for the component
  const membersData = members.map((m) => ({
    id: m.id,
    status: m.status,
    currentStreak: m.currentStreak,
    bestStreak: m.bestStreak,
    totalValue: m.totalValue.toString(),
    user: m.user,
  }));

  // Transform requirements for checkin button
  const requirementsData = challenge.requirements.map((req) => ({
    id: req.id,
    title: req.title,
    type: req.type as ChallengeType,
    targetValue: req.targetValue?.toString() || null,
    unit: req.unit as ChallengeUnit,
  }));

  // Transform today's checkin for the button
  const todayCheckinData = todayCheckin
    ? {
        note: todayCheckin.note,
        imageUrl: todayCheckin.imageUrl,
        isDone: todayCheckin.isDone,
        items: todayCheckin.items.map((item) => ({
          requirementId: item.requirementId,
          value: item.value?.toString() || null,
          isDone: item.isDone,
        })),
      }
    : null;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <BackButton fallbackHref="/challenges" label="Back to Challenges" />

        {/* Sticky Action Bar - Shows Join button prominently for non-members */}
        {user && !isMember && !isEnded && memberStatus !== "pending" && (
          <div className="sticky top-14 md:top-16 z-40 mb-6 -mx-4 px-4">
            <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 backdrop-blur-lg border border-amber-500/30 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🚀</span>
                  <div>
                    <p className="font-semibold text-white">Ready to join this challenge?</p>
                    <p className="text-sm text-slate-400">
                      {challenge._count.members} member{challenge._count.members !== 1 ? "s" : ""} already joined
                    </p>
                  </div>
                </div>
                <JoinButton
                  challengeId={id}
                  memberStatus={memberStatus as "active" | "pending" | "left" | "removed" | null}
                  isOwner={isOwner}
                  isEnded={isEnded}
                  size="lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* Sticky Action Bar - Sign in prompt for non-authenticated users */}
        {!user && !isEnded && (
          <div className="sticky top-14 md:top-16 z-40 mb-6 -mx-4 px-4">
            <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 backdrop-blur-lg border border-amber-500/30 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🔥</span>
                  <div>
                    <p className="font-semibold text-white">Want to join this challenge?</p>
                    <p className="text-sm text-slate-400">Sign in with Google to participate</p>
                  </div>
                </div>
                <Link href="/login">
                  <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                    Sign in to Join
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Pending status banner */}
        {user && memberStatus === "pending" && (
          <div className="mb-6 -mx-4 px-4">
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏳</span>
                <div>
                  <p className="font-semibold text-blue-400">Invitation Pending</p>
                  <p className="text-sm text-slate-400">You've been invited to this challenge. Check your notifications to accept.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Challenge Image */}
            {challenge.imageUrl && (
              <div className="relative h-64 rounded-xl overflow-hidden">
                <img
                  src={challenge.imageUrl}
                  alt={challenge.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
              </div>
            )}

            {/* Challenge Header */}
            <Card>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                      isActive
                        ? "bg-emerald-500/20 text-emerald-400"
                        : isUpcoming
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-slate-500/20 text-slate-400"
                    }`}
                  >
                    {isActive ? "🟢 Active" : isUpcoming ? "🔵 Upcoming" : "⚫ Ended"}
                  </div>
                  {isOneTime && (
                    <div className="px-3 py-1.5 rounded-full text-sm font-medium bg-violet-500/20 text-violet-400">
                      📅 One-Time
                    </div>
                  )}
                </div>
                {isOwner && (
                  <Link href={`/challenges/${id}/edit`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                )}
              </div>

              <h1 className="text-3xl font-bold mb-4">{challenge.title}</h1>

              {/* Requirements */}
              {challenge.requirements.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-400 mb-3">
                    {isOneTime ? "Requirements" : "Daily Requirements"}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {challenge.requirements.map((req, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30"
                      >
                        <span className="text-amber-400">🎯</span>
                        <div className="flex flex-col">
                          <span className="text-amber-400 font-medium">
                            {formatRequirement(req)}
                          </span>
                          {req.title && (
                            <span className="text-xs text-amber-400/70">
                              {req.title}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-amber-400/60 px-1.5 py-0.5 rounded bg-amber-500/20">
                          {challengeTypeLabels[req.type as ChallengeType]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {challenge.description && (
                <p className="text-slate-400 mb-6">{challenge.description}</p>
              )}

              <div className={`grid ${isOneTime ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"} gap-4 p-4 bg-slate-800/50 rounded-lg mb-6`}>
                {isOneTime ? (
                  <>
                    <div>
                      <div className="text-sm text-slate-500">Date</div>
                      <div className="font-medium">{formatDate(challenge.startDate)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Type</div>
                      <div className="font-medium text-violet-400">One-Time Challenge</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-sm text-slate-500">Start Date</div>
                      <div className="font-medium">{formatDate(challenge.startDate)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">End Date</div>
                      <div className="font-medium">{formatDate(challenge.endDate)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Duration</div>
                      <div className="font-medium">{totalDays} days</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Progress</div>
                      <div className="font-medium">
                        Day {daysElapsed} of {totalDays}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  {challenge.creator.avatarUrl && (
                    <img
                      src={challenge.creator.avatarUrl}
                      alt={challenge.creator.username || "Creator"}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <span>
                    Created by{" "}
                    <span className="text-slate-300">
                      {challenge.creator.username ? `@${challenge.creator.username}` : challenge.creator.fullName || "Anonymous"}
                    </span>
                  </span>
                  <span>•</span>
                  <span className="text-slate-300">
                    {challenge._count.members} member{challenge._count.members !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Member status indicator (for existing members) */}
              {user && isMember && (
                <div className="mt-6 pt-6 border-t border-slate-800">
                  <JoinButton
                    challengeId={id}
                    memberStatus={memberStatus as "active" | "pending" | "left" | "removed" | null}
                    isOwner={isOwner}
                    isEnded={isEnded}
                  />
                </div>
              )}

              {/* Owner indicator */}
              {user && isOwner && !isMember && (
                <div className="mt-6 pt-6 border-t border-slate-800">
                  <JoinButton
                    challengeId={id}
                    memberStatus={memberStatus as "active" | "pending" | "left" | "removed" | null}
                    isOwner={isOwner}
                    isEnded={isEnded}
                  />
                </div>
              )}
            </Card>

            {/* Requirements Detail Card */}
            {challenge.requirements.length > 0 && (
              <Card>
                <h3 className="text-lg font-semibold mb-4">Requirements Details</h3>
                <div className="space-y-3">
                  {challenge.requirements.map((req, i) => (
                    <div
                      key={i}
                      className="p-4 bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-violet-400 font-medium px-2 py-1 rounded bg-violet-500/20">
                          {challengeTypeLabels[req.type as ChallengeType]}
                        </span>
                        <span className="font-bold text-amber-400 text-lg">
                          {formatRequirement(req)}
                        </span>
                      </div>
                      {req.title && (
                        <p className="text-slate-300">
                          {req.title}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Check-in Button - only for active members of active challenges */}
            {isActive && isMember && challenge.requirements.length > 0 && (
              <CheckinButton
                challengeId={id}
                challengeTitle={challenge.title}
                requirements={requirementsData}
                todayCheckin={todayCheckinData}
                isActive={isActive}
                isMember={isMember}
                currentStreak={currentUserMembership?.currentStreak || 0}
              />
            )}

            {/* Past Check-ins - for active members who have past days to update */}
            {isMember && isStarted && challenge.requirements.length > 0 && (
              <PastCheckinsSection
                challengeId={id}
                challengeTitle={challenge.title}
                startDate={challenge.startDate}
                endDate={challenge.endDate}
                requirements={requirementsData}
              />
            )}

            {/* Fix missing requirements - only for owner */}
            {isOwner && challenge.requirements.length === 0 && !isEnded && (
              <AddDefaultRequirementButton challengeId={id} />
            )}

            {/* Members / Leaderboard */}
            <MembersList
              members={membersData}
              isStarted={isStarted}
              isOwner={isOwner}
              challengeId={id}
              challengeTitle={challenge.title}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
