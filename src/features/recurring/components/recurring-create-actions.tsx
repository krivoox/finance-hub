"use client";

import { useState, type ReactNode } from "react";

import type { UsdQuotesDto } from "@/features/fx-quotes/types";

import { NewFromTemplateSheet } from "./new-from-template-sheet";
import { NewRecurringSheet } from "./new-recurring-sheet";
import type { AccountOption, CategoryOption } from "./recurring-form";

type SharedProps = {
  workspaceId: string;
  workspaceCurrency: string;
  accounts: readonly AccountOption[];
  categories: readonly CategoryOption[];
  quotes: UsdQuotesDto | null;
};

type RecurringCreateActionsProps = SharedProps;

/**
 * Header CTAs for /transactions/recurring: blank rule + platform template wizard.
 */
export function RecurringCreateActions({
  workspaceId,
  workspaceCurrency,
  accounts,
  categories,
  quotes,
}: RecurringCreateActionsProps) {
  const [blankOpen, setBlankOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <NewRecurringSheet
        workspaceId={workspaceId}
        workspaceCurrency={workspaceCurrency}
        accounts={accounts}
        categories={categories}
        open={blankOpen}
        onOpenChange={setBlankOpen}
      />
      <NewFromTemplateSheet
        workspaceId={workspaceId}
        accounts={accounts}
        categories={categories}
        quotes={quotes}
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        onStartBlank={() => {
          setTemplateOpen(false);
          setBlankOpen(true);
        }}
      />
    </div>
  );
}

type RecurringTemplatesEmptyProps = SharedProps & {
  children?: ReactNode;
};

/**
 * Empty-state CTA that opens the platform gallery (and can hand off to blank form).
 */
export function RecurringTemplatesEmptyCta({
  workspaceId,
  workspaceCurrency,
  accounts,
  categories,
  quotes,
}: RecurringTemplatesEmptyProps) {
  const [blankOpen, setBlankOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  return (
    <>
      <NewRecurringSheet
        workspaceId={workspaceId}
        workspaceCurrency={workspaceCurrency}
        accounts={accounts}
        categories={categories}
        open={blankOpen}
        onOpenChange={setBlankOpen}
        showTrigger={false}
      />
      <NewFromTemplateSheet
        workspaceId={workspaceId}
        accounts={accounts}
        categories={categories}
        quotes={quotes}
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        onStartBlank={() => {
          setTemplateOpen(false);
          setBlankOpen(true);
        }}
        showDefaultTrigger={false}
        trigger={
          <button
            type="button"
            className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            Empezar desde una plantilla
          </button>
        }
      />
    </>
  );
}
