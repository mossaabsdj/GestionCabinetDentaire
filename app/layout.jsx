import "@/app/globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import SidebarPage from "@/app/component/NewSideBar/page";
import ExitButton from "@/app/component/exitbutton/page";
import param from "@/param.json";
import { ThemeProvider } from "@/context/theme-context";
import { icons } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: param.title,
  description: "make world better",
  icons: {
    icon: "/logo.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-gradient-to-br from-[var(--color-50)] via-white to-[var(--color-100)]">
        <ThemeProvider>
          <SidebarProvider>
            <div className="flex w-full h-screen overflow-hidden relative">
              {/* Left Sidebar */}
              <SidebarPage />

              {/* Main content */}
              <main className="flex-1 p-0 overflow-auto">{children}</main>
            </div>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
