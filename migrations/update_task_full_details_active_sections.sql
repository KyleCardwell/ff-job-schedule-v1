DROP VIEW IF EXISTS public.task_full_details;

CREATE OR REPLACE VIEW public.task_full_details
WITH (security_invoker = true) AS
SELECT
    et.*,
    (
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
                                        to_jsonb(ec.*)
                                        ORDER BY COALESCE(array_position(es.cabinets_order, ec.id), 99999), ec.id
                                    ), '[]'::json
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
                                    ORDER BY COALESCE(array_position(es.lengths_order, el.id), 99999), el.id
                                ), '[]'::json
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
                                ORDER BY COALESCE(array_position(es.accessories_order, ea.id), 99999), ea.id
                            ), '[]'::json
                        )::jsonb
                        FROM estimate_accessories ea
                        WHERE ea.est_section_id = es.est_section_id
                    )
                ),
                '{other}',
                (
                    SELECT COALESCE(
                        json_agg(
                            to_jsonb(eo.*)
                            ORDER BY COALESCE(array_position(es.other_order, eo.id), 99999), eo.id
                        ), '[]'::json
                    )::jsonb
                    FROM estimate_other eo
                    WHERE eo.est_section_id = es.est_section_id
                )
            )
            ORDER BY COALESCE(array_position(et.sections_order, es.est_section_id), 99999), es.est_section_id
        )
        FROM estimate_sections es
        WHERE es.est_task_id = et.est_task_id
          AND es.est_section_id = ANY(et.sections_order)
    ) AS sections
FROM estimate_tasks et;
