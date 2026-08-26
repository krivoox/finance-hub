"use client";

import { useState } from "react";

import { FormSheet } from "@/components/form-sheet";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { EditSplitMemberForm } from "./edit-split-member-form";
import { RemoveSplitMemberDialog } from "./remove-split-member-dialog";
import { SplitOverflowMenu } from "./split-overflow-menu";

export function SplitMemberActions({
  splitGroupId,
  memberId,
  displayName,
  isSelf,
  canRename,
  canRemove,
}: {
  splitGroupId: string;
  memberId: string;
  displayName: string;
  isSelf: boolean;
  canRename: boolean;
  canRemove: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  if (!canRename && !canRemove) return null;

  return (
    <>
      <SplitOverflowMenu label={`Acciones de ${displayName}`}>
        {canRename ? (
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            Editar nombre
          </DropdownMenuItem>
        ) : null}
        {canRename && canRemove ? <DropdownMenuSeparator /> : null}
        {canRemove ? (
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setRemoveOpen(true)}
          >
            {isSelf ? "Salir del grupo" : "Sacar"}
          </DropdownMenuItem>
        ) : null}
      </SplitOverflowMenu>

      <FormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Editar nombre"
        description="Así aparece esta persona en el grupo."
        size="md"
      >
        <EditSplitMemberForm
          splitGroupId={splitGroupId}
          memberId={memberId}
          displayName={displayName}
          onSuccess={() => setEditOpen(false)}
          onCancel={() => setEditOpen(false)}
        />
      </FormSheet>

      <RemoveSplitMemberDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        splitGroupId={splitGroupId}
        memberId={memberId}
        displayName={displayName}
        isSelf={isSelf}
      />
    </>
  );
}
