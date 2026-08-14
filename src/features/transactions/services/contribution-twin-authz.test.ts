import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "@/features/workspaces/domain";

vi.mock("server-only", () => ({}));

const { prismaMock, requireMembership, txA, txB, linkRow } = vi.hoisted(() => {
  const occurredOn = new Date("2026-01-15T00:00:00.000Z");
  const timestamps = {
    createdAt: occurredOn,
    updatedAt: occurredOn,
  };
  const txA = {
    id: "tx-a",
    workspaceId: "ws-a",
    type: "expense" as const,
    amountCents: 10_000,
    currency: "ARS",
    occurredOn,
    description: "Aporte a Casa",
    categoryId: "cat-a",
    accountId: "acc-a",
    counterpartyAccountId: null,
    createdByUserId: "user-1",
    ...timestamps,
  };
  const txB = {
    id: "tx-b",
    workspaceId: "ws-b",
    type: "income" as const,
    amountCents: 10_000,
    currency: "ARS",
    occurredOn,
    description: "Aporte a Casa",
    categoryId: "cat-b",
    accountId: "acc-b",
    counterpartyAccountId: null,
    createdByUserId: "user-1",
    ...timestamps,
  };
  const linkRow = {
    id: "link-1",
    sourceTransactionId: "tx-a",
    targetTransactionId: "tx-b",
  };

  const prismaMock = {
    transaction: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
    },
    goalContribution: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    currencyExchange: {
      findFirst: vi.fn(),
    },
    crossWorkspaceLink: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    financeAccount: {
      findMany: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return {
    prismaMock,
    requireMembership: vi.fn(),
    txA,
    txB,
    linkRow,
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/features/workspaces/services", () => ({ requireMembership }));

import { deleteTransaction } from "./delete-transaction";
import { updateTransaction } from "./update-transaction";

function stubLinkedContribution(opts?: { twinRole?: string | null }) {
  const twinRole = opts?.twinRole === undefined ? null : opts.twinRole;

  requireMembership.mockResolvedValue({
    userId: "user-1",
    workspaceId: "ws-a",
    role: "owner",
  });

  prismaMock.transaction.findUnique.mockImplementation(
    async ({ where }: { where: { id: string } }) => {
      if (where.id === "tx-a") return txA;
      if (where.id === "tx-b") return txB;
      return null;
    },
  );

  prismaMock.crossWorkspaceLink.findFirst.mockResolvedValue(linkRow);
  prismaMock.membership.findUnique.mockResolvedValue(
    twinRole === null ? null : { role: twinRole },
  );
  prismaMock.goalContribution.findUnique.mockResolvedValue(null);
  prismaMock.currencyExchange.findFirst.mockResolvedValue(null);
  prismaMock.financeAccount.findMany.mockResolvedValue([
    {
      id: "acc-a",
      workspaceId: "ws-a",
      currency: "ARS",
      isArchived: false,
    },
  ]);
  prismaMock.category.findUnique.mockResolvedValue({
    id: "cat-a",
    workspaceId: "ws-a",
    kind: "expense",
    isArchived: false,
  });
}

describe("contribution twin authz (SPEC-14 T-06 / T-07 / KRI-19)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateTransaction", () => {
    it("Given no membership in B, When editing A's linked tx, Then Forbidden and B is unchanged", async () => {
      stubLinkedContribution({ twinRole: null });

      await expect(
        updateTransaction({
          userId: "user-1",
          transactionId: "tx-a",
          amountCents: 12_000,
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.transaction.update).not.toHaveBeenCalled();
    });

    it("Given viewer membership in B, When editing A's linked tx, Then Forbidden and B is unchanged", async () => {
      stubLinkedContribution({ twinRole: "viewer" });

      await expect(
        updateTransaction({
          userId: "user-1",
          transactionId: "tx-a",
          amountCents: 12_000,
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.transaction.update).not.toHaveBeenCalled();
    });

    it("Given membership in both workspaces, When editing A, Then twin B is updated in the same $transaction", async () => {
      stubLinkedContribution({ twinRole: "member" });

      const txClient = {
        transaction: {
          update: vi.fn().mockResolvedValue(txA),
        },
        goalContribution: {
          update: vi.fn(),
        },
      };
      prismaMock.$transaction.mockImplementation(
        async (fn: (tx: typeof txClient) => Promise<unknown>) => fn(txClient),
      );

      await updateTransaction({
        userId: "user-1",
        transactionId: "tx-a",
        amountCents: 12_000,
      });

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.transaction.update).not.toHaveBeenCalled();
      expect(txClient.transaction.update).toHaveBeenCalledTimes(2);
      expect(txClient.transaction.update).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { id: "tx-b" },
          data: expect.objectContaining({ amountCents: 12_000 }),
        }),
      );
    });
  });

  describe("deleteTransaction", () => {
    it("Given no membership in B, When deleting A's linked tx, Then Forbidden and B is not cascade-deleted", async () => {
      stubLinkedContribution({ twinRole: null });

      await expect(
        deleteTransaction({ userId: "user-1", transactionId: "tx-a" }),
      ).rejects.toBeInstanceOf(ForbiddenError);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.transaction.delete).not.toHaveBeenCalled();
      expect(prismaMock.transaction.deleteMany).not.toHaveBeenCalled();
      expect(prismaMock.crossWorkspaceLink.delete).not.toHaveBeenCalled();
    });

    it("Given viewer membership in B, When deleting A's linked tx, Then Forbidden and B is not cascade-deleted", async () => {
      stubLinkedContribution({ twinRole: "viewer" });

      await expect(
        deleteTransaction({ userId: "user-1", transactionId: "tx-a" }),
      ).rejects.toBeInstanceOf(ForbiddenError);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.transaction.deleteMany).not.toHaveBeenCalled();
    });

    it("Given membership in both workspaces, When deleting A, Then cascade-deletes B in the same $transaction", async () => {
      stubLinkedContribution({ twinRole: "owner" });

      const txClient = {
        crossWorkspaceLink: { delete: vi.fn() },
        transaction: { deleteMany: vi.fn() },
      };
      prismaMock.$transaction.mockImplementation(
        async (fn: (tx: typeof txClient) => Promise<unknown>) => fn(txClient),
      );

      const result = await deleteTransaction({
        userId: "user-1",
        transactionId: "tx-a",
      });

      expect(result).toEqual({ id: "tx-a", cascadedIds: ["tx-b"] });
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(txClient.crossWorkspaceLink.delete).toHaveBeenCalledWith({
        where: { id: "link-1" },
      });
      expect(txClient.transaction.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["tx-a", "tx-b"] } },
      });
    });
  });
});
