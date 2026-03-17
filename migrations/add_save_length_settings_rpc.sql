-- save_length_settings RPC
-- Saves length_services and length_catalog_rules for multiple catalog items
-- in a single transaction. Uses targeted update/insert/delete — only rows that
-- actually changed are touched. No upsert, no wasted IDs.
--
-- Input: p_items JSONB array of:
--   {
--     "length_catalog_id": 123,
--     "services": [
--       { "service_id": 2, "time_per_unit": 5, "is_miter_time": false, "is_cutout_time": false },
--       ...
--     ],
--     "rules": [
--       { "rule_key": "nosing", "params": { "material_extra_area": true }, "sort_order": 0 },
--       ...
--     ]
--   }

CREATE OR REPLACE FUNCTION save_length_settings(
  p_items JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_team_id UUID;
  v_item JSONB;
  v_service JSONB;
  v_rule JSONB;
  v_catalog_id BIGINT;
  v_team_service_id BIGINT;
  v_existing_id BIGINT;
  v_time_value NUMERIC;
  v_is_miter BOOLEAN;
  v_is_cutout BOOLEAN;
  v_rule_key TEXT;
  v_items_processed INT := 0;
BEGIN
  -- Resolve team from current user
  SELECT tm.team_id
  INTO v_team_id
  FROM team_members tm
  WHERE tm.user_id = auth.uid()
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'No team found for current user';
  END IF;

  -- Process each catalog item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_catalog_id := (v_item ->> 'length_catalog_id')::BIGINT;

    -- Verify this catalog item belongs to the user's team
    IF NOT EXISTS (
      SELECT 1 FROM lengths_catalog
      WHERE id = v_catalog_id AND team_id = v_team_id
    ) THEN
      RAISE EXCEPTION 'Catalog item % does not belong to team', v_catalog_id;
    END IF;

    -- ══════════════════════════════════════
    -- SERVICES: targeted update / insert / delete
    -- Matched by unique (length_catalog_id, team_service_id, is_miter_time, is_cutout_time)
    -- ══════════════════════════════════════
    IF v_item ? 'services' THEN
      FOR v_service IN SELECT * FROM jsonb_array_elements(v_item -> 'services')
      LOOP
        v_time_value := COALESCE((v_service ->> 'time_per_unit')::NUMERIC, 0);
        v_is_miter  := COALESCE((v_service ->> 'is_miter_time')::BOOLEAN, FALSE);
        v_is_cutout := COALESCE((v_service ->> 'is_cutout_time')::BOOLEAN, FALSE);

        -- Resolve service_id -> team_service_id
        SELECT ts.id INTO v_team_service_id
        FROM team_services ts
        WHERE ts.team_id = v_team_id
          AND ts.service_id = (v_service ->> 'service_id')::BIGINT
        LIMIT 1;

        IF v_team_service_id IS NULL THEN
          CONTINUE;
        END IF;

        -- Check if this service row already exists
        SELECT ls.id INTO v_existing_id
        FROM length_services ls
        WHERE ls.length_catalog_id = v_catalog_id
          AND ls.team_service_id = v_team_service_id
          AND ls.is_miter_time = v_is_miter
          AND ls.is_cutout_time = v_is_cutout;

        IF v_existing_id IS NOT NULL THEN
          IF v_time_value = 0 THEN
            -- Time zeroed out → delete
            DELETE FROM length_services WHERE id = v_existing_id;
          ELSE
            -- Update time if changed
            UPDATE length_services
            SET time_per_unit = v_time_value,
                updated_at = now()
            WHERE id = v_existing_id
              AND time_per_unit IS DISTINCT FROM v_time_value;
          END IF;
        ELSE
          -- New service row → insert (skip zeros)
          IF v_time_value <> 0 THEN
            INSERT INTO length_services (
              length_catalog_id, team_service_id, time_per_unit,
              is_miter_time, is_cutout_time
            ) VALUES (
              v_catalog_id, v_team_service_id, v_time_value,
              v_is_miter, v_is_cutout
            );
          END IF;
        END IF;
      END LOOP;
    END IF;

    -- ══════════════════════════════════════
    -- RULES: targeted update / insert / delete
    -- Matched by unique (length_catalog_id, rule_key)
    -- ══════════════════════════════════════
    IF v_item ? 'rules' THEN
      -- Delete rules no longer in the desired set
      DELETE FROM length_catalog_rules
      WHERE length_catalog_id = v_catalog_id
        AND rule_key NOT IN (
          SELECT r ->> 'rule_key'
          FROM jsonb_array_elements(v_item -> 'rules') AS r
        );

      -- Update or insert desired rules
      FOR v_rule IN SELECT * FROM jsonb_array_elements(v_item -> 'rules')
      LOOP
        v_rule_key := v_rule ->> 'rule_key';

        SELECT lcr.id INTO v_existing_id
        FROM length_catalog_rules lcr
        WHERE lcr.length_catalog_id = v_catalog_id
          AND lcr.rule_key = v_rule_key;

        IF v_existing_id IS NOT NULL THEN
          -- Update only if params or sort_order changed
          UPDATE length_catalog_rules
          SET params = COALESCE(v_rule -> 'params', '{}'::JSONB),
              sort_order = COALESCE((v_rule ->> 'sort_order')::INT, 0),
              updated_at = now()
          WHERE id = v_existing_id
            AND (
              params IS DISTINCT FROM COALESCE(v_rule -> 'params', '{}'::JSONB)
              OR sort_order IS DISTINCT FROM COALESCE((v_rule ->> 'sort_order')::INT, 0)
            );
        ELSE
          -- New rule → insert
          INSERT INTO length_catalog_rules (
            length_catalog_id, rule_key, params, sort_order
          ) VALUES (
            v_catalog_id,
            v_rule_key,
            COALESCE(v_rule -> 'params', '{}'::JSONB),
            COALESCE((v_rule ->> 'sort_order')::INT, 0)
          );
        END IF;
      END LOOP;
    END IF;

    v_items_processed := v_items_processed + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', TRUE,
    'items_processed', v_items_processed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION save_length_settings(JSONB) TO authenticated;
