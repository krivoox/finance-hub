import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ContentPanel } from "@/components/app-shell/content-panel";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import { Skeleton } from "@/components/ui/skeleton";
import { UpdateProfileForm } from "@/features/auth/components/update-profile-form";
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from "@/features/auth/domain/profile";
import { getCurrentUser } from "@/features/auth/services/get-current-user";
import {
  ensureSubscriptionCategories,
  listCategories,
} from "@/features/categories/services";
import { CategoriesSettingsPanel } from "@/features/categories/components/categories-settings-panel";
import { ConsolidationRateForm } from "@/features/currency-exchange/components/consolidation-rate-form";
import { getConsolidationRate } from "@/features/currency-exchange/services";
import { getUsdQuotes } from "@/features/fx-quotes/services";
import { env } from "@/lib/env";
import {
  parseSettingsTab,
  SettingsTabsNav,
} from "@/features/settings/components/settings-tabs-nav";
import { RenameWorkspaceForm } from "@/features/workspaces/components/rename-workspace-form";
import {
  getActiveWorkspaceForUser,
  type ActiveWorkspaceContext,
} from "@/features/workspaces/services";

type ConsolidationRate = Awaited<ReturnType<typeof getConsolidationRate>> | null;
type UsdQuotes = Awaited<ReturnType<typeof getUsdQuotes>> | null;
type CategoriesResult = Awaited<ReturnType<typeof listCategories>>;

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
  const canMutateCategories = workspace ? workspace.role !== "viewer" : false;

  // Kick off the tab-specific reads now, but DON'T await here: the chrome + the
  // tabs nav paint instantly while each tab's data-dependent content streams
  // behind its own <Suspense>. The profile tab has no heavy read model, so it
  // renders directly. No money is cached.
  const consolidationRatePromise: Promise<ConsolidationRate> =
    activeTab === "workspace" && workspace
      ? getConsolidationRate({ userId: user.id, workspaceId: workspace.id })
      : Promise.resolve(null);
  const usdQuotesPromise: Promise<UsdQuotes> =
    activeTab === "workspace" && env.USD_QUOTES_ENABLED
      ? getUsdQuotes({ seedIfEmpty: false })
      : Promise.resolve(null);
  const categoriesPromise: Promise<CategoriesResult> =
    activeTab === "categorias" && workspace
      ? ensureSubscriptionCategories(workspace.id).then(() =>
          listCategories({
            userId: user.id,
            workspaceId: workspace.id,
            includeArchived: true,
          }),
        )
      : Promise.resolve([]);

  return (
    <ContentPanel
      title="Ajustes"
      description="Preferencias de tu cuenta y del workspace activo."
    >
      <SettingsTabsNav active={activeTab} />

      {activeTab === "perfil" ? (
        <SurfaceSection>
          <SurfaceHeader
            title="Perfil"
            description="Nombre, moneda preferida y zona horaria."
          />
          <UpdateProfileForm
            email={user.email}
            initialValues={{
              displayName: user.displayName ?? user.name,
              preferredCurrency: coerceCurrency(user.preferredCurrency),
              timezone: user.timezone,
            }}
          />
        </SurfaceSection>
      ) : null}

      {activeTab === "workspace" ? (
        <div className="flex flex-col gap-5 sm:gap-6">
          {workspace ? (
            <SurfaceSection>
              <SurfaceHeader
                title="Tu espacio"
                description="Nombre de tu workspace personal. Los grupos de gastos divididos viven aparte, en Grupos."
              />
              <RenameWorkspaceForm
                workspaceId={workspace.id}
                initialName={workspace.name}
                canRename={workspace.role === "owner" || workspace.role === "admin"}
              />
            </SurfaceSection>
          ) : null}

          {workspace ? (
            <SurfaceSection>
              <SurfaceHeader
                title="Tasa de consolidación"
                description={`Usada en el dashboard para estimar el patrimonio ≈ en ${workspace.baseCurrency} cuando hay saldos ARS y USD.`}
              />
              <Suspense fallback={<ConsolidationRateSkeleton />}>
                <ConsolidationRateSection
                  workspace={workspace}
                  consolidationRate={consolidationRatePromise}
                  usdQuotes={usdQuotesPromise}
                />
              </Suspense>
            </SurfaceSection>
          ) : null}
        </div>
      ) : null}

      {activeTab === "categorias" ? (
        workspace ? (
          <Suspense fallback={<CategoriesSettingsSkeleton />}>
            <CategoriesSettingsSection
              workspace={workspace}
              canMutate={canMutateCategories}
              categories={categoriesPromise}
            />
          </Suspense>
        ) : (
          <SurfaceSection>
            <p className="text-sm text-muted-foreground">
              Necesitás un workspace activo para gestionar categorías.
            </p>
          </SurfaceSection>
        )
      ) : null}
    </ContentPanel>
  );
}

async function ConsolidationRateSection({
  workspace,
  consolidationRate,
  usdQuotes,
}: {
  workspace: ActiveWorkspaceContext;
  consolidationRate: Promise<ConsolidationRate>;
  usdQuotes: Promise<UsdQuotes>;
}) {
  const [rate, quotes] = await Promise.all([consolidationRate, usdQuotes]);

  return (
    <ConsolidationRateForm
      workspaceId={workspace.id}
      canMutate={workspace.role !== "viewer"}
      mepAvailable={Boolean(quotes?.available && quotes.mep)}
      mepSellArsPerUsd={quotes?.mep?.sellArsPerUsd ?? null}
      initial={
        rate
          ? {
              rateScaled: rate.rateScaled,
              scale: rate.scale,
              label: rate.label,
              asOf: rate.asOf,
            }
          : null
      }
    />
  );
}

async function CategoriesSettingsSection({
  workspace,
  canMutate,
  categories,
}: {
  workspace: ActiveWorkspaceContext;
  canMutate: boolean;
  categories: Promise<CategoriesResult>;
}) {
  const categoryList = await categories;

  return (
    <CategoriesSettingsPanel
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      canMutate={canMutate}
      categories={categoryList.map((c) => ({
        id: c.id,
        name: c.name,
        kind: c.kind,
        isArchived: c.isArchived,
      }))}
    />
  );
}

function ConsolidationRateSkeleton() {
  return (
    <div className="space-y-3" aria-busy aria-label="Cargando tasa">
      <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
      <Skeleton className="h-10 w-32 rounded-xl" />
    </div>
  );
}

function CategoriesSettingsSkeleton() {
  return (
    <SurfaceSection aria-busy aria-label="Cargando categorías">
      <Skeleton className="mb-4 h-10 w-48 rounded-xl" />
      <ul className="-mx-2 divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-center justify-between gap-3 px-2 py-3">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="size-10 shrink-0 rounded-xl" />
          </li>
        ))}
      </ul>
    </SurfaceSection>
  );
}
