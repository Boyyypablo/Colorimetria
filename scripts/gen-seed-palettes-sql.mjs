import { writeFileSync } from "node:fs";

const { SEASON_PALETTES } = await import("../data/palettes/seasons.ts");

function esc(s) {
  return String(s).replace(/'/g, "''");
}

const rows = SEASON_PALETTES.map((s) => {
  return `(${[
    `'${esc(s.id)}'`,
    `'${esc(s.namePt)}'`,
    `'${esc(s.nameEn)}'`,
    `'${esc(s.temperature)}'`,
    `'${esc(s.value)}'`,
    `'${esc(s.chroma)}'`,
    `'${esc(s.description)}'`,
    `'${esc(JSON.stringify(s.useColors))}'::jsonb`,
    `'${esc(JSON.stringify(s.avoidColors))}'::jsonb`,
    `'${esc(JSON.stringify(s.clothing))}'::jsonb`,
    `'${esc(JSON.stringify(s.lipstick))}'::jsonb`,
    `'${esc(JSON.stringify(s.eyeshadow))}'::jsonb`,
    `'${esc(JSON.stringify(s.base))}'::jsonb`,
    "NOW()",
    "NOW()",
  ].join(",")})`;
}).join(",\n");

const sql = `INSERT INTO "SeasonPalette" (id,"namePt","nameEn",temperature,value,chroma,description,"useColors","avoidColors",clothing,lipstick,eyeshadow,base,"createdAt","updatedAt") VALUES
${rows}
ON CONFLICT (id) DO UPDATE SET
  "namePt"=EXCLUDED."namePt",
  "nameEn"=EXCLUDED."nameEn",
  temperature=EXCLUDED.temperature,
  value=EXCLUDED.value,
  chroma=EXCLUDED.chroma,
  description=EXCLUDED.description,
  "useColors"=EXCLUDED."useColors",
  "avoidColors"=EXCLUDED."avoidColors",
  clothing=EXCLUDED.clothing,
  lipstick=EXCLUDED.lipstick,
  eyeshadow=EXCLUDED.eyeshadow,
  base=EXCLUDED.base,
  "updatedAt"=NOW();
`;

writeFileSync(new URL("./seed-palettes.sql", import.meta.url), sql);
console.log(`OK rows=${SEASON_PALETTES.length} bytes=${sql.length}`);
