import type { Metadata } from "next"
import Link from "next/link"
import "./globals.css"

export const metadata: Metadata = {
  title: "DataTable App",
  description: "Standalone DataTable v2 + Reports Builder application",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>
        <div className="min-h-screen">
          <nav className="border-b border-border-default bg-bg-base px-6 py-3">
            <div className="flex items-center gap-6">
              <span className="text-md font-semibold text-text-primary">DataTable App</span>
              <div className="flex gap-4 text-sm">
                <Link href="/" className="text-text-secondary hover:text-accent">Overview</Link>
                <Link href="/basic" className="text-text-secondary hover:text-accent">Basic</Link>
                <Link href="/editable" className="text-text-secondary hover:text-accent">Editable</Link>
                <Link href="/grouping" className="text-text-secondary hover:text-accent">Grouping</Link>
                <Link href="/totals" className="text-text-secondary hover:text-accent">Totals</Link>
                <Link href="/settings" className="text-text-secondary hover:text-accent">Settings</Link>
                <Link href="/reports" className="text-text-secondary hover:text-accent">Reports</Link>
              </div>
            </div>
          </nav>
          <main className="p-6">{children}</main>
        </div>
      </body>
    </html>
  )
}
