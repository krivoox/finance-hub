import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import { UpdateProfileForm } from "@/features/auth/components/update-profile-form";
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from "@/features/auth/domain/profile";
import { getCurrentUser } from "@/features/auth/services/get-current-user";
import { listCategories } from "@/features/categories/services";
import { CategoriesSettingsPanel } from "@/features/categories/components/categories-settings-panel";
import {
  parseSettingsTab,
  SettingsTabsNav,
} from "@/features/settings/components/settings-tabs-nav";
import { NewGroupWorkspaceForm } from "@/features/workspaces/components/new-group-workspace-form";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";

function coerceCurrency(code: string): SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code)
    ? (code as SupportedCurrency)
    : "ARS";
}

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function SettingsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const activeTab = parseSettingsTab(params.tab);

  const workspace = await getActiveWorkspaceForUser(user.id);
  const canMutateCategories = workspace
    ? workspace.role !== "viewer"
    : false;

  const categories =
    activeTab === "categorias" && workspace
      ? await listCategories({
          userId: user.id,
          workspaceId: workspace.id,
          includeArchived: true,
        })
      : [];

  return (
    <ContentPanel
      title="Ajustes"
      description="Preferencias de tu cuenta y del workspace activo."
    >
      <SettingsTabsNav active={activeTab} />

      {activeTab === "perfil" ? (
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
      ) : null}

      {activeTab === "workspace" ? (
        <section className="space-y-4">
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
      ) : null}

      {activeTab === "categorias" ? (
        workspace ? (
          <CategoriesSettingsPanel
            workspaceId={workspace.id}
            workspaceName={workspace.name}
            canMutate={canMutateCategories}
            categories={categories.map((c) => ({
              id: c.id,
              name: c.name,
              kind: c.kind,
              isArchived: c.isArchived,
            }))}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Necesitás un workspace activo para gestionar categorías.
          </p>
        )
      ) : null}
    </ContentPanel>
  );
}
