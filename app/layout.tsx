import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  icons: { icon: "/icon.png" },
  title: "Mayukh AI Console",
  description:
    "Internal growth, story and buying intelligence console for Mayukh Tea, Darjeeling.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="relative">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
