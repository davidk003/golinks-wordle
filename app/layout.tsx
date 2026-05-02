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
    colorPrimaryForeground: "#ffffff",
    colorForeground: "#020617",
    colorMutedForeground: "#64748b",
    colorMuted: "#f8fafc",
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: "#020617",
    colorBorder: "#d3d6da",
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
      border: "1px solid #d3d6da",
      boxShadow: "0 8px 24px rgb(15 23 42 / 0.12)",
    },
    headerTitle: {
      color: "#020617",
      fontWeight: "900",
      letterSpacing: "-0.03em",
    },
    headerSubtitle: {
      color: "#64748b",
      fontWeight: "700",
    },
    socialButtonsBlockButton: {
      borderColor: "#d3d6da",
      boxShadow: "none",
      color: "#334155",
      fontWeight: "700",
    },
    formFieldInput: {
      borderColor: "#d3d6da",
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
      color: "#6aaa64",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider appearance={clerkAppearance}>{children}</ClerkProvider>
      </body>
    </html>
  );
}
