import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"BPCL × IIM Visakhapatnam | Ideathon Leaderboard",description:"Institute-wise registration leaderboard for the national techno-managerial ideathon."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
