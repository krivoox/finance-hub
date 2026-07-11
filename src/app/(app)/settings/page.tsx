import { redirect } from "next/navigation";
import { ContentPanel } from "@/components/app-shell/content-panel";
import { UpdateProfileForm } from "@/features/auth/components/update-profile-form";
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from "@/features/auth/domain/profile";
import { getCurrentUser } from "@/features/auth/services/get-current-user";
import { NewGroupWorkspaceForm } from "@/features/workspaces/components/new-group-workspace-form";

function coerceCurrency(code: string): SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code)
    ? (code as SupportedCurrency)
    : "ARS";
}

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <ContentPanel
      title="Ajustes"
      description="Preferencias de tu cuenta y workspace."
    >
      <div className="space-y-10">
        <section className="space-y-4">
          <header>
            <h2 className="text-sm font-semibold text-foreground">Perfil</h2>
            <p className="text-xs text-muted-foreground">
              Nombre, moneda preferida y zona horaria.
            </p>
          </header>
          <UpdateProfileForm
            email={user.email}
            initialValues={{
              displayName: user.displayName ?? user.name,
              preferredCurrency: coerceCurrency(user.preferredCurrency),
              timezone: user.timezone,
            }}
          />
        </section>

        <section id="nuevo-workspace" className="space-y-4">
          <header>
            <h2 className="text-sm font-semibold text-foreground">
              Nuevo workspace grupal
            </h2>
            <p className="text-xs text-muted-foreground">
              Creá un workspace compartido con miembros y saldos comunes.
            </p>
          </header>
          <NewGroupWorkspaceForm />
        </section>
      </div>
    </ContentPanel>
  );
}
