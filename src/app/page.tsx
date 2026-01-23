import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();

  // If user is logged in, redirect to feed
  if (user) {
    redirect("/feed");
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative px-4 py-32 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center">
          <div className="animate-fade-in">
            <span className="inline-block mb-6 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium">
              🤝 Challenge friends. Compete. Grow together.
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up">
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Challenge Your Friends.
            </span>
            <br />
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Rise Together.
            </span>
          </h1>

          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.2s" }}>
            Join existing challenges or create your own. Compete with friends and strangers alike, 
            and push each other to become the best versions of yourselves.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Link href="/challenges">
              <Button size="lg" className="animate-glow">
                Browse Challenges
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" size="lg">
                Create Your Own
              </Button>
            </Link>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -z-10" />
      </section>

      {/* How It Works Section */}
      <section className="px-4 py-24 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            How It Works
          </h2>
          <p className="text-slate-400 text-center mb-16 max-w-2xl mx-auto">
            Turn any goal into a friendly competition
          </p>

          <div className="grid md:grid-cols-4 gap-6 stagger-children">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 flex items-center justify-center text-2xl font-bold text-amber-400">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">Join or Create</h3>
              <p className="text-slate-400 text-sm">
                Browse public challenges or start your own
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center text-2xl font-bold text-emerald-400">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">Invite Friends</h3>
              <p className="text-slate-400 text-sm">
                Bring your crew or compete with strangers
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 flex items-center justify-center text-2xl font-bold text-violet-400">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Compete Daily</h3>
              <p className="text-slate-400 text-sm">
                Log progress & climb the leaderboard
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-rose-500/20 to-pink-600/20 border border-rose-500/30 flex items-center justify-center text-2xl font-bold text-rose-400">
                4
              </div>
              <h3 className="text-lg font-semibold mb-2">Grow Together</h3>
              <p className="text-slate-400 text-sm">
                Push each other to reach new heights
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Built for Friendly Competition
          </h2>
          <p className="text-slate-400 text-center mb-16 max-w-2xl mx-auto">
            Everything you need to challenge, compete, and win together
          </p>

          <div className="grid md:grid-cols-3 gap-8 stagger-children">
            <Card variant="glass" className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-3xl">
                ⚔️
              </div>
              <h3 className="text-xl font-semibold mb-3">Join Any Challenge</h3>
              <p className="text-slate-400">
                Browse public challenges and jump in. Or create your own and invite others to compete with you.
              </p>
            </Card>

            <Card variant="glass" className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-3xl">
                🏆
              </div>
              <h3 className="text-xl font-semibold mb-3">Live Leaderboards</h3>
              <p className="text-slate-400">
                Real-time rankings keep the competition fierce. Watch your friends climb or fall as the challenge unfolds.
              </p>
            </Card>

            <Card variant="glass" className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-3xl">
                🔥
              </div>
              <h3 className="text-xl font-semibold mb-3">Streak Wars</h3>
              <p className="text-slate-400">
                Build daily streaks and don't let your friends catch up. One missed day and they'll take the lead.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof / Community Section */}
      <section className="px-4 py-24 bg-slate-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <span className="text-6xl">🤜🤛</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Better Together
          </h2>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            People who compete with friends are <span className="text-amber-400 font-semibold">3x more likely</span> to stick with their habits. 
            Turn accountability into a game and watch everyone level up.
          </p>
          
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div>
              <div className="text-3xl font-bold text-amber-400">76%</div>
              <div className="text-sm text-slate-500">Higher completion</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-400">2.5x</div>
              <div className="text-sm text-slate-500">Longer streaks</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-violet-400">∞</div>
              <div className="text-sm text-slate-500">Bragging rights</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
            <h2 className="text-3xl font-bold mb-4">Ready to Join the Competition?</h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Jump into an existing challenge or create your own. 
              Either way — the only question is, who's going to win?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/challenges">
                <Button size="lg">
                  Explore Challenges
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="lg">
                  Sign Up & Create
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-slate-800">
        <div className="max-w-6xl mx-auto text-center text-slate-500 text-sm">
          <p>© 2026 Challanges. Built for competitors who want to grow together. 🔥</p>
        </div>
      </footer>
    </div>
  );
}
