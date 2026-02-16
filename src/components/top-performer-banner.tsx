import Link from "next/link";
import { getYesterdayTopPerformers, awardTopPerformers, getTopPerformerCheckins } from "@/actions/top-performer";
import { TopPerformerSlideshow } from "./top-performer-slideshow";

// Small compact banner for feed
export async function TopPerformerBanner() {
  const result = await getYesterdayTopPerformers();

  if (!result || result.performers.length === 0) {
    return null;
  }

  // Award top performers if not already awarded today
  await awardTopPerformers();

  const { performers, isTie, date } = result;
  const firstPerformer = performers[0];
  
  // Get check-ins for slideshow
  const slideshowData = await getTopPerformerCheckins();

  return (
    <>
      {/* Slideshow Modal (shows once per day on first visit) */}
      {slideshowData && slideshowData.checkins.length > 0 && (
        <TopPerformerSlideshow
          performer={slideshowData.performer}
          checkins={slideshowData.checkins}
          date={date}
        />
      )}
      
      {/* Compact Banner */}
      <div className="mb-6">
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          {/* Header row with trophy and title */}
          <div className="flex items-center gap-3 mb-2 sm:mb-0">
            {/* Trophy */}
            <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20">
              🏆
            </div>

            {/* Title and single performer (desktop) or just title (mobile with tie) */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-400 font-medium">
                Yesterday's Top Performer{isTie ? "s" : ""}
                {isTie && <span className="ml-1 text-slate-500">(Tie!)</span>}
              </p>
              
              {/* Single performer - show inline on all screens */}
              {!isTie && (
                <p className="text-sm text-white font-semibold truncate">
                  <Link href={`/profile/${firstPerformer.user.id}`} className="hover:text-amber-400 transition-colors">
                    {firstPerformer.user.fullName || firstPerformer.user.username || "Anonymous"}
                  </Link>
                  <span className="ml-2 text-xs font-normal text-emerald-400">✓ {firstPerformer.completedCount} check-ins</span>
                </p>
              )}

              {/* Multiple performers - inline only on desktop */}
              {isTie && (
                <p className="hidden sm:block text-sm text-white font-semibold truncate">
                  {performers.slice(0, 2).map((p, i) => (
                    <span key={p.user.id}>
                      <Link href={`/profile/${p.user.id}`} className="hover:text-amber-400 transition-colors">
                        {p.user.fullName || p.user.username || "Anonymous"}
                      </Link>
                      {i < Math.min(performers.length, 2) - 1 && <span className="text-slate-500"> & </span>}
                    </span>
                  ))}
                  {performers.length > 2 && <span className="text-slate-500"> +{performers.length - 2}</span>}
                  <span className="ml-2 text-xs font-normal text-emerald-400">✓ {firstPerformer.completedCount} check-ins each</span>
                </p>
              )}
            </div>

            {/* Stats badges - desktop only */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1 text-xs px-2 py-1 bg-emerald-500/20 rounded-full text-emerald-400">
                ✓ {firstPerformer.completedCount}
              </span>
              <span className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-700/50 rounded-full text-slate-300">
                🎯 {firstPerformer.challenges.length}
              </span>
            </div>
          </div>

          {/* Multiple performers list - mobile only, stacked vertically */}
          {isTie && (
            <div className="sm:hidden mt-2 space-y-2 border-t border-amber-500/20 pt-2">
              {performers.slice(0, 5).map((performer) => (
                <Link 
                  key={performer.user.id} 
                  href={`/profile/${performer.user.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                >
                  {performer.user.avatarUrl ? (
                    <img
                      src={performer.user.avatarUrl}
                      alt={performer.user.fullName || "User"}
                      className="w-9 h-9 rounded-full ring-2 ring-amber-500/30 object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-bold ring-2 ring-amber-500/30">
                      {(performer.user.fullName || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {performer.user.fullName || performer.user.username || "Anonymous"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {performer.challenges.length} challenge{performer.challenges.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs px-2 py-1 bg-emerald-500/20 rounded-full text-emerald-400">
                    ✓ {performer.completedCount}
                  </div>
                </Link>
              ))}
              {performers.length > 5 && (
                <p className="text-xs text-center text-slate-500 pt-1">+{performers.length - 5} more top performers</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Large detailed banner (for dashboard)
export async function TopPerformerBannerLarge() {
  const result = await getYesterdayTopPerformers();

  if (!result || result.performers.length === 0) {
    return null;
  }

  const { performers, isTie, date } = result;
  const firstPerformer = performers[0];
  const { user, completedCount, challenges } = firstPerformer;

  const formatDate = (d: Date) => {
    return new Date(d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/30 rounded-2xl p-4 sm:p-6 mb-6">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl" />
      
      <div className="relative flex flex-col sm:flex-row items-center gap-4">
        {/* Trophy Icon */}
        <div className="shrink-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-3xl sm:text-4xl shadow-lg shadow-amber-500/30">
            🏆
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
            <span className="text-xs sm:text-sm font-medium text-amber-400 uppercase tracking-wider">
              Yesterday's Top Performer{isTie ? "s" : ""}
            </span>
            {isTie && <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">Tie!</span>}
            <span className="text-xs text-slate-500">
              {formatDate(date)}
            </span>
          </div>
          
          <div className="flex items-center justify-center sm:justify-start gap-3 mb-2 flex-wrap">
            {performers.slice(0, 3).map((performer, index) => (
              <Link 
                key={performer.user.id} 
                href={`/profile/${performer.user.id}`} 
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {performer.user.avatarUrl ? (
                  <img
                    src={performer.user.avatarUrl}
                    alt={performer.user.fullName || "User"}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full ring-2 ring-amber-500/50"
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg sm:text-xl font-bold ring-2 ring-amber-500/50">
                    {(performer.user.fullName || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {performer.user.fullName || performer.user.username || "Anonymous"}
                  </h3>
                  {performer.user.username && performer.user.fullName && (
                    <p className="text-xs text-slate-400">@{performer.user.username}</p>
                  )}
                </div>
                {isTie && index < Math.min(performers.length, 3) - 1 && (
                  <span className="text-amber-400 font-bold mx-1">&</span>
                )}
              </Link>
            ))}
            {performers.length > 3 && (
              <span className="text-sm text-slate-400">+{performers.length - 3} more</span>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 rounded-full">
              <span className="text-emerald-400">✓</span>
              <span className="text-emerald-300 font-medium">{completedCount} check-ins completed</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-700/50 rounded-full">
              <span className="text-amber-400">🎯</span>
              <span className="text-slate-300">{challenges.length} challenge{challenges.length !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Challenge names */}
          {challenges.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {challenges.slice(0, 3).map((challenge) => (
                <Link
                  key={challenge.id}
                  href={`/challenges/${challenge.id}`}
                  className="text-xs px-2 py-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-full text-slate-300 transition-colors"
                >
                  {challenge.title}
                </Link>
              ))}
              {challenges.length > 3 && (
                <span className="text-xs text-slate-500">+{challenges.length - 3} more</span>
              )}
            </div>
          )}
        </div>

        {/* Celebration decoration */}
        <div className="hidden sm:flex flex-col items-center gap-1 text-2xl opacity-50">
          <span>✨</span>
          <span>🔥</span>
          <span>💪</span>
        </div>
      </div>
    </div>
  );
}
