ALTER TABLE construction_projects
  ADD COLUMN IF NOT EXISTS total_construction_area numeric(12,2),
  ADD COLUMN IF NOT EXISTS total_saleable_area numeric(12,2);
