import { revalidatePath } from "next/cache";
import { showResultsSlug } from "@/lib/domain/public-results";
import { resetPublicResultsStoreCache } from "./public-results";

/** Drop the public-results snapshot and ISR pages after a desk save. */
export function revalidatePublishedResults(
  show?: { name: string; date: string } | null,
): void {
  resetPublicResultsStoreCache();
  revalidatePath("/results", "layout");
  if (show?.name && show.date) {
    revalidatePath(`/results/${showResultsSlug(show)}`, "layout");
  }
}
