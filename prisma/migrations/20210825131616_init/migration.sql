-- CreateTable
CREATE TABLE "Todo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "info" TEXT NOT NULL,
    "editing" BOOLEAN NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Todo.name_unique" ON "Todo"("name");
