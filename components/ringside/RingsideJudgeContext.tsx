"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  stickyJudgeForShow,
  writeStickyJudge,
} from "@/lib/client/sticky-judge";
import { syncShowJudges } from "@/lib/domain/show-judges";
import type { Show } from "@/lib/types";

type RingsideJudgeContextValue = {
  judge: string;
  setJudge: (name: string) => void;
  judges: string[];
  showId: string | null;
};

const RingsideJudgeContext = createContext<RingsideJudgeContextValue | null>(
  null,
);

export function RingsideJudgeProvider({
  show,
  children,
}: {
  show: Show | null;
  children: React.ReactNode;
}) {
  const judges = useMemo(() => syncShowJudges(show ?? {}).judges, [show]);
  const [judge, setJudgeState] = useState("");

  useEffect(() => {
    if (!show) {
      setJudgeState("");
      return;
    }
    setJudgeState(stickyJudgeForShow(show.id, judges) ?? "");
  }, [show, judges]);

  const setJudge = useCallback(
    (name: string) => {
      setJudgeState(name);
      if (show) writeStickyJudge(show.id, name);
    },
    [show],
  );

  return (
    <RingsideJudgeContext.Provider
      value={{ judge, setJudge, judges, showId: show?.id ?? null }}
    >
      {children}
    </RingsideJudgeContext.Provider>
  );
}

export function useRingsideJudge(): RingsideJudgeContextValue & {
  available: boolean;
} {
  const ctx = useContext(RingsideJudgeContext);
  if (!ctx) {
    return {
      judge: "",
      setJudge: () => undefined,
      judges: [],
      showId: null,
      available: false,
    };
  }
  return { ...ctx, available: true };
}
