import type { LucideIcon } from "lucide-react";
import { Activity, Bug, Code2, Crosshair, FileWarning, History, KeyRound, LayoutDashboard, ListChecks, Network, NotebookPen, ScanLine, Settings2, ShieldAlert, Wrench } from "lucide-react";

export const navigation = [
  { group: "Workspace", items: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Projects", href: "/projects", icon: Crosshair },
    { label: "Reports", href: "/reports", icon: FileWarning },
    { label: "Notes", href: "/notes", icon: NotebookPen },
  ] },
  { group: "Hunting", items: [
    { label: "Assets", href: "/assets", icon: Network },
    { label: "Bug Bounty", href: "/bounty", icon: Bug },
    { label: "VDP", href: "/vdp", icon: ShieldAlert },
    { label: "CVE Feed", href: "/cve", icon: ScanLine },
  ] },
  { group: "Arsenal", items: [
    { label: "Payloads", href: "/payloads", icon: Code2 },
    { label: "Checklists", href: "/checklists", icon: ListChecks },
    { label: "Vault", href: "/vault", icon: KeyRound },
    { label: "Tools", href: "/tools/cvss", icon: Wrench },
  ] },
  { group: "System", items: [
    { label: "Timeline", href: "/timeline", icon: History },
    { label: "Settings", href: "/settings/general", icon: Settings2 },
  ] },
] as const;

export const flatNavigation: { label: string; href: string; icon: LucideIcon }[] = navigation.flatMap(section => [...section.items]);

