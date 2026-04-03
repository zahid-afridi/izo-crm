-- Migration to add createdBy and createdByRole fields to Order table
-- Run this SQL script in your database to add the missing fields

ALTER TABLE "Order" 
ADD COLUMN "createdBy" TEXT,
ADD COLUMN "createdByRole" TEXT;

-- Create indexes for the new fields
CREATE INDEX "Order_createdBy_idx" ON "Order"("createdBy");
CREATE INDEX "Order_createdByRole_idx" ON "Order"("createdByRole");

-- Update existing orders with default values (optional)
-- UPDATE "Order" SET "createdBy" = 'system', "createdByRole" = 'sales_agent' WHERE "createdBy" IS NULL;