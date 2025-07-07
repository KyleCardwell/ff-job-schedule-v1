import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { supabase } from '../utils/supabase';


export const useSupabaseQuery = (table, options = {}) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const session = useSelector((state) => state.auth.session);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let query = supabase.from(table).select(options.select || '*');

        // Add filters if they exist
        if (options.filters) {
          options.filters.forEach(filter => {
            query = query.filter(filter.column, filter.operator, filter.value);
          });
        }

        // Add ordering if it exists
        if (options.orderBy) {
          query = query.order(options.orderBy.column, { 
            ascending: options.orderBy.ascending 
          });
        }

        const { data: result, error: queryError } = await query;

        if (queryError) throw queryError;
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchData();
    }
  }, [table, session, JSON.stringify(options)]);

  return { data, error, loading };
};