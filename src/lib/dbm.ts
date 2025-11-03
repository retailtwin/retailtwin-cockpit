const SUPABASE_FUNC_URL =
  'https://xfuehhrpdzkdsjhfbjcd.supabase.co/functions/v1/dbm-calculator';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function runDbmSimulation(items: any[]) {
  const res = await fetch(SUPABASE_FUNC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
