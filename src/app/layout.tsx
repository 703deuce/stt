import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google"; // Temporarily disabled due to connection issues
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { ProgressNotificationProvider } from "../context/ProgressNotificationContext";
import { SpeakerMappingProvider } from "../context/SpeakerMappingContext";
import { OnboardingProvider } from "../context/OnboardingContext";

// Temporarily disabled Google Fonts
// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "Transovo AI - Lightning-Fast AI Transcription",
  description: "Lightning-fast AI transcription trusted by thousands. Unlimited uploads, 99.8% accuracy, and enterprise-grade security.",
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
      >
        <AuthProvider>
          <ProgressNotificationProvider>
            <SpeakerMappingProvider>
              <OnboardingProvider>
                {children}
              </OnboardingProvider>
            </SpeakerMappingProvider>
          </ProgressNotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
