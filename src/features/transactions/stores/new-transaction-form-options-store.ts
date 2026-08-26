"use client";

import { create } from "zustand";

import {
  getNewTransactionFormOptionsAction,
  type NewTransactionFormOptions,
} from "../actions/get-new-transaction-form-options";

/**
 * Session cache of create-sheet catalogs (accounts, categories, split groups).
 * Not money: names/ids only. Survives sheet close and transaction submit.
 * Refetch on open (stale-while-revalidate); prefetch on shell mount / intent.
 */
type FormOptionsState = {
  byWorkspaceId: Record<string, NewTransactionFormOptions>;
  loadingWorkspaceId: string | null;
  error: string | null;
};

export const useNewTransactionFormOptionsStore = create<FormOptionsState>(
  () => ({
    byWorkspaceId: {},
    loadingWorkspaceId: null,
    error: null,
  }),
);

const inflight = new Map<
  string,
  Promise<NewTransactionFormOptions | null>
>();

let lastWorkspaceId: string | null = null;

function fetchOptions(
  workspaceId: string,
): Promise<NewTransactionFormOptions | null> {
  const pending = inflight.get(workspaceId);
  if (pending) return pending;

  const promise = getNewTransactionFormOptionsAction()
    .then((result) => {
      if (!result.ok) {
        useNewTransactionFormOptionsStore.setState({
          error: result.error,
          loadingWorkspaceId: null,
        });
        return null;
      }
      const id = result.data.workspaceId;
      useNewTransactionFormOptionsStore.setState((state) => ({
        error: null,
        loadingWorkspaceId:
          state.loadingWorkspaceId === workspaceId
            ? null
            : state.loadingWorkspaceId,
        byWorkspaceId: {
          ...state.byWorkspaceId,
          [id]: result.data,
        },
      }));
      return result.data;
    })
    .catch(() => {
      useNewTransactionFormOptionsStore.setState({
        error: "No se pudieron cargar cuentas y categorías.",
        loadingWorkspaceId: null,
      });
      return null;
    })
    .finally(() => {
      inflight.delete(workspaceId);
    });

  inflight.set(workspaceId, promise);
  return promise;
}

/** Warm the cache without a loading skeleton (idle / hover / focus). */
export function prefetchNewTransactionFormOptions(workspaceId: string): void {
  lastWorkspaceId = workspaceId;
  const cached =
    useNewTransactionFormOptionsStore.getState().byWorkspaceId[workspaceId];
  if (cached || inflight.has(workspaceId)) return;
  void fetchOptions(workspaceId);
}

/** Open path: show cache immediately, always refresh in the background. */
export function refreshNewTransactionFormOptions(
  workspaceId: string,
): Promise<NewTransactionFormOptions | null> {
  lastWorkspaceId = workspaceId;
  const cached =
    useNewTransactionFormOptionsStore.getState().byWorkspaceId[workspaceId];
  if (!cached) {
    useNewTransactionFormOptionsStore.setState({
      loadingWorkspaceId: workspaceId,
      error: null,
    });
  }
  return fetchOptions(workspaceId);
}

/**
 * After account/category/split-group mutations: refetch without wiping.
 * Keeps the last catalog on screen (stale-while-revalidate).
 */
export function invalidateNewTransactionFormOptions(
  workspaceId?: string,
): void {
  const id = workspaceId ?? lastWorkspaceId;
  if (!id) return;
  void fetchOptions(id);
}

/** Intent prefetch (hover / focus / touch) — same idea as nav prefetch. */
export function formOptionsIntentPrefetchHandlers() {
  const prefetch = () => {
    if (lastWorkspaceId) prefetchNewTransactionFormOptions(lastWorkspaceId);
  };
  return {
    onPointerEnter: prefetch,
    onFocus: prefetch,
    onTouchStart: prefetch,
  };
}
