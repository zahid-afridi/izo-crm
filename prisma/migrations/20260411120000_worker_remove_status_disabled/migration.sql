-- Rename employment status value: removed → disabled (Worker.removeStatus)
UPDATE "Worker" SET "removeStatus" = 'disabled' WHERE "removeStatus" = 'removed';
