import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

export const supabaseConfigured =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL) &&
  SUPABASE_ANON_KEY.length > 30 &&
  !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_');

export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export function unwrap(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function getRooms() {
  return unwrap(await supabase.from('rooms').select('*').order('floor_id').order('room_name'));
}

export async function getSchedules() {
  return unwrap(await supabase.from('schedules').select(`
    id, room_id, day_of_week, starts_at, ends_at,
    room:rooms!schedules_room_id_fkey(id, room_name, floor_id),
    subject:subjects!schedules_subject_id_fkey(name),
    teacher:teachers!schedules_teacher_id_fkey(full_name),
    section:sections!schedules_section_id_fkey(grade_level, section_name)
  `).order('day_of_week').order('starts_at'));
}

export function mapRoom(row) {
  const shape = row.polygon || {};
  return {
    id: row.id, name: row.room_name, roomNumber: row.room_number,
    floor: Number(row.floor_id), building: row.building, type: row.room_type,
    capacity: row.capacity, description: row.description,
    x: Number(shape.x || 0), y: Number(shape.y || 0),
    w: Number(shape.w || 0), h: Number(shape.h || 0), published: row.published,
  };
}

export function mapSchedule(row) {
  const two = value => String(value || '').slice(0, 5);
  return {
    id: row.id, roomId: row.room_id, day: Number(row.day_of_week) - 1,
    time: two(row.starts_at), end: two(row.ends_at),
    subject: row.subject?.name || '', teacher: row.teacher?.full_name || '',
    section: `${row.section?.grade_level || ''} · ${row.section?.section_name || ''}`.trim(),
    room: row.room?.room_name, floor: Number(row.room?.floor_id || 0), demo: false,
  };
}

export async function isAdministrator(userId) {
  if (!userId) return false;
  const data = unwrap(await supabase.from('administrators').select('user_id').eq('user_id', userId).maybeSingle());
  return Boolean(data);
}

export async function upsertNamed(table, column, value) {
  const data = unwrap(await supabase.from(table).upsert({ [column]: value }, { onConflict: column }).select('id').single());
  return data.id;
}

export async function upsertSection(label) {
  const match = String(label).trim().match(/^(Grade\s+[^·-]+)\s*[·-]\s*(.+)$/i);
  const grade_level = match ? match[1].trim() : 'General';
  const section_name = match ? match[2].trim() : String(label).trim();
  const data = unwrap(await supabase.from('sections').upsert({ grade_level, section_name }, { onConflict: 'grade_level,section_name' }).select('id').single());
  return data.id;
}
