import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_FF_JS_SUPABASE_URL,
  import.meta.env.VITE_FF_JS_SUPABASE_ANON_KEY
);

export const querySupabase = async (table, options = {}) => {
  if (options.query) {
    // For raw SQL-style queries
    let query = supabase
      .from(table)
      .select('*');

    // Apply the query function if provided
    query = options.query(query);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } else {
    // Original simple query logic
    let query = supabase.from(table).select(options.select || '*');

    if (options.filters) {
      options.filters.forEach(filter => {
        query = query.filter(filter.column, filter.operator, filter.value);
      });
    }

    if (options.orderBy) {
      query = query.order(options.orderBy.column, { 
        ascending: options.orderBy.ascending 
      });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};
