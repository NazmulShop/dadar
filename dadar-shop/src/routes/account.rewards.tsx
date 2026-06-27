import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gift, TrendingUp } from "lucide-react";

import { formatDate } from "@/data/account";
import { useAuth } from "@/lib/authStore";
import { accountFetch } from "@/lib/accountApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account/rewards")({
  component: RewardsPage,
});

interface ApiRewardActivity {
  id: string;
  label: string;
  points: number;
  at: string;
}

interface ApiRewards {
  balance: number;
  tier: string;
  nextTier: { name: string; pointsNeeded: number } | null;
  activity: ApiRewardActivity[];
}

function RewardsPage() {
  const { getToken } = useAuth();
  const [data, setData] = useState<ApiRewards | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    accountFetch<ApiRewards>("/rewards", getToken())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="surface-card text-muted-foreground rounded-3xl p-8 text-center text-sm">
        Loading your reward points…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="surface-card text-muted-foreground rounded-3xl p-8 text-center text-sm">
        Couldn't load your reward points. Please try again later.
      </div>
    );
  }

  const total = data.nextTier ? data.balance + data.nextTier.pointsNeeded : data.balance;
  const progress = data.nextTier ? Math.round((data.balance / Math.max(1, total)) * 100) : 100;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-display flex items-center gap-2 text-2xl font-semibold">
          <Gift className="size-6" /> Reward points
        </h1>
        <p className="text-muted-foreground text-xs">
          Earn points on every order and review. Points are automatically applied at checkout on
          eligible orders.
        </p>
      </header>

      <section className="surface-card rounded-3xl p-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
              Available balance
            </div>
            <div className="text-display text-4xl font-semibold">
              {data.balance.toLocaleString()}
            </div>
            <div className="text-muted-foreground text-xs">points</div>
          </div>
          <div className="bg-amber/15 text-amber-foreground rounded-pill px-3 py-1 text-xs font-medium">
            {data.tier} tier
          </div>
        </div>

        <div className="mt-5">
          <div className="text-muted-foreground mb-1.5 flex items-center justify-between text-xs">
            <span>
              <TrendingUp className="mr-1 inline size-3" />
              {data.nextTier
                ? `${data.nextTier.pointsNeeded} pts to ${data.nextTier.name}`
                : "You've reached the top tier"}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="bg-surface-muted h-2 overflow-hidden rounded-full">
            <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </section>

      <section className="surface-card rounded-3xl p-5">
        <h2 className="text-display mb-3 text-sm font-semibold">Activity</h2>
        {data.activity.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-xs">
            No reward activity yet — place an order or write a review to start earning points.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {data.activity.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">{a.label}</div>
                  <div className="text-muted-foreground text-[11px]">{formatDate(a.at)}</div>
                </div>
                <div
                  className={cn(
                    "text-sm font-semibold",
                    a.points >= 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {a.points >= 0 ? "+" : ""}
                  {a.points} pts
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
