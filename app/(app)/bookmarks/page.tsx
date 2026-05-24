import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Library" }
import { BookmarksList } from "@/components/bookmarks/bookmarks-list"
import { ReadingList } from "@/components/bookmarks/reading-list"
import { BookmarkForm } from "@/components/bookmarks/bookmark-form"
import { ReadingForm } from "@/components/bookmarks/reading-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Bookmark, ReadingItem } from "@/lib/types"

export default async function BookmarksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: bookmarks }, { data: reading }] = await Promise.all([
    supabase.from("bookmarks").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
    supabase.from("reading_list").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
  ])

  const allBookmarks: Bookmark[] = bookmarks ?? []
  const allReading: ReadingItem[] = reading ?? []

  const currentlyReading = allReading.filter((r) => r.status === "reading")

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Library</h1>
        <p className="text-sm text-muted-foreground">
          {allBookmarks.length} bookmarks · {currentlyReading.length} reading now
        </p>
      </div>

      <Tabs defaultValue="bookmarks">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
            <TabsTrigger value="reading">Reading list</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <BookmarkForm />
            <ReadingForm />
          </div>
        </div>

        <TabsContent value="bookmarks" className="mt-4">
          <BookmarksList bookmarks={allBookmarks} />
        </TabsContent>

        <TabsContent value="reading" className="mt-4">
          <ReadingList items={allReading} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
