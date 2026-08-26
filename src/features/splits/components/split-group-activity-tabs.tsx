"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SplitGroupActivityTabsProps = {
  ledger: ReactNode;
  categories: ReactNode;
};

export function SplitGroupActivityTabs({
  ledger,
  categories,
}: SplitGroupActivityTabsProps) {
  return (
    <Tabs defaultValue="ledger" className="gap-3">
      <TabsList variant="line" className="w-full justify-start sm:w-auto">
        <TabsTrigger value="ledger">Movimientos</TabsTrigger>
        <TabsTrigger value="categories">Gastos por categoría</TabsTrigger>
      </TabsList>
      <TabsContent value="ledger" className="mt-0">
        {ledger}
      </TabsContent>
      <TabsContent value="categories" className="mt-0">
        {categories}
      </TabsContent>
    </Tabs>
  );
}
