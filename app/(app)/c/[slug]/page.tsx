import { redirect } from "next/navigation";
import { clubLoginPath } from "@/lib/auth/org";
import { lookupPublicOrg } from "@/lib/auth/org-service";
import { getSessionUser } from "@/lib/auth/session";
import { writeActiveOrgId } from "@/lib/auth/org-cookie";

export default async function ClubHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await lookupPublicOrg(slug);
  if (!org) redirect(clubLoginPath(slug));

  const user = await getSessionUser();
  const membership = user?.orgs.find((item) => item.slug === org.slug);
  if (membership) {
    await writeActiveOrgId(membership.id);
    redirect("/admin/entries");
  }

  redirect(clubLoginPath(org.slug));
}
