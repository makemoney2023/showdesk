import { MarketingFooter, MarketingNav } from "@/components/marketing/sections";

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#070707] text-[#f7f4ed] selection:bg-[#c4a35a] selection:text-[#141210]">
      <MarketingNav />
      <div className="pt-16">{children}</div>
      <MarketingFooter />
    </div>
  );
}
