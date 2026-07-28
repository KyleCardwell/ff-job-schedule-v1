-- Add independent pre-wire-brushed defaults and estimate-level pricing.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS pre_wire_brushed_sheet_upcharge numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_box_pre_wire_brushed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_face_pre_wire_brushed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_door_pre_wire_brushed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_drawer_front_pre_wire_brushed boolean NOT NULL DEFAULT false;

ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS pre_wire_brushed_sheet_upcharge numeric,
  ADD COLUMN IF NOT EXISTS frozen_pre_wire_brushed_sheet_upcharge numeric,
  ADD COLUMN IF NOT EXISTS default_box_pre_wire_brushed boolean,
  ADD COLUMN IF NOT EXISTS default_face_pre_wire_brushed boolean,
  ADD COLUMN IF NOT EXISTS default_door_pre_wire_brushed boolean,
  ADD COLUMN IF NOT EXISTS default_drawer_front_pre_wire_brushed boolean;

ALTER TABLE public.estimate_sections
  ADD COLUMN IF NOT EXISTS box_pre_wire_brushed boolean,
  ADD COLUMN IF NOT EXISTS face_pre_wire_brushed boolean,
  ADD COLUMN IF NOT EXISTS door_pre_wire_brushed boolean,
  ADD COLUMN IF NOT EXISTS drawer_front_pre_wire_brushed boolean;

ALTER TABLE public.teams
  ADD CONSTRAINT teams_pre_wire_brushed_sheet_upcharge_nonnegative
  CHECK (pre_wire_brushed_sheet_upcharge >= 0);

ALTER TABLE public.estimates
  ADD CONSTRAINT estimates_pre_wire_brushed_sheet_upcharge_nonnegative
  CHECK (pre_wire_brushed_sheet_upcharge IS NULL OR pre_wire_brushed_sheet_upcharge >= 0),
  ADD CONSTRAINT estimates_frozen_pre_wire_brushed_sheet_upcharge_nonnegative
  CHECK (
    frozen_pre_wire_brushed_sheet_upcharge IS NULL
    OR frozen_pre_wire_brushed_sheet_upcharge >= 0
  );

COMMENT ON COLUMN public.teams.pre_wire_brushed_sheet_upcharge IS
  'Team default flat upcharge applied to each pre-wire-brushed sheet.';
COMMENT ON COLUMN public.estimates.pre_wire_brushed_sheet_upcharge IS
  'Optional estimate override; NULL uses the team sheet upcharge.';
COMMENT ON COLUMN public.estimates.frozen_pre_wire_brushed_sheet_upcharge IS
  'Effective sheet upcharge captured when the estimate is finalized.';

-- Recreate the view so its estimate row exposes the new columns. Section JSON
-- uses es.* and therefore includes the new section-level fields as well.
DROP VIEW IF EXISTS public.estimate_full_details;

CREATE VIEW public.estimate_full_details
WITH (security_invoker = true) AS
SELECT
  e.estimate_id,
  e.est_project_id,
  e.status,
  e.version,
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
  e.default_include_door_pulls,
  e.default_include_drawer_pulls,
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
  e.default_horizontal_grain,

  -- Pre-wire-brushed defaults and pricing
  e.default_box_pre_wire_brushed,
  e.default_face_pre_wire_brushed,
  e.default_door_pre_wire_brushed,
  e.default_drawer_front_pre_wire_brushed,
  e.pre_wire_brushed_sheet_upcharge,
  e.frozen_pre_wire_brushed_sheet_upcharge,

  -- Estimate pricing defaults
  e.default_profit,
  e.default_commission,
  e.default_discount,

  -- Estimate content and status
  e.line_items,
  e.custom_notes,
  e.default_service_price_overrides,
  e.parts_included,
  e.services_included,
  e.finalized_on,
  e.archived_at,
  e.price_overrides,

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
                              SELECT COALESCE(
                                json_agg(to_jsonb(eca.*)),
                                '[]'::json
                              )::jsonb
                              FROM estimate_accessories eca
                              WHERE eca.est_cabinet_id = ec.id
                            )
                          )
                          ORDER BY COALESCE(
                            array_position(es.cabinets_order, ec.id),
                            99999
                          ), ec.id
                        ),
                        '[]'::json
                      )::jsonb
                      FROM estimate_cabinets ec
                      WHERE ec.est_section_id = es.est_section_id
                    )
                  ),
                  '{lengths}',
                  (
                    SELECT COALESCE(
                      json_agg(
                        to_jsonb(el.*)
                        ORDER BY COALESCE(
                          array_position(es.lengths_order, el.id),
                          99999
                        ), el.id
                      ),
                      '[]'::json
                    )::jsonb
                    FROM estimate_lengths el
                    WHERE el.est_section_id = es.est_section_id
                  )
                ),
                '{accessories}',
                (
                  SELECT COALESCE(
                    json_agg(
                      to_jsonb(ea.*)
                      ORDER BY COALESCE(
                        array_position(es.accessories_order, ea.id),
                        99999
                      ), ea.id
                    ),
                    '[]'::json
                  )::jsonb
                  FROM estimate_accessories ea
                  WHERE ea.est_section_id = es.est_section_id
                    AND ea.est_cabinet_id IS NULL
                )
              ),
              '{other}',
              (
                SELECT COALESCE(
                  json_agg(
                    to_jsonb(eo.*)
                    ORDER BY COALESCE(
                      array_position(es.other_order, eo.id),
                      99999
                    ), eo.id
                  ),
                  '[]'::json
                )::jsonb
                FROM estimate_other eo
                WHERE eo.est_section_id = es.est_section_id
              )
            )
            ORDER BY COALESCE(
              array_position(et.sections_order, es.est_section_id),
              99999
            ), es.est_section_id
          )
          FROM estimate_sections es
          WHERE es.est_task_id = et.est_task_id
            AND es.est_section_id = ANY(et.sections_order)
        )
      )
      ORDER BY COALESCE(
        array_position(e.tasks_order, et.est_task_id),
        99999
      ), et.est_task_id
    )
    FROM estimate_tasks et
    WHERE et.estimate_id = e.estimate_id
  ) AS tasks
FROM estimates e
LEFT JOIN estimate_projects ep ON e.est_project_id = ep.est_project_id
LEFT JOIN teams t ON ep.team_id = t.team_id;

COMMENT ON VIEW public.estimate_full_details IS
  'Full estimate details with tasks, sections, cabinets, and all related data. Includes estimate-level defaults and pricing (profit, commission, discount).';
