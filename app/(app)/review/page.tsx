import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Weekly Review" }
import { ReviewForm } from "@/components/review/review-form"
import type { WeeklyReview } from "@/lib/types"

function getThisSunday() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day
  const sun = new Date(d.setDate(diff))
  return sun.toISOString().split("T")[0]
}

export default async function ReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const weekStart = getThisSunday()

  const { data: reviews = [] } = await supabase
    .from("weekly_reviews")
    .select("*")
    .eq("user_id", user!.id)
    .order("week_start", { ascending: false })

  const allReviews = reviews ?? []
  const currentReview = allReviews.find((r: WeeklyReview) => r.week_start === weekStart) ?? null
  const pastReviews = allReviews.filter((r: WeeklyReview) => r.week_start !== weekStart)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Weekly Review</h1>
        <p className="text-sm text-muted-foreground">Reflect every Sunday to compound your growth</p>
      </div>

      <ReviewForm existing={currentReview} weekStart={weekStart} />

      {pastReviews.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">Past reviews</h2>
          {pastReviews.map((review: WeeklyReview) => (
            <div key={review.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Week of {new Date(review.week_start).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </h3>
                {review.energy_score && (
                  <span className="text-xs text-muted-foreground">⚡ {review.energy_score}/10</span>
                )}
              </div>
              {review.wins && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Wins</span>
                  <p className="mt-0.5 text-sm">{review.wins}</p>
                </div>
              )}
              {review.next_week_focus && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Focus</span>
                  <p className="mt-0.5 text-sm">{review.next_week_focus}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
