import { IconRail } from "./icon-rail";
import { MobileNav } from "./mobile-nav";
import { SecondaryNav } from "./secondary-nav";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background md:flex-row">
      <IconRail />
      <SecondaryNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <MobileNav />
        <div className="flex min-h-0 flex-1 flex-col md:p-3 md:pl-0">
          {children}
        </div>
      </div>
    </div>
  );
}
