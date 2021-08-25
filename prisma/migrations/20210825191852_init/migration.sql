/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `Todo` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Todo.name_unique";

-- CreateIndex
CREATE UNIQUE INDEX "Todo.id_unique" ON "Todo"("id");
