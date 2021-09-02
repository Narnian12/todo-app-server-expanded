-- CreateTable
CREATE TABLE "Todo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "editing" BOOLEAN NOT NULL,
    "complete" BOOLEAN NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Todo.id_unique" ON "Todo"("id");
