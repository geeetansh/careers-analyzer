import { readFile } from "node:fs/promises";
import path from "node:path";
import { Dashboard } from "@/components/dashboard";

async function loadSeedCsv() {
  const filePath = path.join(process.cwd(), "data", "companies.csv");
  return readFile(filePath, "utf8");
}

export default async function Home() {
  const initialCsv = await loadSeedCsv();

  return <Dashboard initialCsv={initialCsv} />;
}
