import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ComponentProps } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const clerkAppearance: ComponentProps<typeof ClerkProvider>["appearance"] = {
  variables: {
    colorPrimary: "#6aaa64",
    colorPrimaryForeground: "#020617",
    colorForeground: "var(--foreground)",
    colorMutedForeground: "var(--muted)",
    colorMuted: "var(--surface-muted)",
    colorBackground: "var(--surface)",
    colorInput: "var(--surface)",
    colorInputForeground: "var(--foreground)",
    colorBorder: "var(--border)",
    colorRing: "#6aaa64",
    colorSuccess: "#6aaa64",
    colorWarning: "#c9b458",
    colorDanger: "#dc2626",
    colorShadow: "#0f172a",
    borderRadius: "0.375rem",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontFamilyButtons: "Arial, Helvetica, sans-serif",
    fontWeight: {
      normal: 400,
      medium: 700,
      semibold: 800,
      bold: 900,
    },
  },
  elements: {
    card: {
      border: "1px solid var(--border)",
      boxShadow: "0 8px 24px rgb(var(--shadow-color) / 0.18)",
    },
    headerTitle: {
      color: "var(--foreground)",
      fontWeight: "900",
      letterSpacing: "-0.03em",
    },
    headerSubtitle: {
      color: "var(--muted)",
      fontWeight: "700",
    },
    socialButtonsBlockButton: {
      borderColor: "var(--border)",
      boxShadow: "none",
      color: "var(--muted-strong)",
      fontWeight: "700",
    },
    formFieldInput: {
      borderColor: "var(--border)",
      boxShadow: "none",
    },
    formButtonPrimary: {
      backgroundColor: "#6aaa64",
      boxShadow: "none",
      fontWeight: "800",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
    },
    footerActionLink: {
      color: "var(--accent-text)",
      fontWeight: "800",
    },
  },
  options: {
    socialButtonsPlacement: "bottom",
    socialButtonsVariant: "blockButton",
  },
};

export const metadata: Metadata = {
  title: "Definitely not Wordle",
  description: "A Wordle-style game for guessing internal go links.",
};

const themeInitializerScript = `
(() => {
  const storageKey = "golinks-wordle-theme";
  let savedTheme = null;

  try {
    savedTheme = localStorage.getItem(storageKey);
  } catch {}

  const theme = savedTheme === "dark" || savedTheme === "light"
    ? savedTheme
    : "light";

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializerScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ClerkProvider appearance={clerkAppearance}>{children}</ClerkProvider>
      </body>
    </html>
  );
}
