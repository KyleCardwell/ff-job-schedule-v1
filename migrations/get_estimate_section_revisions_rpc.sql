-- Fetch every revision for each section lineage that is currently part of an estimate.
-- Prices are intentionally calculated client-side with the current estimate/catalog rates.

DROP FUNCTION IF EXISTS public.get_estimate_section_revisions(BIGINT);

CREATE OR REPLACE FUNCTION public.get_estimate_section_revisions(
  p_estimate_id BIGINT
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  WITH active_lineages AS (
    SELECT
      et.est_task_id,
      et.est_task_name,
      et.quantity AS task_quantity,
      COALESCE(array_position(e.tasks_order, et.est_task_id), 2147483647) AS task_position,
      active_section.est_section_id AS active_section_id,
      active_section.section_lineage_id,
      active_section.section_name,
      section_order.ordinality AS section_position
    FROM public.estimates e
    JOIN public.estimate_tasks et
      ON et.estimate_id = e.estimate_id
    CROSS JOIN LATERAL unnest(et.sections_order) WITH ORDINALITY
      AS section_order(section_id, ordinality)
    JOIN public.estimate_sections active_section
      ON active_section.est_section_id = section_order.section_id
      AND active_section.est_task_id = et.est_task_id
    WHERE e.estimate_id = p_estimate_id
  ),
  revision_rows AS (
    SELECT
      lineage.*,
      revision.revision,
      revision.est_section_id AS revision_section_id,
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              to_jsonb(revision.*),
              '{cabinets}',
              (
                SELECT COALESCE(
                  jsonb_agg(
                    jsonb_set(
                      to_jsonb(cabinet.*),
                      '{accessories}',
                      (
                        SELECT COALESCE(jsonb_agg(to_jsonb(cabinet_accessory.*)), '[]'::jsonb)
                        FROM public.estimate_accessories cabinet_accessory
                        WHERE cabinet_accessory.est_cabinet_id = cabinet.id
                      )
                    )
                    ORDER BY COALESCE(array_position(revision.cabinets_order, cabinet.id), 2147483647), cabinet.id
                  ),
                  '[]'::jsonb
                )
                FROM public.estimate_cabinets cabinet
                WHERE cabinet.est_section_id = revision.est_section_id
              )
            ),
            '{lengths}',
            (
              SELECT COALESCE(
                jsonb_agg(
                  to_jsonb(length_item.*)
                  ORDER BY COALESCE(array_position(revision.lengths_order, length_item.id), 2147483647), length_item.id
                ),
                '[]'::jsonb
              )
              FROM public.estimate_lengths length_item
              WHERE length_item.est_section_id = revision.est_section_id
            )
          ),
          '{accessories}',
          (
            SELECT COALESCE(
              jsonb_agg(
                to_jsonb(section_accessory.*)
                ORDER BY COALESCE(array_position(revision.accessories_order, section_accessory.id), 2147483647), section_accessory.id
              ),
              '[]'::jsonb
            )
            FROM public.estimate_accessories section_accessory
            WHERE section_accessory.est_section_id = revision.est_section_id
              AND section_accessory.est_cabinet_id IS NULL
          )
        ),
        '{other}',
        (
          SELECT COALESCE(
            jsonb_agg(
              to_jsonb(other_item.*)
              ORDER BY COALESCE(array_position(revision.other_order, other_item.id), 2147483647), other_item.id
            ),
            '[]'::jsonb
          )
          FROM public.estimate_other other_item
          WHERE other_item.est_section_id = revision.est_section_id
        )
      ) AS revision_data
    FROM active_lineages lineage
    JOIN public.estimate_sections revision
      ON revision.est_task_id = lineage.est_task_id
      AND revision.section_lineage_id = lineage.section_lineage_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'taskId', est_task_id,
        'taskName', est_task_name,
        'taskQuantity', task_quantity,
        'taskPosition', task_position,
        'activeSectionId', active_section_id,
        'sectionLineageId', section_lineage_id,
        'sectionName', section_name,
        'sectionPosition', section_position,
        'revision', revision_data
      )
      ORDER BY task_position, est_task_id, section_position, revision, revision_section_id
    ),
    '[]'::jsonb
  )
  FROM revision_rows;
$$;

GRANT EXECUTE ON FUNCTION public.get_estimate_section_revisions(BIGINT) TO authenticated;

COMMENT ON FUNCTION public.get_estimate_section_revisions(BIGINT) IS
  'Returns all full section revisions for the active section lineages in an estimate, ordered by room, section, and revision.';
