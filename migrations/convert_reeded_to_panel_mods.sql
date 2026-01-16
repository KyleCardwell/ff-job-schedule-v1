-- Migration: Convert reeded panel booleans to panel_mod_id bigint columns
-- Uses sentinel values: NULL = use parent default, 0 = explicit "none", 15/22/etc = parts_list IDs
-- No foreign key constraint to allow 0 as sentinel value

-- Step 0: Drop estimate_full_details view (depends on columns we're modifying)
DROP VIEW IF EXISTS public.estimate_full_details;

-- Step 1: Add new bigint columns for panel mods
ALTER TABLE estimate_sections
ADD COLUMN door_panel_mod_id bigint,
ADD COLUMN drawer_panel_mod_id bigint;

-- Step 2: Migrate existing boolean data to new columns
-- true -> 15 (panel_mod_reeded_finished), false -> 0 (none), null -> NULL (use default)
UPDATE estimate_sections
SET door_panel_mod_id = CASE
  WHEN door_reeded_panel = true THEN 15
  WHEN door_reeded_panel = false THEN 0
  ELSE NULL
END,
drawer_panel_mod_id = CASE
  WHEN drawer_reeded_panel = true THEN 15
  WHEN drawer_reeded_panel = false THEN 0
  ELSE NULL
END;

-- Step 3: Drop old boolean columns
ALTER TABLE estimate_sections
DROP COLUMN door_reeded_panel,
DROP COLUMN drawer_reeded_panel;

-- Step 4: Add new bigint columns for estimates table
ALTER TABLE estimates
ADD COLUMN default_door_panel_mod_id bigint,
ADD COLUMN default_drawer_panel_mod_id bigint;

-- Step 5: Migrate existing boolean data in estimates table
UPDATE estimates
SET default_door_panel_mod_id = CASE
  WHEN default_door_reeded_panel = true THEN 15
  WHEN default_door_reeded_panel = false THEN 0
  ELSE NULL
END,
default_drawer_panel_mod_id = CASE
  WHEN default_drawer_reeded_panel = true THEN 15
  WHEN default_drawer_reeded_panel = false THEN 0
  ELSE NULL
END;

-- Step 6: Drop old boolean columns from estimates
ALTER TABLE estimates
DROP COLUMN default_door_reeded_panel,
DROP COLUMN default_drawer_reeded_panel;

-- Step 7: Add new bigint columns for teams table (default to 0 = "none")
ALTER TABLE teams
ADD COLUMN default_door_panel_mod_id bigint NOT NULL DEFAULT 0,
ADD COLUMN default_drawer_panel_mod_id bigint NOT NULL DEFAULT 0;

-- Step 8: Migrate existing boolean data in teams table
UPDATE teams
SET default_door_panel_mod_id = CASE
  WHEN default_door_reeded_panel = true THEN 15
  ELSE 0
END,
default_drawer_panel_mod_id = CASE
  WHEN default_drawer_reeded_panel = true THEN 15
  ELSE 0
END;

-- Step 9: Drop old boolean columns from teams
ALTER TABLE teams
DROP COLUMN default_door_reeded_panel,
DROP COLUMN default_drawer_reeded_panel;

-- Note: No foreign key constraints to allow 0 as sentinel value
-- Application code validates that non-zero values exist in parts_list

-- Step 10: Recreate estimate_full_details view with new panel_mod_id columns
CREATE VIEW public.estimate_full_details
WITH (security_invoker = true) AS
SELECT 
    e.estimate_id,
    e.est_project_id,
    e.status,
    e.is_current,
    e.created_at AS estimate_created_at,
    e.updated_at AS estimate_updated_at,
    e.tasks_order,

    -- Estimate default columns (nullable)
    e.default_cabinet_style_id,
    e.default_box_mat,
    e.default_face_mat,
    e.default_drawer_box_mat,
    e.default_hinge_id,
    e.default_slide_id,
    e.default_door_pull_id,
    e.default_drawer_pull_id,
    e.default_face_finish,
    e.default_box_finish,
    e.default_door_inside_molding,
    e.default_door_outside_molding,
    e.default_drawer_inside_molding,
    e.default_drawer_outside_molding,
    e.default_door_panel_mod_id,
    e.default_drawer_panel_mod_id,
    e.default_door_style,
    e.default_drawer_front_style,

    -- Estimate pricing defaults
    e.default_profit,
    e.default_commission,
    e.default_discount,

    -- Line items
    e.line_items,

    --custom notes
    e.custom_notes,

    e.default_service_price_overrides,
    e.parts_included,
    e.services_included,

    ep.est_project_name,
    ep.est_client_name,
    ep.team_id,
    ep.street,
    ep.state,
    ep.city,
    ep.zip,

    t.team_name,

    (
        SELECT json_agg(
            json_build_object(
                'task', et.*,
                'sections', (
                    SELECT json_agg(
                        jsonb_set(
                            jsonb_set(
                                jsonb_set(
                                    jsonb_set(
                                        to_jsonb(es.*),
                                        '{cabinets}',
                                        (
                                            SELECT COALESCE(
                                                json_agg(
                                                    jsonb_set(
                                                        to_jsonb(ec.*),
                                                        '{accessories}',
                                                        (
                                                            SELECT COALESCE(json_agg(to_jsonb(eca.*)), '[]'::json)::jsonb
                                                            FROM estimate_accessories eca
                                                            WHERE eca.est_cabinet_id = ec.id
                                                        )
                                                    )
                                                    ORDER BY COALESCE(array_position(es.cabinets_order, ec.id), 99999), ec.id
                                                ),
                                                '[]'::json
                                            )::jsonb
                                            FROM estimate_cabinets ec
                                            WHERE ec.est_section_id = es.est_section_id
                                        )
                                    ),
                                    '{lengths}',
                                    (
                                        SELECT COALESCE(json_agg(to_jsonb(el.*) ORDER BY COALESCE(array_position(es.lengths_order, el.id), 99999), el.id), '[]'::json)::jsonb
                                        FROM estimate_lengths el
                                        WHERE el.est_section_id = es.est_section_id
                                    )
                                ),
                                '{accessories}',
                                (
                                    SELECT COALESCE(json_agg(to_jsonb(ea.*) ORDER BY COALESCE(array_position(es.accessories_order, ea.id), 99999), ea.id), '[]'::json)::jsonb
                                    FROM estimate_accessories ea
                                    WHERE ea.est_section_id = es.est_section_id
                                    AND ea.est_cabinet_id IS NULL  -- Only section-level accessories (standalone)
                                )
                            ),
                            '{other}',
                            (
                                SELECT COALESCE(json_agg(to_jsonb(eo.*) ORDER BY COALESCE(array_position(es.other_order, eo.id), 99999), eo.id), '[]'::json)::jsonb
                                FROM estimate_other eo
                                WHERE eo.est_section_id = es.est_section_id
                            )
                        )
                        ORDER BY COALESCE(array_position(et.sections_order, es.est_section_id), 99999), es.est_section_id
                    )
                    FROM estimate_sections es
                    WHERE es.est_task_id = et.est_task_id
                )
            )
            ORDER BY COALESCE(array_position(e.tasks_order, et.est_task_id), 99999), et.est_task_id
        )
        FROM estimate_tasks et
        WHERE et.estimate_id = e.estimate_id
    ) AS tasks
    
FROM estimates e
LEFT JOIN estimate_projects ep ON e.est_project_id = ep.est_project_id
LEFT JOIN teams t ON ep.team_id = t.team_id;

COMMENT ON VIEW public.estimate_full_details IS 'Full estimate details with tasks, sections, cabinets, and all related data. Includes estimate-level defaults and pricing (profit, commission, discount).';
