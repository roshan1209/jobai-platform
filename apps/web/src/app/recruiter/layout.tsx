import DashboardShell from "@/components/DashboardShell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="recruiter">{children}</DashboardShell>;
}
