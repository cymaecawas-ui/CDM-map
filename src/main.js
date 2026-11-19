import { supabase, supabaseConfigured, unwrap, getRooms, getSchedules, isAdministrator, mapRoom, mapSchedule, upsertNamed, upsertSection } from './supabase.js';
const room = (name, floor, x, y, w, h, type = 'Classroom') => ({ id: `F${floor}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name, floor, x, y, w, h, type, description: `${type} on the ${['', 'first', 'second', 'third', 'fourth'][floor]} floor.` });
let rows = {
    1: [room('ROTC Office', 1, 400, 232, 77, 72, 'Office'), room('NSTP Office', 1, 477, 232, 77, 72, 'Office'), room('QA Office', 1, 554, 232, 77, 72, 'Office'), room('Student Center', 1, 631, 232, 77, 72, 'Student services'), room('Clinic', 1, 731, 208, 77, 103, 'Clinic'), room('Registrar', 1, 821, 208, 122, 103, 'Office'), room('Office of the President', 1, 943, 208, 122, 103, 'Office'), room('Office of the Board of Trustees', 1, 1065, 208, 58, 103, 'Office'), room('OOTVP for Administration', 1, 1123, 208, 58, 103, 'Office'), room('OOTVP for Academic Affairs', 1, 1181, 208, 122, 103, 'Office'), room('School Canteen', 1, 1384, 174, 162, 237, 'Food'), room('PRRC 107', 1, 526, 377, 76, 102), room('Science Laboratory', 1, 632, 377, 76, 102, 'Laboratory'), room('PRRC 105', 1, 526, 479, 76, 102), room('PRRC 104', 1, 632, 479, 76, 102), room('PRRC 103', 1, 526, 642, 76, 102), room('Food Hub', 1, 632, 640, 76, 207, 'Food'), room('PRRC 101', 1, 526, 744, 76, 103), room('NB 102', 1, 870, 640, 104, 77), room('NB 104', 1, 1090, 640, 102, 77), room('NB 106', 1, 1192, 640, 100, 77), room('NB 101', 1, 769, 755, 101, 77), room('NB 103', 1, 870, 755, 104, 77), room('NB 105', 1, 1152, 755, 101, 77), room('NB 107', 1, 1253, 755, 101, 77), room('Covered Court', 1, 1404, 536, 179, 355, 'Sports'), room('Female Bathroom', 1, 526, 339, 76, 38, 'Bathroom'), room('Male Bathroom', 1, 526, 847, 76, 38, 'Bathroom')],
    2: [room('HRMO', 2, 732, 208, 38, 103, 'Office'), room('Finance and Accounting Office', 2, 770, 208, 39, 103, 'Office'), room('Guidance Office', 2, 820, 208, 124, 103, 'Office'), room('Library', 2, 944, 208, 360, 103, 'Library'), room('PRRC 208', 2, 527, 377, 76, 102), room('PRRC 209', 2, 634, 377, 76, 102), room('PRRC 206', 2, 527, 479, 76, 103), room('PRRC 207', 2, 634, 479, 76, 103), room('Educational Technology Center', 2, 634, 582, 76, 60, 'Technology'), room('PRRC 203', 2, 527, 642, 76, 102), room('PRRC 204', 2, 634, 642, 76, 102), room('PRRC 201', 2, 527, 744, 76, 103), room('PRRC 202', 2, 634, 744, 76, 103), room('NB 202', 2, 870, 640, 118, 76), room('Education and Business Teacher Faculty', 2, 988, 640, 188, 76, 'Faculty'), room('NB 207', 2, 1176, 640, 116, 76), room('NB 201', 2, 769, 755, 118, 77), room('NB 203', 2, 887, 755, 117, 77), room('NB 205', 2, 1004, 755, 118, 77), room('NB 206', 2, 1122, 755, 116, 77), room('NB 208', 2, 1238, 755, 116, 77), room('Female Bathroom', 2, 527, 339, 76, 38, 'Bathroom'), room('Male Bathroom', 2, 527, 847, 76, 38, 'Bathroom')],
    3: [room('Female Bathroom', 3, 527, 341, 76, 38, 'Bathroom'), room('PRRC 309', 3, 527, 379, 76, 103), room('PRRC 310', 3, 634, 379, 76, 103), room('PRRC 307', 3, 527, 482, 76, 102), room('PRRC 308', 3, 634, 482, 76, 102), room('M.I.S Office', 3, 634, 584, 76, 60, 'Office'), room('Office of the Property and Supply', 3, 527, 644, 76, 102, 'Office'), room('PRRC Comlab 2', 3, 634, 644, 76, 102, 'Computer lab'), room('AVR', 3, 527, 746, 76, 102, 'Auditorium'), room('PRRC Comlab 1', 3, 634, 746, 76, 102, 'Computer lab'), room('Male Bathroom', 3, 527, 849, 76, 37, 'Bathroom'), room('NB 302', 3, 870, 642, 118, 76), room('ICS & IBE Faculty Office', 3, 988, 642, 188, 76, 'Faculty'), room('NB 307', 3, 1176, 642, 116, 76), room('NB 301', 3, 770, 756, 118, 77), room('NB 303', 3, 888, 756, 116, 77), room('NB 305', 3, 1004, 756, 118, 77), room('NB 306', 3, 1122, 756, 116, 77), room('NB 308', 3, 1238, 756, 116, 77)],
    4: [room('Function Hall', 4, 652, 531, 615, 202, 'Function hall')]
};
// These coordinates preserve the supplied map layout and are used for the Supabase room seed.
let allRooms = [];
let schedule = [];
let dbError = '';
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const jsDay = new Date().getDay();
let state = { floor: 1, selected: null, search: '', query: '', day: jsDay === 0 ? 0 : jsDay - 1, mode: 'List View', tab: 'home', zoom: 1, admin: false, adminOpen: false, adminFloor: 1, adminRoomId: null, editScheduleId: null, scheduleMessage: '' };
const $ = s => document.querySelector(s), esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const floorName = n => ['', 'First', 'Second', 'Third', 'Fourth'][n];
async function loadDatabase() {
    try {
        if (!supabaseConfigured || !supabase) throw new Error('Add the Supabase Project URL and publishable key in src/supabase-config.js.');
        const { data: authData, error: authError } = await supabase.auth.getSession();
        if (authError) throw authError;
        const [roomRows, scheduleRows] = await Promise.all([getRooms(), getSchedules()]);
        allRooms = roomRows.map(mapRoom);
        rows = { 1: [], 2: [], 3: [], 4: [] };
        allRooms.forEach(item => { (rows[item.floor] ||= []).push(item); });
        schedule = scheduleRows.map(mapSchedule);
        if (!allRooms.some(item => item.id === state.adminRoomId)) state.adminRoomId = allRooms[0]?.id || null;
        const adminRoom = allRooms.find(item => item.id === state.adminRoomId);
        if (adminRoom) state.adminFloor = adminRoom.floor;
        state.admin = await isAdministrator(authData.session?.user?.id);
        dbError = '';
    } catch (error) {
        allRooms = []; rows = { 1: [], 2: [], 3: [], 4: [] }; schedule = [];
        state.admin = false;
        dbError = error.message || 'Could not connect to Supabase.';
    }
    render();
}
async function saveScheduleToSupabase(payload, existingId = null) {
    const conflictQuery = supabase.from('schedules').select('id')
        .eq('room_id', payload.roomId).eq('day_of_week', payload.day + 1)
        .lt('starts_at', payload.end).gt('ends_at', payload.time);
    if (existingId) conflictQuery.neq('id', existingId);
    if (unwrap(await conflictQuery.limit(1)).length) throw new Error('This room already has a schedule that overlaps that time.');
    const [subjectId, teacherId, sectionId] = await Promise.all([
        upsertNamed('subjects', 'name', payload.subject),
        upsertNamed('teachers', 'full_name', payload.teacher),
        upsertSection(payload.section),
    ]);
    const values = {
        room_id: payload.roomId, day_of_week: payload.day + 1,
        starts_at: payload.time, ends_at: payload.end,
        subject_id: subjectId, teacher_id: teacherId, section_id: sectionId, published: true,
    };
    const result = existingId
        ? await supabase.from('schedules').update(values).eq('id', existingId).select('id').single()
        : await supabase.from('schedules').insert(values).select('id').single();
    return unwrap(result);
}
function status(r) { let now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })), d = now.getDay() - 1, m = now.getHours() * 60 + now.getMinutes(), entries = schedule.filter(s => s.roomId === r.id && s.day === d).sort((a, b) => a.time.localeCompare(b.time)); let active = entries.find(s => { let [h, x] = s.time.split(':').map(Number), [eh, ex] = s.end.split(':').map(Number); return m >= h * 60 + x && m < eh * 60 + ex }); let next = entries.find(s => { let [h, x] = s.time.split(':').map(Number); return h * 60 + x > m }); return active ? { key: 'occupied', label: 'In class', entry: active } : next ? { key: 'upcoming', label: 'Upcoming', entry: next } : entries.length ? { key: 'available', label: 'Available' } : { key: 'none', label: 'No schedule' } }
const mapResults = () => allRooms.filter(r => !state.search || `${r.name} ${r.roomNumber || ''} ${r.type || ''}`.toLowerCase().includes(state.search.trim().toLowerCase()));
function render() {
    const avail = allRooms.map(status).filter(s => s.key === 'available').length, occupied = allRooms.map(status).filter(s => s.key === 'occupied').length; $('#app').innerHTML = `<header class="nav"><a class="brand" href="#" data-tab="home"><img src="./public/school-seal.jpg"><span>COLEGIO DE MONTALBAN<small>RODRIGUEZ, RIZAL</small></span></a><nav><button data-tab="home" class="${state.tab === 'home' ? 'active' : ''}">Home</button><button data-tab="map" class="${state.tab === 'map' ? 'active' : ''}">Campus map</button><button data-tab="finder" class="${state.tab === 'finder' ? 'active' : ''}">Find my classes</button></nav><button class="admin-btn" id="adminBtn">${state.admin ? 'Admin dashboard' : 'Admin login'} <span>↗</span></button></header>
${dbError ? `<div class="db-alert" role="alert"><span>Supabase connection issue: ${esc(dbError)}</span><button id="retryDb">Retry</button></div>` : ''}
${state.tab === 'home' ? home(avail, occupied) : state.tab === 'finder' ? finder() : mapPage()}
<footer><div class="footbrand"><img src="./public/school-seal.jpg"><b>Colegio de Montalban</b></div><span>Campus information · Supabase schedule data</span><span>All times shown in Asia/Manila</span></footer>${state.adminOpen ? adminPanel() : ''}`; bind();
}
function home(avail, occupied) { return `<main><section class="hero"><div class="hero-copy"><div class="eyebrow"><i></i> YOUR CAMPUS, AT A GLANCE</div><h1>Find your class.<br><em>Know your campus.</em></h1><p>Explore Colegio de Montalban, discover your classroom, and plan your week with confidence.</p><div class="hero-actions"><button class="primary" data-tab="map">Explore campus map <b>↗</b></button><button class="secondary" data-tab="finder">Find my classes <b>→</b></button></div><div class="hero-meta"><span><b>04</b> floors</span><span><b>${allRooms.length}</b> mapped places</span><span><b>LIVE</b> room status</span></div></div><div class="hero-visual"><div class="photo-frame"><img src="./public/floor-plans/floor-1.png" alt="First floor plan"><div class="photo-shade"></div><div class="photo-label"><small>EXPLORE YOUR CAMPUS</small><b>Every room.<br>One easy map.</b></div><div class="map-pin">⌖</div></div><div class="floating-stat"><span class="pulse"></span><div><b>${avail} rooms available</b><small>Updated from today's schedule</small></div><div class="stat-number">${occupied}<small>IN CLASS</small></div></div><div class="floor-chip">↗ &nbsp; 4 FLOOR PLANS</div></div></section><section class="feature-strip"><div class="section-label">MADE FOR YOUR SCHOOL DAY</div><h2>Your day, made easier.</h2><div class="features"><button class="feature" data-tab="map"><i class="icon">⌖</i><span><b>Explore the campus</b><small>Find every room across four floors.</small></span><span class="arrow">↗</span></button><button class="feature" data-tab="finder"><i class="icon sun">▤</i><span><b>Find your classes</b><small>Search your weekly schedule.</small></span><span class="arrow">↗</span></button><button class="feature" data-next><i class="icon amber">◷</i><span><b>Find your next class</b><small>Jump to your next classroom.</small></span><span class="arrow">↗</span></button><button class="feature" data-tab="map"><i class="icon green">◉</i><span><b>Room availability</b><small>${avail} rooms free right now.</small></span><span class="arrow">↗</span></button></div></section></main>` }
function mapPage() { let floorRooms = rows[state.floor] || []; let s = allRooms.find(r => r.id === state.selected); return `<main class="workspace"><div class="page-heading"><div><div class="eyebrow">CAMPUS DIRECTORY</div><h1>Explore the campus</h1><p>Choose a floor or room to see where your day takes you.</p></div><label class="searchbox">⌕ <input id="mapSearch" placeholder="Search a room or facility" value="${esc(state.search)}"><kbd>⌘ K</kbd></label>${state.search.trim() ? `<div class="map-search-results">${mapResults().slice(0, 8).map(r => `<button type="button" data-map-result="${esc(r.id)}"><b>${esc(r.name)}</b><small>Floor ${r.floor}${r.roomNumber ? ` · ${esc(r.roomNumber)}` : ""}</small></button>`).join('') || '<p>No matching rooms found.</p>'}</div>` : ''}</div><div class="map-layout"><section class="map-card"><div class="map-toolbar"><div class="floor-tabs">${[1, 2, 3, 4].map(n => `<button data-floor="${n}" class="${state.floor === n ? 'chosen' : ''}">${n}<sup>${['', 'ST', 'ND', 'RD', 'TH'][n]}</sup></button>`).join('')}</div><div class="zoom-tools"><button id="zoomOut" aria-label="Zoom out">−</button><button id="zoomIn" aria-label="Zoom in">+</button><button id="resetZoom" aria-label="Reset view">↺</button></div></div><div class="map-canvas" id="canvas" style="align-items:${state.zoom > 1 ? 'flex-start' : 'center'};justify-content:${state.zoom > 1 ? 'flex-start' : 'center'}"><div class="zoom-space" style="width:${state.zoom * 100}%;height:${state.zoom * 100}%;flex:0 0 auto"><div class="plan" style="width:${100 / state.zoom}%;height:${100 / state.zoom}%;transform:scale(${state.zoom});transform-origin:top left"><img src="./public/floor-plans/floor-${state.floor}.png" alt="${floorName(state.floor)} floor plan"><svg viewBox="0 0 1920 1080" role="group" aria-label="Interactive room map">${floorRooms.map(r => { let st = status(r); return `<g class="room-hit ${st.key} ${state.selected === r.id ? 'selected' : ''} ${state.search && !r.name.toLowerCase().includes(state.search.toLowerCase()) ? 'dimmed' : ''}" data-room="${r.id}" tabindex="0" role="button" aria-label="${esc(r.name)}, ${st.label}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="4"/><title>${esc(r.name)} — ${st.label}</title></g>` }).join('')}</svg></div></div><div class="map-watermark">CDM&nbsp; · &nbsp;${floorName(state.floor).toUpperCase()} FLOOR</div></div><div class="map-legend"><span><i class="available"></i>Available</span><span><i class="occupied"></i>In class</span><span><i class="upcoming"></i>Upcoming</span><span><i class="none"></i>No schedule</span><small>School schedules · Philippine time</small></div></section><aside class="details">${s ? details(s) : `<div class="empty-details"><div class="empty-icon">⌖</div><h3>Pick a place on the map</h3><p>Select any room to view its floor, availability, and schedule.</p><div class="quick-title">QUICK SEARCH</div>${floorRooms.filter(r => r.type === 'Classroom').slice(0, 5).map(r => `<button class="quick-room" data-select="${r.id}">${r.name}<span>→</span></button>`).join('')}</div>`}</aside></div></main>` }
function details(r) { let st = status(r), list = schedule.filter(s => s.roomId === r.id && s.day === state.day).sort((a, b) => a.time.localeCompare(b.time)); return `<div class="detail-top"><span class="type-chip">${esc(r.type)}</span><button class="close" id="clearSelection">×</button></div><h2>${esc(r.name)}</h2><p class="muted">${floorName(r.floor)} floor · Colegio de Montalban</p><div class="statusline"><i class="${st.key}"></i><b>${st.label}</b>${st.entry ? `<span>${st.entry.time} · ${st.entry.subject}</span>` : ''}</div><p class="description">${esc(r.description)}</p><div class="schedule-head"><b>Weekly timetable</b><span>WEEKLY SCHEDULE</span></div><div class="day-pills">${['M', 'T', 'W', 'T', 'F', 'S'].map((v, i) => `<button data-day="${i}" class="${state.day === i ? 'on' : ''}">${v}</button>`).join('')}</div>${list.length ? list.map(s => `<div class="class-row"><span class="time">${s.time}</span><span class="class-info"><b>${esc(s.subject)}</b><small>${esc(s.teacher)} · ${esc(s.section)}</small></span><button class="tiny-map" data-class="${s.id}" title="Show class on map">↗</button></div>`).join('') : `<div class="no-classes">No scheduled classes on ${WEEKDAYS[state.day]}.</div>`}<button class="outline full" data-tab="finder">Find a class here <span>→</span></button>` }
function finder() { let q = state.query.toLowerCase(), matches = schedule.filter(s => { let r = allRooms.find(x => x.id === s.roomId); return [s.subject, s.teacher, s.section, r?.name, WEEKDAYS[s.day]].some(v => v?.toLowerCase().includes(q)) }).sort((a, b) => a.day - b.day || a.time.localeCompare(b.time)); let suggestions = q ? [...new Set([...schedule.flatMap(item => [item.subject, item.teacher, item.section]), ...allRooms.map(r => r.name)].filter(x => x.toLowerCase().includes(q)))].slice(0, 7) : []; return `<main class="workspace finder-page"><div class="page-heading"><div><div class="eyebrow">YOUR WEEK, MADE SIMPLE</div><h1>Find my classes</h1><p>Search a subject, teacher, section, or room to find every class.</p></div><div class="demo-tag"><span>●</span> DEMONSTRATION SCHEDULES</div></div><section class="finder-search"><span>⌕</span><input id="classSearch" value="${esc(state.query)}" placeholder="Try “Grade 10 · Einstein” or “Mathematics”"><kbd>↵</kbd>${suggestions.length ? `<div class="suggestions">${suggestions.map(x => `<button data-suggest="${esc(x)}">${esc(x)}<span>Search →</span></button>`).join('')}</div>` : ''}</section><div class="results-head"><div><b>${q ? matches.length : 0} classes found</b><span>${q ? ' across your week' : ' · Start typing to find your schedule'}</span></div><div class="view-tabs">${['Weekly View', 'Daily View', 'List View'].map(x => `<button data-mode="${x}" class="${state.mode === x ? 'on' : ''}">${x}</button>`).join('')}</div></div>${q ? resultView(matches) : `<section class="finder-empty"><div>✳</div><h3>Your next classroom is one search away.</h3><p>Try a subject, teacher, or your section name.</p><div>${['Mathematics', 'Ms. Santos', 'Grade 10 · Einstein'].map(x => `<button data-suggest="${x}">${x} ↗</button>`).join('')}</div></section>`}</main>` }
function resultView(ms) { if (state.mode === 'Weekly View') return `<div class="week-grid">${WEEKDAYS.map((d, i) => `<section><h3>${d}</h3>${ms.filter(s => s.day === i).map(card).join('') || '<p class="day-empty">No classes</p>'}</section>`).join('')}</div>`; if (state.mode === 'Daily View') return `<div class="day-select">${WEEKDAYS.map((d, i) => `<button data-day="${i}" class="${state.day === i ? 'on' : ''}">${d}</button>`).join('')}</div><div class="result-list">${ms.filter(s => s.day === state.day).map(card).join('') || '<p class="day-empty">No classes on this day.</p>'}</div>`; return `<div class="result-list">${ms.map(card).join('')}</div>` }
function card(s) { let r = allRooms.find(x => x.id === s.roomId); return `<article class="result-card"><div class="date-square"><b>${['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][s.day]}</b><small>${s.time}</small></div><div class="result-subject"><b>${esc(s.subject)}</b><small>${esc(s.teacher)} · ${esc(s.section)}</small></div><div class="result-room"><small>ROOM · FLOOR ${r.floor}</small><b>${esc(r.name)}</b></div><button class="show-map" data-class="${s.id}">SHOW ON MAP <span>↗</span></button></article>` }
function adminPanel() {
  return `<div class="modal-scrim" id="scrim"><section class="admin-modal ${state.admin ? 'admin-dashboard-modal' : ''}">
    <button class="close" id="closeAdmin">×</button><div class="eyebrow">CAMPUS MANAGEMENT</div>
    <h2>${state.admin ? 'Admin dashboard' : 'Administrator sign in'}</h2>
    ${!state.admin ? `<p>Use the administrator email and password created in Supabase Auth.</p>
      <form id="login"><label>Email<input name="email" type="email" autocomplete="username" required></label>
      <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
      <button class="primary" type="submit">Sign in →</button></form>` : `
      <div class="admin-toolbar"><div class="admin-summary"><b>${allRooms.length}</b> rooms <b>${schedule.length}</b> schedules</div><div class="admin-toolbar-actions"><button id="addRoom" class="outline">＋ Add room</button><button id="logout" class="outline">Sign out</button></div></div>
      <div class="admin-map-layout">
        <section class="admin-map-panel">
          <div class="admin-panel-heading"><h3>Select a room</h3><small>Choose a floor, then click a room on the map.</small></div>
          <div class="admin-floor-tabs">${[1, 2, 3, 4].map(n => `<button data-admin-floor="${n}" class="${state.adminFloor === n ? 'chosen' : ''}">${n}<sup>${['', 'ST', 'ND', 'RD', 'TH'][n]}</sup></button>`).join('')}</div>
          <div class="map-canvas admin-map-canvas"><div class="plan"><img src="./public/floor-plans/floor-${state.adminFloor}.png" alt="${floorName(state.adminFloor)} floor plan"><svg viewBox="0 0 1920 1080" role="group" aria-label="Select a room on the ${floorName(state.adminFloor)} floor">${(rows[state.adminFloor] || []).map(r => { const st = status(r); return `<g class="room-hit ${st.key} ${state.adminRoomId === r.id ? 'selected' : ''}" data-admin-room="${esc(r.id)}" tabindex="0" role="button" aria-label="Select ${esc(r.name)}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="4"/><title>${esc(r.name)}</title></g>`; }).join('')}</svg></div></div>
          <button id="editSelectedRoom" class="outline admin-edit-room" ${state.adminRoomId ? '' : 'disabled'}>Edit selected room name</button>
        </section>
        <section class="admin-room-schedules">${scheduleAdmin()}</section>
      </div>
      <p class="admin-note">Schedule changes are saved in Supabase.</p>`}
  </section></div>`;
}
function scheduleAdmin() {
  const selectedRoom = allRooms.find(r => r.id === state.adminRoomId);
  const editing = schedule.find(s => s.id === state.editScheduleId && s.roomId === state.adminRoomId);
  const roomSchedules = schedule.filter(s => s.roomId === state.adminRoomId).sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
  if (!selectedRoom) return '<div class="admin-no-room">No rooms are available. Check the room data in Supabase.</div>';
  return `<div class="admin-panel-heading"><div><h3>${esc(selectedRoom.name)}</h3><small>Floor ${selectedRoom.floor} · ${roomSchedules.length} schedule${roomSchedules.length === 1 ? '' : 's'}</small></div></div>
    ${state.scheduleMessage ? `<p class="admin-schedule-message" role="status">${esc(state.scheduleMessage)}</p>` : ''}
    <form id="scheduleForm" class="schedule-form"><input type="hidden" name="roomId" value="${esc(selectedRoom.id)}">
      <label>Day<select name="day">${WEEKDAYS.map((d, i) => `<option value="${i}" ${editing?.day === i ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
      <label>Start<input name="time" type="time" value="${editing?.time || '08:00'}" required></label>
      <label>End<input name="end" type="time" value="${editing?.end || '08:45'}" required></label>
      <label>Subject<input name="subject" value="${esc(editing?.subject || '')}" required></label>
      <label>Teacher<input name="teacher" value="${esc(editing?.teacher || '')}" required></label>
      <label>Section<input name="section" value="${esc(editing?.section || '')}" required></label>
      <button class="primary" type="submit">${editing ? 'Save changes' : 'Add schedule'}</button>${editing ? '<button type="button" id="cancelSchedule" class="outline">Cancel edit</button>' : ''}
    </form>
    <div class="admin-schedule-heading"><h3>Schedules for this room</h3>${roomSchedules.length ? `<small>${roomSchedules.length} total</small>` : ''}</div>
    <div class="admin-schedule-list">${roomSchedules.map(s => `<article class="admin-schedule-row ${state.editScheduleId === s.id ? 'editing' : ''}"><div><b>${WEEKDAYS[s.day]} · ${s.time}–${s.end}</b><span>${esc(s.subject)}</span><small>${esc(s.teacher)} · ${esc(s.section)}</small></div><div class="admin-schedule-actions"><button type="button" data-edit-schedule="${esc(s.id)}">Edit</button><button type="button" data-delete-schedule="${esc(s.id)}" aria-label="Delete ${esc(s.subject)}">Delete</button></div></article>`).join('') || '<p class="admin-empty-schedules">No schedules for this room yet. Add one above.</p>'}</div>`;
}
function bind() {
  document.querySelectorAll('[data-tab]').forEach(button => button.onclick = () => {
    state.tab = button.dataset.tab; state.selected = null; render();
  });
  $('#adminBtn').onclick = () => { state.adminOpen = true; render(); };
  $('#closeAdmin')?.addEventListener('click', () => { state.adminOpen = false; render(); });
  $('#scrim')?.addEventListener('click', event => { if (event.target.id === 'scrim') { state.adminOpen = false; render(); } });
  $('#retryDb')?.addEventListener('click', loadDatabase);
  $('#mapSearch')?.addEventListener('input', event => {
    const input = event.target, start = input.selectionStart, end = input.selectionEnd;
    state.search = input.value; render(); const next = $('#mapSearch'); next?.focus(); next?.setSelectionRange(start, end);
  });
  $('#classSearch')?.addEventListener('input', event => {
    const input = event.target, start = input.selectionStart, end = input.selectionEnd;
    state.query = input.value; render(); const next = $('#classSearch'); next?.focus(); next?.setSelectionRange(start, end);
  });
  document.querySelectorAll('[data-map-result]').forEach(button => button.onclick = () => {
    const found = allRooms.find(item => item.id === button.dataset.mapResult);
    if (found) { state.floor = found.floor; state.selected = found.id; render(); }
  });
  document.querySelectorAll('[data-floor]').forEach(button => button.onclick = () => {
    state.floor = Number(button.dataset.floor); state.selected = null; render();
  });
  document.querySelectorAll('[data-admin-floor]').forEach(button => button.onclick = () => {
    state.adminFloor = Number(button.dataset.adminFloor); render();
  });
  document.querySelectorAll('[data-admin-room]').forEach(group => {
    const select = () => {
      state.adminRoomId = group.dataset.adminRoom;
      state.editScheduleId = null;
      state.scheduleMessage = '';
      render();
    };
    group.onclick = select;
    group.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } };
  });
  document.querySelectorAll('[data-room]').forEach(group => {
    const select = () => { state.selected = group.dataset.room; state.floor = allRooms.find(room => room.id === state.selected)?.floor || 1; render(); };
    group.onclick = select;
    group.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } };
  });
  document.querySelectorAll('[data-select]').forEach(button => button.onclick = () => { state.selected = button.dataset.select; render(); });
  $('#clearSelection')?.addEventListener('click', () => { state.selected = null; render(); });
  document.querySelectorAll('[data-day]').forEach(button => button.onclick = () => { state.day = Number(button.dataset.day); render(); });
  document.querySelectorAll('[data-mode]').forEach(button => button.onclick = () => { state.mode = button.dataset.mode; render(); });
  document.querySelectorAll('[data-suggest]').forEach(button => button.onclick = () => { state.query = button.dataset.suggest; render(); });
  document.querySelectorAll('[data-class]').forEach(button => button.onclick = () => {
    const item = schedule.find(row => row.id === button.dataset.class), room = allRooms.find(value => value.id === item?.roomId);
    if (!room) return; state.tab = 'map'; state.floor = room.floor; state.selected = room.id; state.day = item.day; state.zoom = 1.2; render();
  });
  $('#zoomIn')?.addEventListener('click', () => { state.zoom = Math.min(2.3, state.zoom + .2); render(); });
  $('#zoomOut')?.addEventListener('click', () => { state.zoom = Math.max(.65, state.zoom - .2); render(); });
  $('#resetZoom')?.addEventListener('click', () => { state.zoom = 1; render(); });
  $('[data-next]')?.addEventListener('click', findNext);
  $('#login')?.addEventListener('submit', async event => {
    event.preventDefault(); const form = new FormData(event.target);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: form.get('email'), password: form.get('password') });
      if (error) throw error;
      if (!(await isAdministrator(data.user.id))) { await supabase.auth.signOut(); throw new Error('This account is not listed as a campus administrator.'); }
      state.admin = true; await loadDatabase(); state.adminOpen = true; render();
    } catch (error) { alert('Sign in failed: ' + error.message); }
  });
  $('#logout')?.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut(); if (error) { alert(error.message); return; }
    state.admin = false; await loadDatabase(); state.adminOpen = true; render();
  });
  document.querySelectorAll('[data-edit-room]').forEach(button => button.onclick = async () => {
    const room = allRooms.find(item => item.id === button.dataset.editRoom), name = prompt('Room name', room.name);
    if (!name?.trim()) return;
    try { unwrap(await supabase.from('rooms').update({ room_name: name.trim() }).eq('id', room.id).select('id').single()); await loadDatabase(); state.adminOpen = true; render(); }
    catch (error) { alert(error.message); }
  });
  $('#editSelectedRoom')?.addEventListener('click', async () => {
    const room = allRooms.find(item => item.id === state.adminRoomId);
    if (!room) return;
    const name = prompt('Room name', room.name);
    if (!name?.trim()) return;
    try {
      unwrap(await supabase.from('rooms').update({ room_name: name.trim() }).eq('id', room.id).select('id').single());
      await loadDatabase(); state.adminOpen = true; render();
    } catch (error) { alert(error.message); }
  });
  $('#addRoom')?.addEventListener('click', async () => {
    const name = prompt('Room or facility name'); if (!name?.trim()) return;
    const floor = Number(prompt('Floor (1–4)', '1')), template = (rows[floor] || []).find(item => item.type === 'Classroom');
    if (!template) { alert('No classroom map position is available for that floor.'); return; }
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    try {
      const inserted = unwrap(await supabase.from('rooms').insert({
        id: 'F' + floor + '-' + slug + '-' + crypto.randomUUID().slice(0, 8), room_name: name.trim(), floor_id: floor,
        building: 'Colegio de Montalban', room_type: 'Classroom', description: 'Classroom on the ' + floorName(floor).toLowerCase() + ' floor.',
        polygon: { x: template.x, y: template.y, w: template.w, h: template.h }, published: true,
      }).select('id').single());
      state.adminRoomId = inserted.id; state.adminFloor = floor;
      await loadDatabase(); state.adminOpen = true; render();
    } catch (error) { alert(error.message); }
  });
  document.querySelectorAll('[data-admin-section]').forEach(button => button.onclick = () => {
    state.adminSection = button.dataset.adminSection; state.editScheduleId = null; state.scheduleMessage = ''; render();
  });
  document.querySelectorAll('[data-edit-schedule]').forEach(button => button.onclick = () => {
    const entry = schedule.find(item => item.id === button.dataset.editSchedule);
    if (!entry) return;
    state.editScheduleId = entry.id; state.adminRoomId = entry.roomId;
    state.adminFloor = allRooms.find(room => room.id === entry.roomId)?.floor || state.adminFloor;
    state.scheduleMessage = ''; render();
  });
  document.querySelectorAll('[data-delete-schedule]').forEach(button => button.onclick = async () => {
    if (!confirm('Delete this schedule?')) return;
    try { unwrap(await supabase.from('schedules').delete().eq('id', button.dataset.deleteSchedule).select('id').single()); await loadDatabase(); state.adminOpen = true; state.adminSection = 'schedules'; render(); }
    catch (error) { alert(error.message); }
  });
  $('#cancelSchedule')?.addEventListener('click', () => { state.editScheduleId = null; state.scheduleMessage = ''; render(); });
  $('#scheduleForm')?.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target.matches('input:not([type]), input[type="text"], textarea')) event.preventDefault();
  });
  $('#scheduleForm')?.addEventListener('submit', async event => {
    event.preventDefault(); const form = new FormData(event.target);
    const payload = { roomId: form.get('roomId'), day: Number(form.get('day')), time: form.get('time'), end: form.get('end'), subject: form.get('subject').trim(), teacher: form.get('teacher').trim(), section: form.get('section').trim() };
    if (payload.end <= payload.time) { alert('The end time must be after the start time.'); return; }
    const wasEditing = Boolean(state.editScheduleId);
    try {
      await saveScheduleToSupabase(payload, state.editScheduleId);
      state.scheduleMessage = wasEditing ? 'Schedule updated in Supabase.' : 'Schedule added to Supabase.';
      state.editScheduleId = null; await loadDatabase(); state.adminOpen = true; state.adminSection = 'schedules'; render();
    } catch (error) { alert(error.message); }
  });
  window.onkeydown = event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); (state.tab === 'map' ? $('#mapSearch') : $('#classSearch'))?.focus(); }
    if (event.key === 'Escape' && state.adminOpen) { state.adminOpen = false; render(); }
  };
}
function findNext() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const day = now.getDay() >= 1 && now.getDay() <= 6 ? now.getDay() - 1 : 0;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const item = [...schedule].sort((a,b) => a.day-b.day || a.time.localeCompare(b.time)).find(row => row.day > day || (row.day === day && row.time > now.toTimeString().slice(0,5)));
  if (!item) { alert('No more classes are scheduled for the school week.'); return; }
  const room = allRooms.find(value => value.id === item.roomId); if (!room) return;
  state.tab='map'; state.floor=room.floor; state.selected=room.id; state.day=item.day; state.zoom=1.2; render();
}
// Preserve the visible map center when a render rebuilds its DOM after zoom or selection.
const renderBeforeMapScrollRestore = render;
render = function () {
    const oldCanvas = $('#canvas');
    const anchor = state.tab === 'map' && oldCanvas ? {
        x: (oldCanvas.scrollLeft + oldCanvas.clientWidth / 2) / oldCanvas.scrollWidth,
        y: (oldCanvas.scrollTop + oldCanvas.clientHeight / 2) / oldCanvas.scrollHeight,
    } : null;
    renderBeforeMapScrollRestore();
    if (anchor) requestAnimationFrame(() => {
        const canvas = $('#canvas');
        if (!canvas) return;
        canvas.scrollLeft = anchor.x * canvas.scrollWidth - canvas.clientWidth / 2;
        canvas.scrollTop = anchor.y * canvas.scrollHeight - canvas.clientHeight / 2;
    });
};
setInterval(() => { if (state.tab === 'map' && !state.adminOpen) render() }, 60000); loadDatabase();
