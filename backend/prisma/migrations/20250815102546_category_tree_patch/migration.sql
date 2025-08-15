-- This is an empty migration.
-- Unique (user + parent + lower(name)) ignoring archived
CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_categories_user_parent_name
ON fin_categories (category_user_id, COALESCE(category_parent_id,0), lower(category_name))
WHERE NOT category_is_archived;

-- Helpful read index
CREATE INDEX IF NOT EXISTS idx_fin_categories_user_parent
  ON fin_categories (category_user_id, category_parent_id, category_sort_order);

-- Two-level rule
CREATE OR REPLACE FUNCTION fin_categories_enforce_two_levels()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  p_parent RECORD;
  has_kids BOOLEAN;
BEGIN
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

  IF NEW.category_parent_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM fin_categories WHERE category_parent_id = NEW.category_id
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
