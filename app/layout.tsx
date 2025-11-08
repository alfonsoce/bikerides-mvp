export const metadata = {
  title: "BikeRides – MVP",
  description: "Prototipo per organizzare uscite in bici",
};

import "./globals.css";
import React from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
