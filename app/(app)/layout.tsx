import { RoleShell } from "@/components/layout/RoleShell";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <RoleShell>{children}</RoleShell>;
}
