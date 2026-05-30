import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono, Lato } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryProvider } from "@/components/providers/query-provider"
import { cn } from "@/lib/utils"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { PwaRuntime } from "@/components/pwa/pwa-runtime"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })
const lato = Lato({ subsets: ["latin"], weight: ["300", "400", "700", "900"], variable: "--font-lato" })

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
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(inter.variable, fontMono.variable, lato.variable)}>
      <body className="antialiased">
        <ThemeProvider>
          <QueryProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </QueryProvider>
        </ThemeProvider>
        <PwaRuntime />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
