import type { Store } from '../live-guide/http.ts';

type Query = (statement: string, values: unknown[]) => Promise<Record<string, unknown>[]>;

/** Adapt the app's fixed, parameterized SQL statements to Postgres. */
export function postgresStore(query: Query): Store {
  return {
    prepare(statement) {
      let position = 0;
      const sql = statement.replace(/\?/g, () => '$' + ++position);
      return {
        bind(...values) {
          if (values.length !== position) throw new Error('Incorrect SQL parameter count.');
          return {
            async first<T>() { return ((await query(sql, values))[0] as T | undefined) ?? null; },
            async run() { await query(sql, values); },
          };
        },
      };
    },
  };
}
