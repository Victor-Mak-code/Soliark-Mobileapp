import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque, Plus_Jakarta_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { I18nProvider } from "@/i18n/I18nProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Scoped to the new Ideas/Brainstorm pages (`.theme-ideas`) — see globals.css.
const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-ideas-display",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-ideas-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-ideas-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Soliark",
  description: "Journal, storyboards, and video creation",
};

const THEME_BOOT_SCRIPT = `(function(){try{var extra=JSON.parse(localStorage.getItem('settings-extra')||'{}');var prefs=extra.preferences||{};var theme=prefs.theme||'Light';var dark=theme==='Dark'||(theme==='System'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark);document.documentElement.setAttribute('data-theme',dark?'dark':'light');document.documentElement.style.colorScheme=dark?'dark':'light';var langMap={English:'en',Spanish:'es',French:'fr'};document.documentElement.lang=langMap[prefs.language]||'en';}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bricolageGrotesque.variable} ${plusJakartaSans.variable} ${dmMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          <I18nProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
