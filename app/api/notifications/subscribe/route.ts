export const runtime = "nodejs"

import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { subscription } = await req.json() as {
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  }

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return Response.json({ error: "Invalid subscription" }, { status: 400 })
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "user_id,endpoint" }
  )

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { endpoint } = await req.json() as { endpoint: string }
  await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint)
  return Response.json({ ok: true })
}
