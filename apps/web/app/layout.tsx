"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import "./globals.css";
import { useAuthStore } from "../lib/auth-store";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isAuthPage = pathname === "/signin" || pathname === "/signup";

    if (!isAuthenticated && !isAuthPage) {
      router.push("/signin");
    } else if (isAuthenticated && isAuthPage) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, pathname, router]);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
