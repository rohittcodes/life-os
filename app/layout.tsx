import type { Metadata } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: {
    default: "Life OS",
    template: "%s · Life OS",
  },
  description: "Your personal operating system — habits, finance, goals, projects, and daily notes in one place.",
  applicationName: "Life OS",
  keywords: ["productivity", "habit tracker", "finance", "personal dashboard", "goal tracker"],
  authors: [{ name: "Life OS" }],
  creator: "Life OS",
  metadataBase: new URL("https://life-os.app"),
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://life-os.app",
    siteName: "Life OS",
    title: "Life OS — Your personal operating system",
    description: "Track habits, manage finances, plan goals, and run your life from one beautiful dashboard.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Life OS — Your personal operating system",
    description: "Track habits, manage finances, plan goals, and run your life from one beautiful dashboard.",
  },
  robots: {
    index: false,
    follow: false,
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Life OS",
    statusBarStyle: "black-translucent",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(inter.variable, fontMono.variable)}>
      <body className="antialiased">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
