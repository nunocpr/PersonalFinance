-- 1) Add columns for tree, ordering, and metadata
ALTER TABLE fin_categories
  ADD COLUMN IF NOT EXISTS category_parent_id  INTEGER,
  ADD COLUMN IF NOT EXISTS category_sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category_icon       VARCHAR(64),
  ADD COLUMN IF NOT EXISTS category_color      VARCHAR(7),
  ADD COLUMN IF NOT EXISTS category_is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- optional (if you want a category type); comment this block if you don't want it yet
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'category_kind') THEN
    CREATE TYPE category_kind AS ENUM ('expense','income','transfer');
  END IF;
END$$;

ALTER TABLE fin_categories
  ADD COLUMN IF NOT EXISTS category_type category_kind NOT NULL DEFAULT 'expense';

-- 2) FK to self (parent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fin_categories_parent_fk'
  ) THEN
    ALTER TABLE fin_categories
      ADD CONSTRAINT fin_categories_parent_fk
      FOREIGN KEY (category_parent_id)
      REFERENCES fin_categories(category_id)
      ON DELETE RESTRICT;
  END IF;
END$$;

-- 3) Drop old unique if it exists (user + name)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'fin_categories'::regclass
      AND conname = 'fin_categories_category_user_id_category_name_key'
  ) THEN
    ALTER TABLE fin_categories
      DROP CONSTRAINT fin_categories_category_user_id_category_name_key;
  END IF;
END$$;

-- 4) NEW unique index: user + parent + lower(name), ignoring archived
--    COALESCE(parent_id,0) allows uniqueness when parent is NULL
CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_categories_user_parent_name
ON fin_categories (category_user_id, COALESCE(category_parent_id,0), lower(category_name))
WHERE NOT category_is_archived;

-- Useful read indexes
CREATE INDEX IF NOT EXISTS idx_fin_categories_user_parent
  ON fin_categories (category_user_id, category_parent_id, category_sort_order);

-- 5) Enforce TWO levels only with a trigger
CREATE OR REPLACE FUNCTION fin_categories_enforce_two_levels()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  p_parent RECORD;
  has_kids BOOLEAN;
BEGIN
  -- If child, parent must exist, same user, and be a ROOT (no grandparent)
  IF NEW.category_parent_id IS NOT NULL THEN
    SELECT category_user_id, category_parent_id
      INTO p_parent
    FROM fin_categories
    WHERE category_id = NEW.category_parent_id
    FOR UPDATE;

    IF p_parent IS NULL THEN
      RAISE EXCEPTION 'Parent category % does not exist', NEW.category_parent_id;
    END IF;
    IF p_parent.category_user_id <> NEW.category_user_id THEN
      RAISE EXCEPTION 'Parent/user mismatch';
    END IF;
    IF p_parent.category_parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Only two levels allowed (parent already has a parent)';
    END IF;
  END IF;

  -- If setting a parent on a category that already HAS children => would create grandchildren
  IF NEW.category_parent_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM fin_categories
      WHERE category_parent_id = NEW.category_id
    ) INTO has_kids;
    IF has_kids THEN
      RAISE EXCEPTION 'Cannot make a parent into a child while it has children (two-level tree)';
    END IF;
  END IF;

  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_fin_categories_enforce ON fin_categories;
CREATE TRIGGER trg_fin_categories_enforce
BEFORE INSERT OR UPDATE ON fin_categories
FOR EACH ROW EXECUTE FUNCTION fin_categories_enforce_two_levels();
