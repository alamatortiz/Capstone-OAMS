const pool = require("../db");

// A pooled connection for one transaction whose release() is idempotent and
// whose rollback() becomes a no-op once it has been released.
//
// Why: a route that holds its transaction connection while it awaits ANOTHER
// pool query (an audit-log write, a notification nudge, a lookup through
// `pool`) needs two connections at once. With the pool's 10 connections all
// held by requests in that state, every one of them waits for an eleventh
// that never frees up -- and mysql2's pool has no acquire timeout, so the
// whole server hangs permanently. Reproduced under a concurrent pass /
// call-next / serve stress test.
//
// The fix at each call site is to hand the connection back the moment the
// transaction commits (`await conn.commit(); conn.release();`) and do the
// post-commit pool work after that. Making release idempotent keeps the
// usual `finally { conn.release(); }` safe, and guarding rollback stops a
// late catch block from rolling back a transaction that another request is
// now running on the same (returned) connection.
async function getTxConnection() {
  const conn = await pool.getConnection();
  let released = false;
  const release = conn.release.bind(conn);
  const rollback = conn.rollback.bind(conn);
  conn.release = () => {
    if (released) return;
    released = true;
    release();
  };
  conn.rollback = async () => {
    if (released) return;
    await rollback();
  };
  return conn;
}

module.exports = { getTxConnection };
