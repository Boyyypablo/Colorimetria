import type { Metadata } from "next";
import { Fraunces, DM_Sans, Merienda } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
  // Pesos enxutos: menos faces = menos pressão no Turbopack/next/font.
  weight: ["400", "600", "700"],
});

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500"],
});

/** Script gentil ([Merienda](https://fonts.google.com/specimen/Merienda)) — dashboard / leituras. */
const script = Merienda({
  subsets: ["latin"],
  variable: "--font-script",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Glowing — Colorimetria & Estética",
  description:
    "Consultoria em colorimetria e imagem: descubra sua cartela, recomendações e aplicação prática.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${display.variable} ${sans.variable} ${script.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
