import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { GlobalShortcuts } from "@/components/shared/global-shortcuts";

export const metadata: Metadata = {
  title: "PsychHub",
  description: "Gestion de cabinet de psychologie — local & sécurisé",
  manifest: "/manifest.webmanifest",
  applicationName: "PsychHub",
  appleWebApp: {
    capable: true,
    title: "PsychHub",
    statusBarStyle: "default"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1419" }
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Providers>
            {children}
            <GlobalShortcuts />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
