import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "People & Subs" }
import { ContactsList } from "@/components/contacts/contacts-list"
import { ContactForm } from "@/components/contacts/contact-form"
import { SubscriptionsList } from "@/components/contacts/subscriptions-list"
import { SubscriptionForm } from "@/components/contacts/subscription-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Contact, Subscription } from "@/lib/types"

export default async function ContactsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: contacts }, { data: subs }] = await Promise.all([
    supabase.from("contacts").select("*").eq("user_id", user!.id).order("name"),
    supabase.from("subscriptions").select("*").eq("user_id", user!.id).order("name"),
  ])

  const allContacts: Contact[] = contacts ?? []
  const allSubs: Subscription[] = subs ?? []

  const activeSubs = allSubs.filter((s) => s.active)
  const monthlyTotal = activeSubs.reduce((sum, s) => {
    const monthly = s.billing_cycle === "yearly" ? s.amount / 12
      : s.billing_cycle === "quarterly" ? s.amount / 3
      : s.billing_cycle === "weekly" ? s.amount * 4
      : s.amount
    return sum + monthly
  }, 0)

  const needsFollowUp = allContacts.filter(
    (c) => c.next_follow_up && new Date(c.next_follow_up) <= new Date()
  )

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">People & Subs</h1>
        <p className="text-sm text-muted-foreground">
          {allContacts.length} contacts · {needsFollowUp.length} need follow-up · ₹{Math.round(monthlyTotal).toLocaleString("en-IN")}/mo in subscriptions
        </p>
      </div>

      <Tabs defaultValue="contacts">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <ContactForm />
            <SubscriptionForm />
          </div>
        </div>

        <TabsContent value="contacts" className="mt-4">
          <ContactsList contacts={allContacts} />
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xl font-bold">₹{Math.round(monthlyTotal).toLocaleString("en-IN")}</div>
              <div className="text-xs text-muted-foreground">per month</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xl font-bold">₹{Math.round(monthlyTotal * 12).toLocaleString("en-IN")}</div>
              <div className="text-xs text-muted-foreground">per year</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xl font-bold">{activeSubs.length}</div>
              <div className="text-xs text-muted-foreground">active subs</div>
            </div>
          </div>
          <SubscriptionsList subscriptions={allSubs} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
