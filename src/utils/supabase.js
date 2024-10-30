import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_FF_JS_SUPABASE_URL,
  import.meta.env.VITE_FF_JS_SUPABASE_ANON_KEY
);

export const querySupabase = async (table, options = {}) => {
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
};