import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/app/(app)/login/login-form";
import { lookupPublicOrg } from "@/lib/auth/org-service";

export default async function ClubLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await lookupPublicOrg(slug);
  if (!org) notFound();

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md text-sm text-sss-text-muted">
          Loading login…
        </div>
      }
    >
      <LoginForm club={{ name: org.name, slug: org.slug }} />
    </Suspense>
  );
}
