"use client";

import { Button } from "@/components/ui/button";
import {
  buildTrophyOrder,
  trophyOrderCsv,
  trophyOrderPrintHtml,
} from "@/lib/domain/trophy-order";
import { slugify } from "@/lib/domain/public-results";
import type { RosterEntryRecord } from "@/lib/types";
import { Download, Printer } from "lucide-react";

export function TrophyOrderActions({
  showName,
  displayDate,
  tab,
  entries,
}: {
  showName: string;
  displayDate?: string;
  tab: string;
  entries: RosterEntryRecord[];
}) {
  const groups = buildTrophyOrder(entries);
  const filename = `${slugify(showName) || "show"}-${tab}-trophy-order.csv`;

  function downloadCsv() {
    const blob = new Blob([trophyOrderCsv(groups)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function printSheet() {
    const html = trophyOrderPrintHtml({
      showName,
      displayDate,
      groups,
    });
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) return;
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={downloadCsv}
        disabled={groups.length === 0}
      >
        <Download className="h-4 w-4" />
        Trophy CSV
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={printSheet}
        disabled={groups.length === 0}
      >
        <Printer className="h-4 w-4" />
        Print trophy order
      </Button>
    </>
  );
}
