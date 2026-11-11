
"use client";

import React from "react";
import { isViewer } from "@/services/authRole";

interface RoleGuardProps {
  hideIfViewer?: boolean;
  disableIfViewer?: boolean;
  children: React.ReactNode;
}

export default function RoleGuard({
  hideIfViewer,
  disableIfViewer,
  children,
}: RoleGuardProps) {
  const viewer = isViewer();

  if (hideIfViewer && viewer) {
    return null;
  }

  if (disableIfViewer && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      disabled: true,
      className: `${(children.props as { className?: string }).className ?? ""} opacity-60 cursor-not-allowed`,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      },
    });
  }

  return <>{children}</>;
}
