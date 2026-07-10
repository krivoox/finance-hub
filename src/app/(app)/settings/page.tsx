import { ContentPanel } from "@/components/app-shell/content-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  // TODO: replace with GetProfile / UpdateProfile use cases
  return (
    <ContentPanel
      title="Ajustes"
      description="Preferencias de tu cuenta y workspace."
      actions={<Button>Guardar</Button>}
    >
      <div className="max-w-md space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="display-name"
            className="text-sm font-medium text-muted-foreground"
          >
            Nombre
          </label>
          <Input id="display-name" defaultValue="Ana" />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-sm font-medium text-muted-foreground"
          >
            Email
          </label>
          <Input id="email" type="email" defaultValue="ana@example.com" />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="currency"
            className="text-sm font-medium text-muted-foreground"
          >
            Moneda preferida
          </label>
          <Input id="currency" defaultValue="ARS" disabled />
        </div>
      </div>
    </ContentPanel>
  );
}
