"use client";

import { useEffect } from "react";
import { toast } from "react-hot-toast";
import { logout, me } from "@/services/authService";
import { clearAuthUser } from "@/services/authRole";

const DEFAULT_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 60 * 1000;
const LOGIN_PATH = "/Login";
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
] as const;

export function useAutoLogout(enabled: boolean, timeoutMs = DEFAULT_IDLE_TIMEOUT_MS) {
  useEffect(() => {
    if (!enabled) return;

    let timeoutId: number | undefined;
    let loggingOut = false;
    let lastHeartbeat = Date.now();
    let lastActivity = Date.now();

    const expireSession = async () => {
      if (loggingOut) return;
      loggingOut = true;

      try {
        await logout();
      } catch {
        // Si la sesion ya expiro en backend, igual limpiamos el estado local.
      } finally {
        clearAuthUser();
        toast.error("Sesion cerrada por inactividad.");
        window.setTimeout(() => {
          window.location.replace(LOGIN_PATH);
        }, 50);
      }
    };

    const resetTimer = () => {
      const now = Date.now();
      if (now - lastActivity >= timeoutMs) {
        void expireSession();
        return;
      }
      lastActivity = now;
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(expireSession, timeoutMs);

      if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeat = now;
        me(true)
          .then((user) => {
            if (!user) void expireSession();
          })
          .catch(() => {});
      }
    };

    const checkAfterPause = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActivity >= timeoutMs) {
        void expireSession();
      } else {
        me()
          .then((user) => {
            if (!user) void expireSession();
          })
          .catch(() => {});
      }
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true });
    });
    document.addEventListener("visibilitychange", checkAfterPause);
    resetTimer();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });
      document.removeEventListener("visibilitychange", checkAfterPause);
    };
  }, [enabled, timeoutMs]);
}
