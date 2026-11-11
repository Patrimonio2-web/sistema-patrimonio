
"use client";

import { ReactNode, useState } from "react";
import { Sidebar, Navbar, FloatingButton, Footer } from "@/components";
import PatrimonioAssistant from "./PatrimonioAssistant";

interface WrapperProps {
  children: ReactNode;
}

export default function Wrapper({ children }: WrapperProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-gray-100 dark:bg-gray-900">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex min-w-0 flex-1 flex-col lg:ml-64 lg:max-w-[calc(100vw-16rem)]">
        <Navbar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />

        <FloatingButton />
        <PatrimonioAssistant />

        <main className="mt-16 min-w-0 flex-1 overflow-x-hidden p-2 sm:p-4">{children}</main>

        <Footer variant="dark" />
      </div>
    </div>
  );
}
