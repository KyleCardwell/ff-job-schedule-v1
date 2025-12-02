-- Update estimate_full_details view to include new defaults columns
DROP VIEW IF EXISTS public.estimate_full_details;

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
    e.default_door_reeded_panel,
    e.default_drawer_reeded_panel,
    e.default_door_style,
    e.default_drawer_front_style,

    ep.est_project_name,
    ep.est_client_name,
    ep.team_id,
    ep.street,
    ep.state,
    ep.city,
    ep.zip,

    -- Team defaults (non-nullable)
    t.team_name,
    t.default_cabinet_style_id AS team_default_cabinet_style_id,
    t.default_box_mat AS team_default_box_mat,
    t.default_face_mat AS team_default_face_mat,
    t.default_drawer_box_mat AS team_default_drawer_box_mat,
    t.default_hinge_id AS team_default_hinge_id,
    t.default_slide_id AS team_default_slide_id,
    t.default_door_pull_id AS team_default_door_pull_id,
    t.default_drawer_pull_id AS team_default_drawer_pull_id,
    t.default_face_finish AS team_default_face_finish,
    t.default_box_finish AS team_default_box_finish,
    t.default_door_inside_molding AS team_default_door_inside_molding,
    t.default_door_outside_molding AS team_default_door_outside_molding,
    t.default_drawer_inside_molding AS team_default_drawer_inside_molding,
    t.default_drawer_outside_molding AS team_default_drawer_outside_molding,
    t.default_door_reeded_panel AS team_default_door_reeded_panel,
    t.default_drawer_reeded_panel AS team_default_drawer_reeded_panel,
    t.default_door_style AS team_default_door_style,
    t.default_drawer_front_style AS team_default_drawer_front_style,

    -- Keep old estimates_default for backward compatibility (can be removed later)
    t.estimates_default,

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
    ) AS tasks,

    e.estimate_data
FROM estimates e
LEFT JOIN estimate_projects ep ON e.est_project_id = ep.est_project_id
LEFT JOIN teams t ON ep.team_id = t.team_id;

COMMENT ON VIEW public.estimate_full_details IS 'Full estimate details with tasks, sections, cabinets, and all related data. Includes three-tier defaults (team and estimate level).';
