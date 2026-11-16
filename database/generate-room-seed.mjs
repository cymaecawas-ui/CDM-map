import { readFile, writeFile, mkdir } from 'node:fs/promises';

const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const matches = [...source.matchAll(/room\('([^']+)',\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*'([^']+)')?\)/g)];
if (!matches.length) throw new Error('No room coordinate records found in src/main.js');
const q = value => `'${String(value).replaceAll("'", "''")}'`;
const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const names = ['', 'First', 'Second', 'Third', 'Fourth'];
const inserts = matches.map(([,name,floor,x,y,w,h,type='Classroom']) => {
  floor = Number(floor);
  const id = `F${floor}-${slug(name)}`;
  const number = /\b\d{3}\b/.exec(name)?.[0] ?? null;
  const description = `${type} on the ${names[floor].toLowerCase()} floor.`;
  const polygon = JSON.stringify({x:Number(x),y:Number(y),w:Number(w),h:Number(h)});
  return `(${q(id)},${q(name)},${number?q(number):'NULL'},${floor},'Colegio de Montalban',${q(type)},${q(description)},${q(polygon)},TRUE)`;
});
await mkdir(new URL('./seed/', import.meta.url), {recursive:true});
const sql = `-- Seed rooms from the supplied floor plans. This contains no class schedule records.\nINSERT INTO rooms (id, room_name, room_number, floor_id, building, room_type, description, polygon, published) VALUES\n${inserts.join(',\n')}\nON DUPLICATE KEY UPDATE room_name=VALUES(room_name), room_number=VALUES(room_number), floor_id=VALUES(floor_id), room_type=VALUES(room_type), description=VALUES(description), polygon=VALUES(polygon), published=TRUE;\n`;
await writeFile(new URL('./seed/rooms.sql', import.meta.url), sql);
await writeFile(new URL('./seed-rooms.sql', import.meta.url), sql);
console.log(`Wrote ${inserts.length} room records to database/seed/rooms.sql and database/seed-rooms.sql`);
