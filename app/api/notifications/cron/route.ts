export const runtime = "nodejs"

import webpush from "web-push"
import { createAdminClient } from "@/lib/supabase/admin"
import { collectDueReminders } from "@/lib/notifications/engine-server"

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function GET(req: Request) {
  // Secure with a cron secret so only Vercel Cron can trigger this
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  // Get all push subscriptions
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")

  if (!subs || subs.length === 0) return Response.json({ ok: true, sent: 0 })

  let sent = 0
  const expired: string[] = []

  // Pass IST hour so engine can gate time-sensitive reminders correctly
  // Vercel runs in UTC; IST = UTC+5:30
  const istHour = (new Date().getUTCHours() + 5) % 24  // close enough (ignores the 30m)

  for (const sub of subs) {
    const reminders = await collectDueReminders(sub.user_id, admin, istHour)
    if (reminders.length === 0) continue

    // Send the highest-priority reminder (urgent first, then first in list)
    const reminder = reminders.find((r) => r.urgent) ?? reminders[0]

    const payload = JSON.stringify({
      title: reminder.title,
      body: reminder.body,
      url: reminder.url,
      icon: "/icon-192",
      badge: "/icon-192",
      tag: reminder.id,
    })

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
      sent++
    } catch (err: unknown) {
      // 410 Gone = subscription expired/unsubscribed
      if (typeof err === "object" && err !== null && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
        expired.push(sub.endpoint)
      }
    }
  }

  // Clean up expired subscriptions
  if (expired.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", expired)
  }

  return Response.json({ ok: true, sent, expired: expired.length })
}
