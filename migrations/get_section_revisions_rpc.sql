-- RPC function to fetch all section revisions in a lineage with full nested child data

DROP FUNCTION IF EXISTS public.get_section_revisions(BIGINT, BIGINT);

CREATE OR REPLACE FUNCTION public.get_section_revisions(
  p_lineage_id BIGINT,
  p_task_id BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN (
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
                        FROM public.estimate_accessories eca
                        WHERE eca.est_cabinet_id = ec.id
                      )
                    )
                    ORDER BY COALESCE(array_position(es.cabinets_order, ec.id), 99999), ec.id
                  ),
                  '[]'::json
                )::jsonb
                FROM public.estimate_cabinets ec
                WHERE ec.est_section_id = es.est_section_id
              )
            ),
            '{lengths}',
            (
              SELECT COALESCE(
                json_agg(to_jsonb(el.*) ORDER BY COALESCE(array_position(es.lengths_order, el.id), 99999), el.id),
                '[]'::json
              )::jsonb
              FROM public.estimate_lengths el
              WHERE el.est_section_id = es.est_section_id
            )
          ),
          '{accessories}',
          (
            SELECT COALESCE(
              json_agg(to_jsonb(ea.*) ORDER BY COALESCE(array_position(es.accessories_order, ea.id), 99999), ea.id),
              '[]'::json
            )::jsonb
            FROM public.estimate_accessories ea
            WHERE ea.est_section_id = es.est_section_id
              AND ea.est_cabinet_id IS NULL
          )
        ),
        '{other}',
        (
          SELECT COALESCE(
            json_agg(to_jsonb(eo.*) ORDER BY COALESCE(array_position(es.other_order, eo.id), 99999), eo.id),
            '[]'::json
          )::jsonb
          FROM public.estimate_other eo
          WHERE eo.est_section_id = es.est_section_id
        )
      )
      ORDER BY es.revision DESC
    )
    FROM public.estimate_sections es
    WHERE es.section_lineage_id = p_lineage_id
      AND es.est_task_id = p_task_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_section_revisions(BIGINT, BIGINT) TO authenticated;

COMMENT ON FUNCTION public.get_section_revisions(BIGINT, BIGINT) IS 'Returns all revisions of a section lineage within a task, including full nested child data (cabinets/accessories/lengths/other), for client-side pricing calculations.';
