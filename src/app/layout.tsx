import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { FeedbackWrapper } from "@/components/feedback-wrapper";
// import { PushNotificationPrompt } from "@/components/push-notification-prompt"; // Disabled
import { SessionTracker } from "@/components/session-tracker";
import { VisitorTracker } from "@/components/visitor-tracker";
// import { SurveyModal } from "@/components/survey-modal"; // Disabled - enough responses collected

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Challanges - Build Better Habits",
  description: "Create and join challenges, build streaks, and compete with others",
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://challanges.vercel.app"),
  openGraph: {
    title: "Challanges - Build Better Habits",
    description: "Create and join challenges, build streaks, and compete with others",
    type: "website",
    siteName: "Challanges",
  },
  twitter: {
    card: "summary",
    title: "Challanges - Build Better Habits",
    description: "Create and join challenges, build streaks, and compete with others",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.variable} font-sans antialiased bg-slate-950 text-white min-h-screen`}>
        <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 -z-10" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent -z-10" />
        <Navbar />
        <main className="pt-16">
          {children}
        </main>
        <FeedbackWrapper />
        {/* <PushNotificationPrompt /> */}
        {/* <SurveyModal /> */}
        <SessionTracker />
        <VisitorTracker />
      </body>
    </html>
  );
}
