import Link from "next/link";
import { getChallenges } from "@/actions/challenges";
import { getCurrentUser } from "@/lib/auth";
import { ChallengeListItem } from "@/components/challenge-list-item";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterTabs } from "./filter-tabs";

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function ChallengesPage({ searchParams }: PageProps) {
  const { filter } = await searchParams;
  const [challenges, user] = await Promise.all([
    getChallenges(),
    getCurrentUser(),
  ]);

  // Use UTC for consistent date handling in production
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  
  const activeChallenges = challenges.filter((c) => {
    const start = new Date(c.startDate);
    const startUTC = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const end = new Date(c.endDate);
    const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    return todayUTC >= startUTC && todayUTC <= endUTC;
  });
  const upcomingChallenges = challenges.filter((c) => {
    const start = new Date(c.startDate);
    const startUTC = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    return todayUTC < startUTC;
  });
  const endedChallenges = challenges.filter((c) => {
    const end = new Date(c.endDate);
    const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    return todayUTC > endUTC;
  });

  // Filter challenges based on selected filter
  const getFilteredChallenges = () => {
    switch (filter) {
      case "active":
        return activeChallenges;
      case "upcoming":
        return upcomingChallenges;
      case "ended":
        return endedChallenges;
      default:
        // Show active first, then upcoming, then ended
        return [...activeChallenges, ...upcomingChallenges, ...endedChallenges];
    }
  };

  const filteredChallenges = getFilteredChallenges();

  const getFilterTitle = () => {
    switch (filter) {
      case "active":
        return "Active Challenges";
      case "upcoming":
        return "Upcoming Challenges";
      case "ended":
        return "Past Challenges";
      default:
        return "All Challenges";
    }
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Explore Challenges
            </h1>
            <p className="text-slate-400">
              Discover and join challenges from the community
            </p>
          </div>
          {user && (
            <Link href="/challenges/new">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                <span className="mr-2">✨</span>
                Create Challenge
              </Button>
            </Link>
          )}
        </div>

        {/* Filter Tabs */}
        <FilterTabs
          activeFilter={filter || "all"}
          counts={{
            all: challenges.length,
            active: activeChallenges.length,
            upcoming: upcomingChallenges.length,
            ended: endedChallenges.length,
          }}
        />

        {/* Challenges List */}
        {challenges.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-white mb-2">No challenges yet</h3>
            <p className="text-slate-400 mb-6">
              Be the first to create a challenge and start building habits!
            </p>
            {user ? (
              <Link href="/challenges/new">
                <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                  Create Challenge
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button>Sign In to Create</Button>
              </Link>
            )}
          </Card>
        ) : filteredChallenges.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-6xl mb-4">
              {filter === "active" ? "🟢" : filter === "upcoming" ? "🔵" : "⚫"}
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No {filter} challenges
            </h3>
            <p className="text-slate-400 mb-6">
              {filter === "active"
                ? "There are no active challenges right now."
                : filter === "upcoming"
                ? "No upcoming challenges scheduled."
                : "No past challenges to show."}
            </p>
            <Link href="/challenges">
              <Button variant="outline">View All Challenges</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Section Title */}
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  filter === "active"
                    ? "bg-emerald-500 animate-pulse"
                    : filter === "upcoming"
                    ? "bg-blue-500"
                    : filter === "ended"
                    ? "bg-slate-500"
                    : "bg-amber-500"
                }`}
              />
              <h2 className="text-xl font-semibold text-white">{getFilterTitle()}</h2>
              <span className="text-slate-500">({filteredChallenges.length})</span>
            </div>

            {/* Challenge List */}
            <div className={`space-y-4 ${filter === "ended" ? "opacity-75" : ""}`}>
              {filteredChallenges.map((challenge) => (
                <ChallengeListItem
                  key={challenge.id}
                  id={challenge.id}
                  title={challenge.title}
                  description={challenge.description}
                  imageUrl={challenge.imageUrl}
                  startDate={challenge.startDate}
                  endDate={challenge.endDate}
                  creator={challenge.creator}
                  requirements={challenge.requirements}
                  memberCount={challenge._count?.members || 0}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
