import "./global.css";
import { Poppins, Roboto } from "next/font/google";
import { BottomHeader } from "@/shared/widgets/header/bottomHeader";
import Header from "@/shared/widgets/header/header";
import Providers from "./providers";

export const metadata = {
  title: "Zuzi",
  description:
    "Zuzi is a scalable multi-vendor e-commerce platform connecting sellers and buyers through a unified marketplace.",
};

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-roboto",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} ${poppins.variable}`}>
        <Providers>
          <Header />
          <BottomHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
