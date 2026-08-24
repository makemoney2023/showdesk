"use client";

import { useState } from "react";
import { Check, Copy, Link2, Share2 } from "lucide-react";

export function ShareButtons({
  url,
  title,
  text,
  groupUrl,
}: {
  url: string;
  title: string;
  text: string;
  groupUrl?: string | null;
}) {
  const [copied, setCopied] = useState<"link" | "post" | null>(null);

  async function copy(value: string, which: "link" | "post") {
    await navigator.clipboard.writeText(value);
    setCopied(which);
    window.setTimeout(() => setCopied(null), 1800);
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await copy(`${text}\n${url}`, "post");
  }

  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void nativeShare()}
        className="inline-flex items-center gap-2 rounded-full bg-[#c4a35a] px-4 py-2 text-sm font-semibold text-[#141210]"
      >
        <Share2 className="h-4 w-4" aria-hidden />
        Share results
      </button>
      <a
        href={facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-[#f7f4ed]/80 hover:border-[#c4a35a]/50"
      >
        Facebook
      </a>
      {groupUrl ? (
        <a
          href={groupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-[#f7f4ed]/80 hover:border-[#c4a35a]/50"
        >
          Post to group
        </a>
      ) : null}
      <a
        href={xUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-[#f7f4ed]/80 hover:border-[#c4a35a]/50"
      >
        X
      </a>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-[#f7f4ed]/80 hover:border-[#c4a35a]/50"
      >
        WhatsApp
      </a>
      <button
        type="button"
        onClick={() => void copy(url, "link")}
        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-[#f7f4ed]/80 hover:border-[#c4a35a]/50"
      >
        {copied === "link" ? (
          <Check className="h-4 w-4" aria-hidden />
        ) : (
          <Link2 className="h-4 w-4" aria-hidden />
        )}
        {copied === "link" ? "Copied" : "Copy link"}
      </button>
      <button
        type="button"
        onClick={() => void copy(text, "post")}
        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-[#f7f4ed]/80 hover:border-[#c4a35a]/50"
      >
        {copied === "post" ? (
          <Check className="h-4 w-4" aria-hidden />
        ) : (
          <Copy className="h-4 w-4" aria-hidden />
        )}
        {copied === "post" ? "Copied" : "Copy post"}
      </button>
    </div>
  );
}
