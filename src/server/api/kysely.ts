import {
  DummyDriver,
  Kysely,
  MysqlAdapter,
  MysqlIntrospector,
  MysqlQueryCompiler,
  SelectQueryBuilder,
} from "kysely";

import { db as prisma } from "~/lib/db.js";

import type { DB } from "../../generated/types.ts";

export const db = new Kysely<DB>({
  dialect: {
    createAdapter: () => new MysqlAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (db) => new MysqlIntrospector(db),
    createQueryCompiler: () => new MysqlQueryCompiler(),
  },
});

export const query = <TB extends keyof DB, O>(
  statement: SelectQueryBuilder<DB, TB, O>,
) => {
  const compiledQuery = statement.compile();
  console.log({
    ...compiledQuery,
  });
  return prisma.$queryRawUnsafe<Awaited<ReturnType<typeof statement.execute>>>(
    compiledQuery.sql,
    ...compiledQuery.parameters,
  );
};
