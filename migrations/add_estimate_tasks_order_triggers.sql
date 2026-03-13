-- Keep estimates.tasks_order in sync with estimate_tasks inserts/deletes

-- ***** NOT IMPLEMENTED IN SUPABASE - MAYBE NOT NECESSARY? *****
-- ***** NOT IMPLEMENTED IN SUPABASE - MAYBE NOT NECESSARY? *****
-- ***** NOT IMPLEMENTED IN SUPABASE - MAYBE NOT NECESSARY? *****

-- Function: append new task id to estimate.tasks_order
CREATE OR REPLACE FUNCTION public.add_task_to_estimates_tasks_order()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE estimates
  SET tasks_order = CASE
    WHEN tasks_order IS NULL THEN ARRAY[NEW.est_task_id]::bigint[]
    WHEN array_position(tasks_order, NEW.est_task_id) IS NULL THEN tasks_order || NEW.est_task_id
    ELSE tasks_order
  END
  WHERE estimate_id = NEW.estimate_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fires after inserting into estimate_tasks
DROP TRIGGER IF EXISTS add_task_to_estimates_tasks_order_trigger ON estimate_tasks;
CREATE TRIGGER add_task_to_estimates_tasks_order_trigger
AFTER INSERT ON estimate_tasks
FOR EACH ROW
EXECUTE FUNCTION public.add_task_to_estimates_tasks_order();

-- Function: remove deleted task id from estimate.tasks_order
CREATE OR REPLACE FUNCTION public.remove_task_from_estimates_tasks_order()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE estimates
  SET tasks_order = array_remove(tasks_order, OLD.est_task_id)
  WHERE estimate_id = OLD.estimate_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fires after deleting from estimate_tasks
DROP TRIGGER IF EXISTS remove_task_from_estimates_tasks_order_trigger ON estimate_tasks;
CREATE TRIGGER remove_task_from_estimates_tasks_order_trigger
AFTER DELETE ON estimate_tasks
FOR EACH ROW
EXECUTE FUNCTION public.remove_task_from_estimates_tasks_order();


-- ***** NOT IMPLEMENTED IN SUPABASE - MAYBE NOT NECESSARY? *****
-- ***** NOT IMPLEMENTED IN SUPABASE - MAYBE NOT NECESSARY? *****
-- ***** NOT IMPLEMENTED IN SUPABASE - MAYBE NOT NECESSARY? *****