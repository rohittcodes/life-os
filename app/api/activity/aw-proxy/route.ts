import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

const AW_BASE = "http://localhost:5600/api/0"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    // searchParams.get("path") correctly decodes the encoded path+querystring
    const awPath = req.nextUrl.searchParams.get("path")
    if (!awPath) return Response.json({ error: "Missing path" }, { status: 400 })

    const url = `${AW_BASE}/${awPath}`

    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return Response.json({ error: `ActivityWatch returned ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    return Response.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("[aw-proxy]", msg)
    if (msg.includes("fetch") || msg.includes("ECONNREFUSED") || msg.includes("timeout")) {
      return Response.json({ error: "ActivityWatch not reachable on localhost:5600" }, { status: 503 })
    }
    return Response.json({ error: msg }, { status: 500 })
  }
}
