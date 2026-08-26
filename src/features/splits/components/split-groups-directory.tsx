"use client";

import { useState } from "react";

import { FormSheet } from "@/components/form-sheet";
import { SurfaceSection } from "@/components/surface-section";
import type { ListedSplitGroup } from "@/features/splits/services";
import { DeleteSplitGroupDialog } from "./delete-split-group-dialog";
import { EditSplitGroupForm } from "./edit-split-group-form";
import { SplitGroupCard } from "./split-group-card";
import { SplitGroupsEmpty } from "./split-groups-empty";

type GroupTarget = {
  id: string;
  name: string;
};

export function SplitGroupsDirectory({
  groups,
}: {
  groups: readonly ListedSplitGroup[];
}) {
  const [editTarget, setEditTarget] = useState<GroupTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroupTarget | null>(null);

  if (groups.length === 0) {
    return <SplitGroupsEmpty />;
  }

  return (
    <>
      <SurfaceSection aria-label="Tus grupos">
        <ul className="-mx-2 divide-y divide-border">
          {groups.map((group) => (
            <li key={group.id} className="min-w-0">
              <SplitGroupCard
                group={group}
                onEdit={
                  group.isCreator
                    ? () => setEditTarget({ id: group.id, name: group.name })
                    : undefined
                }
                onDelete={
                  group.isCreator
                    ? () => setDeleteTarget({ id: group.id, name: group.name })
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      </SurfaceSection>

      <FormSheet
        open={editTarget != null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        title="Editar grupo"
        description="Cambiá el nombre. El círculo sigue siendo el mismo."
        size="md"
      >
        {editTarget ? (
          <EditSplitGroupForm
            key={editTarget.id}
            splitGroupId={editTarget.id}
            name={editTarget.name}
            onSuccess={() => setEditTarget(null)}
            onCancel={() => setEditTarget(null)}
          />
        ) : null}
      </FormSheet>

      {deleteTarget ? (
        <DeleteSplitGroupDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          splitGroupId={deleteTarget.id}
          name={deleteTarget.name}
        />
      ) : null}
    </>
  );
}
