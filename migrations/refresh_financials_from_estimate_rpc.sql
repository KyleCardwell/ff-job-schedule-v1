-- Refresh project_financials.financial_data from scheduled estimate section financial snapshots.

DROP FUNCTION IF EXISTS public.refresh_financials_from_estimate(BIGINT[]);
DROP FUNCTION IF EXISTS public.refresh_financials_from_estimate(BIGINT[], JSONB);

CREATE OR REPLACE FUNCTION public.refresh_financials_from_estimate(
  p_task_ids BIGINT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_task_id BIGINT;
  v_team_id UUID;
  v_has_sections BOOLEAN;
  v_task_adjustments JSONB;
  v_section_adjustments JSONB;

  v_section_financial_data JSONB;
  v_category_key TEXT;
  v_category_value JSONB;
  v_existing_category JSONB;
  v_existing_data JSONB;
  v_new_data JSONB;
  v_merged_financial_data JSONB;

  v_hours_map JSONB;
  v_hours_unkeyed_data JSONB;
  v_hours_item JSONB;
  v_hours_key TEXT;
  v_existing_hours_item JSONB;
  v_hours_data JSONB;
BEGIN
  IF array_length(COALESCE(p_task_ids, ARRAY[]::BIGINT[]), 1) IS NULL THEN
    RETURN;
  END IF;

  FOREACH v_task_id IN ARRAY p_task_ids LOOP
    IF v_task_id IS NULL THEN
      CONTINUE;
    END IF;

    SELECT p.team_id
    INTO v_team_id
    FROM tasks t
    JOIN projects p ON p.project_id = t.project_id
    WHERE t.task_id = v_task_id
    LIMIT 1;

    IF v_team_id IS NULL THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM estimate_sections es
      WHERE es.scheduled_task_id = v_task_id
        AND es.financial_data IS NOT NULL
        AND es.financial_data <> '{}'::JSONB
    )
    INTO v_has_sections;

    IF NOT v_has_sections THEN
      CONTINUE;
    END IF;

    v_task_adjustments := NULL;

    v_merged_financial_data := '{}'::JSONB;

    FOR v_section_financial_data IN
      SELECT COALESCE(es.financial_data, '{}'::JSONB)
      FROM estimate_sections es
      WHERE es.scheduled_task_id = v_task_id
    LOOP
      v_section_adjustments := NULL;
      IF jsonb_typeof(v_section_financial_data -> '__meta' -> 'adjustments') = 'object' THEN
        v_section_adjustments := v_section_financial_data -> '__meta' -> 'adjustments';
      ELSIF jsonb_typeof(v_section_financial_data -> 'adjustments') = 'object' THEN
        v_section_adjustments := v_section_financial_data -> 'adjustments';
      END IF;

      IF v_section_adjustments IS NOT NULL THEN
        v_task_adjustments := v_section_adjustments;
      END IF;

      FOR v_category_key, v_category_value IN
        SELECT e.key, e.value
        FROM jsonb_each(v_section_financial_data) AS e
      LOOP
        IF LEFT(v_category_key, 2) = '__' OR v_category_key = 'adjustments' THEN
          CONTINUE;
        END IF;

        IF jsonb_typeof(v_category_value) <> 'object' THEN
          CONTINUE;
        END IF;

        v_existing_category := COALESCE(
          v_merged_financial_data -> v_category_key,
          '{}'::JSONB
        );

        IF v_category_key = 'hours' THEN
          v_hours_map := '{}'::JSONB;
          v_hours_unkeyed_data := '[]'::JSONB;

          FOR v_hours_item IN
            SELECT value
            FROM jsonb_array_elements(
              CASE
                WHEN jsonb_typeof(COALESCE(v_existing_category->'data', '[]'::JSONB)) = 'array'
                  THEN COALESCE(v_existing_category->'data', '[]'::JSONB)
                ELSE '[]'::JSONB
              END
            )
          LOOP
            v_hours_key := NULLIF(v_hours_item->>'team_service_id', '');

            IF v_hours_key IS NULL THEN
              v_hours_unkeyed_data := v_hours_unkeyed_data || jsonb_build_array(v_hours_item);
              CONTINUE;
            END IF;

            v_hours_map := jsonb_set(
              v_hours_map,
              ARRAY[v_hours_key],
              v_hours_item,
              TRUE
            );
          END LOOP;

          FOR v_hours_item IN
            SELECT value
            FROM jsonb_array_elements(
              CASE
                WHEN jsonb_typeof(COALESCE(v_category_value->'data', '[]'::JSONB)) = 'array'
                  THEN COALESCE(v_category_value->'data', '[]'::JSONB)
                ELSE '[]'::JSONB
              END
            )
          LOOP
            v_hours_key := NULLIF(v_hours_item->>'team_service_id', '');

            IF v_hours_key IS NULL THEN
              v_hours_unkeyed_data := v_hours_unkeyed_data || jsonb_build_array(v_hours_item);
              CONTINUE;
            END IF;

            v_existing_hours_item := COALESCE(v_hours_map -> v_hours_key, '{}'::JSONB);

            v_hours_map := jsonb_set(
              v_hours_map,
              ARRAY[v_hours_key],
              jsonb_build_object(
                'team_service_id', COALESCE(
                  v_existing_hours_item->'team_service_id',
                  v_hours_item->'team_service_id',
                  CASE
                    WHEN v_hours_key ~ '^[0-9]+$' THEN to_jsonb(v_hours_key::BIGINT)
                    ELSE to_jsonb(v_hours_key)
                  END
                ),
                'estimate',
                  COALESCE(NULLIF(v_existing_hours_item->>'estimate', '')::NUMERIC, 0)
                  + COALESCE(NULLIF(v_hours_item->>'estimate', '')::NUMERIC, 0),
                'fixedAmount',
                  COALESCE(NULLIF(v_existing_hours_item->>'fixedAmount', '')::NUMERIC, 0)
                  + COALESCE(NULLIF(v_hours_item->>'fixedAmount', '')::NUMERIC, 0),
                'rateOverride', COALESCE(
                  v_existing_hours_item->'rateOverride',
                  v_hours_item->'rateOverride',
                  'null'::JSONB
                ),
                'actual_cost',
                  COALESCE(NULLIF(v_existing_hours_item->>'actual_cost', '')::NUMERIC, 0)
                  + COALESCE(NULLIF(v_hours_item->>'actual_cost', '')::NUMERIC, 0),
                'inputRows',
                  CASE
                    WHEN jsonb_typeof(COALESCE(v_existing_hours_item->'inputRows', '[]'::JSONB)) = 'array'
                      AND jsonb_typeof(COALESCE(v_hours_item->'inputRows', '[]'::JSONB)) = 'array'
                    THEN COALESCE(v_existing_hours_item->'inputRows', '[]'::JSONB)
                      || COALESCE(v_hours_item->'inputRows', '[]'::JSONB)
                    WHEN jsonb_typeof(COALESCE(v_existing_hours_item->'inputRows', '[]'::JSONB)) = 'array'
                    THEN COALESCE(v_existing_hours_item->'inputRows', '[]'::JSONB)
                    WHEN jsonb_typeof(COALESCE(v_hours_item->'inputRows', '[]'::JSONB)) = 'array'
                    THEN COALESCE(v_hours_item->'inputRows', '[]'::JSONB)
                    ELSE '[]'::JSONB
                  END
              ),
              TRUE
            );
          END LOOP;

          SELECT COALESCE(
            jsonb_agg(item.value ORDER BY
              CASE WHEN item.key ~ '^[0-9]+$' THEN item.key::BIGINT ELSE NULL END,
              item.key
            ),
            '[]'::JSONB
          )
          INTO v_hours_data
          FROM jsonb_each(v_hours_map) AS item;

          v_hours_data := COALESCE(v_hours_data, '[]'::JSONB) || v_hours_unkeyed_data;

          v_merged_financial_data := jsonb_set(
            v_merged_financial_data,
            ARRAY[v_category_key],
            jsonb_build_object(
              'name', LOWER(COALESCE(
                NULLIF(v_existing_category->>'name', ''),
                NULLIF(v_category_value->>'name', ''),
                v_category_key
              )),
              'estimate',
                COALESCE(NULLIF(v_existing_category->>'estimate', '')::NUMERIC, 0)
                + COALESCE(NULLIF(v_category_value->>'estimate', '')::NUMERIC, 0),
              'actual_cost',
                COALESCE(NULLIF(v_existing_category->>'actual_cost', '')::NUMERIC, 0)
                + COALESCE(NULLIF(v_category_value->>'actual_cost', '')::NUMERIC, 0),
              'data', v_hours_data
            ),
            TRUE
          );
        ELSE
          v_existing_data := CASE
            WHEN jsonb_typeof(COALESCE(v_existing_category->'data', '[]'::JSONB)) = 'array'
              THEN COALESCE(v_existing_category->'data', '[]'::JSONB)
            ELSE '[]'::JSONB
          END;

          v_new_data := CASE
            WHEN jsonb_typeof(COALESCE(v_category_value->'data', '[]'::JSONB)) = 'array'
              THEN COALESCE(v_category_value->'data', '[]'::JSONB)
            ELSE '[]'::JSONB
          END;

          v_merged_financial_data := jsonb_set(
            v_merged_financial_data,
            ARRAY[v_category_key],
            jsonb_build_object(
              'name', LOWER(COALESCE(
                NULLIF(v_existing_category->>'name', ''),
                NULLIF(v_category_value->>'name', ''),
                v_category_key
              )),
              'estimate',
                COALESCE(NULLIF(v_existing_category->>'estimate', '')::NUMERIC, 0)
                + COALESCE(NULLIF(v_category_value->>'estimate', '')::NUMERIC, 0),
              'actual_cost',
                COALESCE(NULLIF(v_existing_category->>'actual_cost', '')::NUMERIC, 0)
                + COALESCE(NULLIF(v_category_value->>'actual_cost', '')::NUMERIC, 0),
              'data', v_existing_data || v_new_data
            ),
            TRUE
          );
        END IF;
      END LOOP;
    END LOOP;

    UPDATE project_financials
    SET
      team_id = v_team_id,
      adjustments = COALESCE(v_task_adjustments, adjustments),
      financial_data = v_merged_financial_data,
      financials_updated_at = NOW()
    WHERE task_id = v_task_id;

    IF NOT FOUND THEN
      BEGIN
        INSERT INTO project_financials (
          task_id,
          team_id,
          adjustments,
          financial_data,
          financials_created_at,
          financials_updated_at
        )
        VALUES (
          v_task_id,
          v_team_id,
          v_task_adjustments,
          v_merged_financial_data,
          NOW(),
          NOW()
        );
      EXCEPTION
        WHEN unique_violation THEN
          UPDATE project_financials
          SET
            team_id = v_team_id,
            adjustments = COALESCE(v_task_adjustments, adjustments),
            financial_data = v_merged_financial_data,
            financials_updated_at = NOW()
          WHERE task_id = v_task_id;
      END;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_financials_from_estimate(BIGINT[]) TO authenticated;

COMMENT ON FUNCTION public.refresh_financials_from_estimate(BIGINT[]) IS
'Refreshes project_financials.financial_data for scheduled tasks by aggregating estimate_sections.financial_data per task, including hours merged by team_service_id. Applies adjustments from section financial snapshot metadata when present.';
