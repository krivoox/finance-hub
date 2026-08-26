"use client";

import { useState } from "react";

import { FormSheet } from "@/components/form-sheet";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { DeleteSplitGroupDialog } from "./delete-split-group-dialog";
import { EditSplitGroupForm } from "./edit-split-group-form";
import { SplitOverflowMenu } from "./split-overflow-menu";

export function SplitGroupDetailActions({
  splitGroupId,
  name,
}: {
  splitGroupId: string;
  name: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <SplitOverflowMenu label={`Acciones de ${name}`}>
        <DropdownMenuItem onSelect={() => setEditOpen(true)}>
          Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => setDeleteOpen(true)}
        >
          Eliminar
        </DropdownMenuItem>
      </SplitOverflowMenu>

      <FormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Editar grupo"
        description="Cambiá el nombre. El círculo sigue siendo el mismo."
        size="md"
      >
        <EditSplitGroupForm
          splitGroupId={splitGroupId}
          name={name}
          onSuccess={() => setEditOpen(false)}
          onCancel={() => setEditOpen(false)}
        />
      </FormSheet>

      <DeleteSplitGroupDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        splitGroupId={splitGroupId}
        name={name}
        redirectToDirectory
      />
    </>
  );
}
