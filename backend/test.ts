console.log("starting...");
import { db } from "./src/db.js";
async function main() {
  console.log("waiting for db...");
  await db.waitReady();
  console.log("db ready!");
  const r = await db.prepare("SELECT COUNT(*) as c FROM products").get();
  console.log("result:", r);
}
main().catch(e => console.error("ERROR:", e));
