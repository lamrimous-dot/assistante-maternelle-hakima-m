import React, { useState, useEffect, useMemo } from "react";
import {
  Feather, Home, LogOut, UtensilsCrossed, Moon, Palette as PaletteIcon,
  Baby, HeartPulse, Camera, Plus, X, Calendar, Users, ClipboardList,
  Clock, Trash2, ChevronLeft, ChevronRight, Check, Pencil, Phone, Mail,
  ArrowLeft, CalendarDays, Printer, Save, Upload, ShieldCheck
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */
const colors = {
  bg: "#FBF7F0",
  card: "#FFFFFF",
  ink: "#2B2A28",
  inkSoft: "#918A7E",
  line: "#EFE6D8",
  forest: "#2F6B5E",
  forestDeep: "#1F4A40",
  coral: "#E2734A",
  mustard: "#DFA23A",
  rose: "#D97E93",
  sky: "#4E8B8A",
  danger: "#C4574A",
};
const CHILD_PALETTE = [colors.coral, colors.forest, colors.rose, colors.mustard, colors.sky];

const EVENT_TYPES = [
  { key: "arrivee", label: "Arrivée", icon: Home, color: colors.forest },
  { key: "repas", label: "Repas", icon: UtensilsCrossed, color: colors.coral },
  { key: "sieste", label: "Sieste", icon: Moon, color: colors.sky },
  { key: "activite", label: "Activité", icon: PaletteIcon, color: colors.mustard },
  { key: "change", label: "Change", icon: Baby, color: colors.rose },
  { key: "soins", label: "Soins", icon: HeartPulse, color: colors.danger },
  { key: "photo", label: "Note / Photo", icon: Camera, color: colors.forestDeep },
  { key: "depart", label: "Départ", icon: LogOut, color: colors.inkSoft },
];
const EVENT_MAP = Object.fromEntries(EVENT_TYPES.map(e => [e.key, e]));

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_LABELS_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);
const isoDayIndex = (d) => (d.getDay() + 6) % 7;
function startOfWeek(d) {
  const date = new Date(d);
  date.setDate(date.getDate() - isoDayIndex(date));
  date.setHours(0, 0, 0, 0);
  return date;
}
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const toISODate = (d) => d.toISOString().slice(0, 10);
function fmtTime(ts) {
  try { return new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }
  catch { return "--:--"; }
}
function fmtDateLong(iso) {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch { return iso; }
}
function fmtDateShort(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
function fmtAge(birthISO) {
  if (!birthISO) return "";
  const b = new Date(birthISO + "T00:00:00");
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months--;
  if (months < 0) return "";
  if (months < 24) return months + " mois";
  return Math.floor(months / 12) + " ans";
}
function minutesBetween(a, b) { return Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000)); }
function fmtHM(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h} h ${String(m).padStart(2, "0")} m`;
}

/* ------------------------------------------------------------------ */
/* Root component                                                       */
/* ------------------------------------------------------------------ */
export default function App() {
  const [ready, setReady] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [children, setChildren] = useState([]);
  const [events, setEvents] = useState({});   // { childId: [ {id,type,ts,note} ] }
  const [menus, setMenus] = useState({});     // { dateISO: {entree,plat,dessert,gouter} }

  const [tab, setTab] = useState("enfants");  // enfants | planning | menus | presences
  const [view, setView] = useState("list");   // list | detail
  const [activeChildId, setActiveChildId] = useState(null);
  const [childSubTab, setChildSubTab] = useState("events"); // events | timeline

  const [showChildForm, setShowChildForm] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [logModal, setLogModal] = useState(null); // event type key

  const [journalDate, setJournalDate] = useState(todayISO());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [menuDate, setMenuDate] = useState(todayISO());
  const [presenceMonth, setPresenceMonth] = useState(new Date().toISOString().slice(0, 7));
  const [presenceChildId, setPresenceChildId] = useState(null);
  const [printMode, setPrintMode] = useState(null); // { type:'presence'|'journal', child, ... }
  const [showBackup, setShowBackup] = useState(false);

  /* ---------------- load ---------------- */
  useEffect(() => {
    (async () => {
      try {
        const c = await window.storage.get("children", false);
        setChildren(c ? JSON.parse(c.value) : []);
      } catch { setChildren([]); }
      try {
        const e = await window.storage.get("events", false);
        setEvents(e ? JSON.parse(e.value) : {});
      } catch { setEvents({}); }
      try {
        const m = await window.storage.get("menus", false);
        setMenus(m ? JSON.parse(m.value) : {});
      } catch { setMenus({}); }
      setReady(true);
    })();
  }, []);

  async function persist(key, value, setter) {
    setter(value);
    try {
      const res = await window.storage.set(key, JSON.stringify(value), false);
      if (!res) setStorageOk(false); else setStorageOk(true);
    } catch { setStorageOk(false); }
  }

  const saveChildren = (next) => persist("children", next, setChildren);
  const saveEvents = (next) => persist("events", next, setEvents);
  const saveMenus = (next) => persist("menus", next, setMenus);

  /* ---------------- child CRUD ---------------- */
  function openNewChild() { setEditingChild(null); setShowChildForm(true); }
  function openEditChild(child) { setEditingChild(child); setShowChildForm(true); }

  function upsertChild(child) {
    let next;
    if (editingChild) {
      next = children.map(c => c.id === child.id ? child : c);
    } else {
      const color = CHILD_PALETTE[children.length % CHILD_PALETTE.length];
      next = [...children, { ...child, id: uid(), color }];
    }
    saveChildren(next);
    setShowChildForm(false);
  }
  function removeChild(id) {
    saveChildren(children.filter(c => c.id !== id));
    const nextEvents = { ...events }; delete nextEvents[id];
    saveEvents(nextEvents);
    if (activeChildId === id) { setView("list"); setActiveChildId(null); }
  }

  /* ---------------- events ---------------- */
  function logEvent(childId, type, ts, note) {
    const list = events[childId] ? [...events[childId]] : [];
    list.push({ id: uid(), type, ts, note: note || "" });
    list.sort((a, b) => new Date(a.ts) - new Date(b.ts));
    saveEvents({ ...events, [childId]: list });
  }
  function deleteEvent(childId, eventId) {
    const list = (events[childId] || []).filter(e => e.id !== eventId);
    saveEvents({ ...events, [childId]: list });
  }

  const activeChild = children.find(c => c.id === activeChildId) || null;

  /* ---------------- derived: today's events per child/date ---------------- */
  function eventsForDate(childId, dateISO) {
    return (events[childId] || []).filter(e => e.ts.slice(0, 10) === dateISO);
  }

  /* ---------------- presence calc ---------------- */
  function monthlyPresence(childId, monthISO) {
    const list = (events[childId] || []).filter(e => e.ts.slice(0, 7) === monthISO);
    const byDay = {};
    list.forEach(e => {
      const day = e.ts.slice(0, 10);
      byDay[day] = byDay[day] || [];
      byDay[day].push(e);
    });
    let totalMins = 0;
    const days = [];
    Object.keys(byDay).sort().forEach(day => {
      const dayEvents = byDay[day].sort((a, b) => new Date(a.ts) - new Date(b.ts));
      const arrivals = dayEvents.filter(e => e.type === "arrivee");
      const departs = dayEvents.filter(e => e.type === "depart");
      let mins = 0;
      const n = Math.min(arrivals.length, departs.length);
      for (let i = 0; i < n; i++) mins += minutesBetween(arrivals[i].ts, departs[i].ts);
      if (mins > 0) { totalMins += mins; days.push({ day, mins }); }
    });
    return { totalMins, days };
  }

  if (!ready) {
    return (
      <div style={{ ...s.app, alignItems: "center", justifyContent: "center" }}>
        <FontStyle />
        <div style={{ color: colors.inkSoft, fontFamily: "Inter, sans-serif" }}>Chargement…</div>
      </div>
    );
  }

  return (
    <div style={s.app} id="app-shell">
      <FontStyle />
      <Header
        title={
          view === "detail" && activeChild
            ? `${activeChild.firstName}`
            : { enfants: "Mes enfants", planning: "Planning", menus: "Mes menus", presences: "Présences" }[tab]
        }
        onBack={view === "detail" ? () => { setView("list"); setActiveChildId(null); } : null}
        storageOk={storageOk}
        onOpenBackup={() => setShowBackup(true)}
      />

      <main style={s.main}>
        {view === "detail" && activeChild ? (
          <ChildDetail
            child={activeChild}
            childSubTab={childSubTab}
            setChildSubTab={setChildSubTab}
            journalDate={journalDate}
            setJournalDate={setJournalDate}
            eventsForDate={eventsForDate}
            onLog={(type) => setLogModal(type)}
            onDeleteEvent={(eid) => deleteEvent(activeChild.id, eid)}
            onEdit={() => openEditChild(activeChild)}
            onExportDay={(dayEvents) => setPrintMode({ type: "journal", child: activeChild, date: journalDate, events: dayEvents })}
          />
        ) : tab === "enfants" ? (
          <ChildrenList
            children={children}
            onOpen={(id) => { setActiveChildId(id); setView("detail"); setChildSubTab("events"); setJournalDate(todayISO()); }}
            onAdd={openNewChild}
          />
        ) : tab === "planning" ? (
          <Planning
            children={children}
            weekStart={weekStart}
            setWeekStart={setWeekStart}
          />
        ) : tab === "menus" ? (
          <Menus
            menus={menus}
            menuDate={menuDate}
            setMenuDate={setMenuDate}
            onSave={(dateISO, data) => saveMenus({ ...menus, [dateISO]: data })}
          />
        ) : (
          <Presence
            children={children}
            presenceMonth={presenceMonth}
            setPresenceMonth={setPresenceMonth}
            presenceChildId={presenceChildId || (children[0] && children[0].id)}
            setPresenceChildId={setPresenceChildId}
            monthlyPresence={monthlyPresence}
            onExport={(payload) => setPrintMode(payload)}
          />
        )}
      </main>

      {view !== "detail" && (
        <BottomNav tab={tab} setTab={setTab} />
      )}

      {showChildForm && (
        <ChildForm
          initial={editingChild}
          onCancel={() => setShowChildForm(false)}
          onSave={upsertChild}
          onDelete={editingChild ? () => { removeChild(editingChild.id); setShowChildForm(false); } : null}
        />
      )}

      {logModal && activeChild && (
        <LogEventModal
          eventType={EVENT_MAP[logModal]}
          onCancel={() => setLogModal(null)}
          onConfirm={(ts, note) => { logEvent(activeChild.id, logModal, ts, note); setLogModal(null); }}
        />
      )}

      {printMode && (
        <PrintOverlay data={printMode} onClose={() => setPrintMode(null)} />
      )}

      {showBackup && (
        <BackupModal
          children={children}
          events={events}
          menus={menus}
          onRestore={(data) => {
            if (data.children) saveChildren(data.children);
            if (data.events) saveEvents(data.events);
            if (data.menus) saveMenus(data.menus);
          }}
          onClose={() => setShowBackup(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header + bottom nav                                                  */
/* ------------------------------------------------------------------ */
function Header({ title, onBack, storageOk, onOpenBackup }) {
  return (
    <header style={s.header}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {onBack ? (
          <button onClick={onBack} style={s.iconBtnGhost} aria-label="Retour">
            <ArrowLeft size={20} color="#fff" />
          </button>
        ) : (
          <div style={s.logoMark}><Feather size={16} color={colors.forestDeep} /></div>
        )}
        <div>
          <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 20, color: "#fff", lineHeight: 1.1 }}>{title}</div>
          {!onBack && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontFamily: "Inter, sans-serif" }}>Nid — carnet de bord</div>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {!storageOk && (
          <div style={{ fontSize: 11, color: "#fff", background: "rgba(0,0,0,0.2)", padding: "4px 8px", borderRadius: 8, fontFamily: "Inter, sans-serif" }}>
            Sauvegarde indisponible
          </div>
        )}
        <button onClick={onOpenBackup} style={s.iconBtnGhost} aria-label="Sauvegarde et export">
          <Save size={18} color="#fff" />
        </button>
      </div>
    </header>
  );
}

function BottomNav({ tab, setTab }) {
  const items = [
    { key: "enfants", label: "Enfants", icon: Users },
    { key: "planning", label: "Planning", icon: Calendar },
    { key: "menus", label: "Menus", icon: UtensilsCrossed },
    { key: "presences", label: "Présences", icon: Clock },
  ];
  return (
    <nav style={s.bottomNav}>
      {items.map(({ key, label, icon: Icon }) => {
        const active = tab === key;
        return (
          <button key={key} onClick={() => setTab(key)} style={s.navBtn}>
            <Icon size={20} color={active ? colors.forest : colors.inkSoft} strokeWidth={active ? 2.4 : 2} />
            <span style={{ fontSize: 11, color: active ? colors.forest : colors.inkSoft, fontFamily: "Inter, sans-serif", fontWeight: active ? 600 : 500 }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Children list                                                        */
/* ------------------------------------------------------------------ */
function ChildrenList({ children, onOpen, onAdd }) {
  return (
    <div style={{ padding: 16 }}>
      {children.length === 0 && (
        <div style={s.emptyState}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🪺</div>
          <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 17, color: colors.ink, marginBottom: 4 }}>Le nid est vide</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: colors.inkSoft, marginBottom: 16 }}>
            Ajoutez un enfant pour commencer à tenir son carnet de bord.
          </div>
          <button onClick={onAdd} style={s.primaryBtn}><Plus size={16} /> Ajouter un enfant</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {children.map(c => (
          <button key={c.id} onClick={() => onOpen(c.id)} style={s.childCard}>
            <div style={{ ...s.avatar, background: c.color }}>
              {c.firstName ? c.firstName[0].toUpperCase() : "?"}
            </div>
            <div style={{ textAlign: "left", flex: 1 }}>
              <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 16, color: colors.ink }}>
                {c.firstName} {c.lastName}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: colors.inkSoft }}>
                {c.gender === "F" ? "Fille" : "Garçon"} · {fmtAge(c.birthDate)}
              </div>
            </div>
            <ChevronRight size={18} color={colors.inkSoft} />
          </button>
        ))}
      </div>

      {children.length > 0 && (
        <button onClick={onAdd} style={{ ...s.primaryBtn, marginTop: 16, width: "100%", justifyContent: "center" }}>
          <Plus size={16} /> Ajouter un enfant
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Child detail (dashboard + timeline)                                  */
/* ------------------------------------------------------------------ */
function ChildDetail({ child, childSubTab, setChildSubTab, journalDate, setJournalDate, eventsForDate, onLog, onDeleteEvent, onEdit, onExportDay }) {
  const dayEvents = eventsForDate(child.id, journalDate).slice().sort((a, b) => new Date(a.ts) - new Date(b.ts));

  return (
    <div>
      <div style={{ padding: "14px 16px 0" }}>
        <div style={s.subTabRow}>
          {[["events", "Aujourd'hui"], ["timeline", "Journal"]].map(([key, label]) => (
            <button key={key} onClick={() => setChildSubTab(key)} style={{ ...s.subTab, ...(childSubTab === key ? s.subTabActive : {}) }}>
              {label}
            </button>
          ))}
          <button onClick={onEdit} style={s.iconBtnLight} aria-label="Modifier la fiche">
            <Pencil size={15} color={colors.forest} />
          </button>
        </div>
      </div>

      {childSubTab === "events" ? (
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {EVENT_TYPES.map(et => (
            <button key={et.key} onClick={() => onLog(et.key)} style={{ ...s.eventBtn, background: et.color }}>
              <et.icon size={22} color="#fff" />
              <span style={{ fontFamily: "Fredoka, sans-serif", fontSize: 13.5, color: "#fff" }}>{et.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ padding: 16 }}>
          <DateStepper dateISO={journalDate} onChange={setJournalDate} />
          <button onClick={() => onExportDay(dayEvents)} style={{ ...s.smallGhostBtn, marginTop: 10 }}>
            <Printer size={14} /> Exporter cette journée en PDF
          </button>
          <div style={{ marginTop: 14 }}>
            {dayEvents.length === 0 ? (
              <div style={{ ...s.emptyState, padding: "28px 16px" }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: colors.inkSoft }}>Aucun évènement ce jour-là.</div>
              </div>
            ) : (
              <div style={{ position: "relative", paddingLeft: 22 }}>
                <div style={s.timelineRail} />
                {dayEvents.map(ev => {
                  const meta = EVENT_MAP[ev.type];
                  return (
                    <div key={ev.id} style={{ position: "relative", marginBottom: 14 }}>
                      <div style={{ ...s.timelineDot, background: meta.color }}>
                        <meta.icon size={12} color="#fff" />
                      </div>
                      <div style={s.timelineCard}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 14.5, color: colors.ink }}>{meta.label}</div>
                            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: colors.inkSoft }}>{fmtTime(ev.ts)}</div>
                          </div>
                          <button onClick={() => onDeleteEvent(ev.id)} style={s.trashBtn} aria-label="Supprimer">
                            <Trash2 size={14} color={colors.inkSoft} />
                          </button>
                        </div>
                        {ev.note && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: colors.ink, marginTop: 6 }}>{ev.note}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DateStepper({ dateISO, onChange }) {
  const d = new Date(dateISO + "T00:00:00");
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 12, padding: "8px 10px" }}>
      <button onClick={() => onChange(toISODate(addDays(d, -1)))} style={s.iconBtnLight}><ChevronLeft size={16} color={colors.forest} /></button>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: colors.ink, fontWeight: 600, textTransform: "capitalize" }}>{fmtDateLong(dateISO)}</div>
      <button onClick={() => onChange(toISODate(addDays(d, 1)))} style={s.iconBtnLight}><ChevronRight size={16} color={colors.forest} /></button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Log event modal                                                      */
/* ------------------------------------------------------------------ */
function LogEventModal({ eventType, onCancel, onConfirm }) {
  const now = new Date();
  const [time, setTime] = useState(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
  const [note, setNote] = useState("");

  function confirm() {
    const [h, m] = time.split(":").map(Number);
    const ts = new Date();
    ts.setHours(h, m, 0, 0);
    onConfirm(ts.toISOString(), note.trim());
  }

  return (
    <Overlay onClose={onCancel}>
      <div style={{ ...s.sheet, maxWidth: 380 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ ...s.eventIconRound, background: eventType.color }}><eventType.icon size={18} color="#fff" /></div>
          <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 18, color: colors.ink }}>{eventType.label}</div>
        </div>
        <Field label="Heure">
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={s.input} />
        </Field>
        <Field label="Note (facultatif)">
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Un petit mot pour les parents…" style={{ ...s.input, resize: "none", fontFamily: "Inter, sans-serif" }} />
        </Field>
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button onClick={onCancel} style={s.secondaryBtn}>Annuler</button>
          <button onClick={confirm} style={{ ...s.primaryBtn, flex: 1, justifyContent: "center" }}><Check size={16} /> Enregistrer</button>
        </div>
      </div>
    </Overlay>
  );
}

/* ------------------------------------------------------------------ */
/* Child form                                                           */
/* ------------------------------------------------------------------ */
function ChildForm({ initial, onCancel, onSave, onDelete }) {
  const [firstName, setFirstName] = useState(initial?.firstName || "");
  const [lastName, setLastName] = useState(initial?.lastName || "");
  const [gender, setGender] = useState(initial?.gender || "F");
  const [birthDate, setBirthDate] = useState(initial?.birthDate || "");
  const [days, setDays] = useState(initial?.schedule?.days || [0, 1, 2, 3, 4]);
  const [start, setStart] = useState(initial?.schedule?.start || "09:00");
  const [end, setEnd] = useState(initial?.schedule?.end || "17:00");
  const [parents, setParents] = useState(initial?.parents?.length ? initial.parents : [{ name: "", phone: "", email: "" }]);

  function toggleDay(i) {
    setDays(days.includes(i) ? days.filter(d => d !== i) : [...days, i].sort());
  }
  function updateParent(i, field, value) {
    setParents(parents.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  }
  function addParent() { setParents([...parents, { name: "", phone: "", email: "" }]); }
  function removeParent(i) { setParents(parents.filter((_, idx) => idx !== i)); }

  function submit() {
    if (!firstName.trim()) return;
    onSave({
      ...(initial || {}),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      birthDate,
      schedule: { days, start, end },
      parents: parents.filter(p => p.name.trim() || p.phone.trim() || p.email.trim()),
    });
  }

  return (
    <Overlay onClose={onCancel} full>
      <div style={s.fullSheet}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 20, color: colors.ink }}>
            {initial ? "Modifier la fiche" : "Nouvel enfant"}
          </div>
          <button onClick={onCancel} style={s.iconBtnLight}><X size={18} color={colors.ink} /></button>
        </div>

        <Field label="Prénom"><input value={firstName} onChange={e => setFirstName(e.target.value)} style={s.input} placeholder="Jade" /></Field>
        <Field label="Nom"><input value={lastName} onChange={e => setLastName(e.target.value)} style={s.input} placeholder="Boo" /></Field>

        <Field label="Sexe">
          <div style={{ display: "flex", gap: 8 }}>
            {[["F", "Fille"], ["G", "Garçon"]].map(([val, label]) => (
              <button key={val} onClick={() => setGender(val)} style={{ ...s.toggleBtn, ...(gender === val ? { background: colors.forest, color: "#fff", borderColor: colors.forest } : {}) }}>
                {label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Date de naissance"><input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} style={s.input} /></Field>

        <Field label="Jours d'accueil">
          <div style={{ display: "flex", gap: 6 }}>
            {DAY_LABELS.map((d, i) => (
              <button key={i} onClick={() => toggleDay(i)} style={{ ...s.dayPill, ...(days.includes(i) ? { background: colors.forest, color: "#fff", borderColor: colors.forest } : {}) }}>
                {d}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Horaires">
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="time" value={start} onChange={e => setStart(e.target.value)} style={s.input} />
            <span style={{ color: colors.inkSoft, fontFamily: "Inter, sans-serif" }}>à</span>
            <input type="time" value={end} onChange={e => setEnd(e.target.value)} style={s.input} />
          </div>
        </Field>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "18px 0 8px" }}>
          <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 15, color: colors.ink }}>Parents</div>
          <button onClick={addParent} style={s.smallGhostBtn}><Plus size={14} /> Ajouter</button>
        </div>
        {parents.map((p, i) => (
          <div key={i} style={{ background: colors.bg, border: `1px solid ${colors.line}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: colors.inkSoft, marginBottom: 6 }}>Parent {i + 1}</div>
              {parents.length > 1 && <button onClick={() => removeParent(i)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={14} color={colors.inkSoft} /></button>}
            </div>
            <input value={p.name} onChange={e => updateParent(i, "name", e.target.value)} placeholder="Nom" style={{ ...s.input, marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <input value={p.phone} onChange={e => updateParent(i, "phone", e.target.value)} placeholder="Téléphone" style={s.input} />
              <input value={p.email} onChange={e => updateParent(i, "email", e.target.value)} placeholder="Email" style={s.input} />
            </div>
          </div>
        ))}

        {onDelete && (
          <button onClick={onDelete} style={{ ...s.secondaryBtn, color: colors.danger, borderColor: "#F0DAD5", marginTop: 8, width: "100%" }}>
            <Trash2 size={15} /> Supprimer cet enfant
          </button>
        )}

        <button onClick={submit} style={{ ...s.primaryBtn, width: "100%", justifyContent: "center", marginTop: 14 }}>
          <Check size={16} /> {initial ? "Enregistrer" : "Ajouter"}
        </button>
      </div>
    </Overlay>
  );
}

/* ------------------------------------------------------------------ */
/* Planning (weekly view)                                               */
/* ------------------------------------------------------------------ */
function Planning({ children, weekStart, setWeekStart }) {
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(weekStart, i));

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} style={s.iconBtnLight}><ChevronLeft size={16} color={colors.forest} /></button>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: colors.ink }}>
          {fmtDateShort(toISODate(days[0]))} – {fmtDateShort(toISODate(days[6]))}
        </div>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} style={s.iconBtnLight}><ChevronRight size={16} color={colors.forest} /></button>
      </div>

      {children.length === 0 ? (
        <div style={s.emptyState}><div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: colors.inkSoft }}>Ajoutez des enfants pour voir le planning.</div></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {days.map((d, i) => {
            const iso = toISODate(d);
            const present = children.filter(c => (c.schedule?.days || []).includes(i));
            return (
              <div key={iso} style={s.planningRow}>
                <div style={{ width: 54, flexShrink: 0 }}>
                  <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 13, color: colors.ink }}>{DAY_LABELS_FULL[i].slice(0, 3)}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: colors.inkSoft }}>{d.getDate()}</div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  {present.length === 0 ? (
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: colors.inkSoft, fontStyle: "italic" }}>Aucun accueil</div>
                  ) : present.map(c => (
                    <div key={c.id} style={{ ...s.planningChip, background: c.color }}>
                      <span style={{ fontFamily: "Fredoka, sans-serif", fontSize: 12.5, color: "#fff" }}>{c.firstName}</span>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.85)" }}>{c.schedule?.start}–{c.schedule?.end}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Menus                                                                */
/* ------------------------------------------------------------------ */
function Menus({ menus, menuDate, setMenuDate, onSave }) {
  const data = menus[menuDate] || { entree: "", plat: "", dessert: "", gouter: "" };
  const [local, setLocal] = useState(data);

  useEffect(() => { setLocal(menus[menuDate] || { entree: "", plat: "", dessert: "", gouter: "" }); }, [menuDate]); // eslint-disable-line

  function change(field, value) {
    const next = { ...local, [field]: value };
    setLocal(next);
    onSave(menuDate, next);
  }

  const d = new Date(menuDate + "T00:00:00");
  const weekStart = startOfWeek(d);
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(weekStart, i));

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 8 }}>
        {days.map(day => {
          const iso = toISODate(day);
          const active = iso === menuDate;
          return (
            <button key={iso} onClick={() => setMenuDate(iso)} style={{ ...s.dateChip, ...(active ? { background: colors.forest, borderColor: colors.forest } : {}) }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: active ? "rgba(255,255,255,0.8)" : colors.inkSoft }}>{DAY_LABELS_FULL[isoDayIndex(day)].slice(0, 3)}</div>
              <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 15, color: active ? "#fff" : colors.ink }}>{day.getDate()}</div>
            </button>
          );
        })}
      </div>

      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: colors.inkSoft, textTransform: "capitalize", marginBottom: 14 }}>{fmtDateLong(menuDate)}</div>

      {[["entree", "Entrée", "🥗"], ["plat", "Plat", "🍲"], ["dessert", "Dessert", "🍮"], ["gouter", "Goûter", "🍎"]].map(([key, label, emoji]) => (
        <div key={key} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>{emoji}</span>
            <span style={{ fontFamily: "Fredoka, sans-serif", fontSize: 13.5, color: colors.forestDeep }}>{label}</span>
          </div>
          <input value={local[key] || ""} onChange={e => change(key, e.target.value)} placeholder={`${label}…`} style={s.input} />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Presence                                                             */
/* ------------------------------------------------------------------ */
function Presence({ children, presenceMonth, setPresenceMonth, presenceChildId, setPresenceChildId, monthlyPresence, onExport }) {
  const child = children.find(c => c.id === presenceChildId);
  const shiftMonth = (n) => {
    const [y, m] = presenceMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    setPresenceMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const monthLabel = () => {
    const [y, m] = presenceMonth.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  };

  if (children.length === 0) {
    return <div style={{ padding: 16 }}><div style={s.emptyState}><div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: colors.inkSoft }}>Ajoutez des enfants pour suivre leur présence.</div></div></div>;
  }

  const { totalMins, days } = child ? monthlyPresence(child.id, presenceMonth) : { totalMins: 0, days: [] };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 10 }}>
        {children.map(c => (
          <button key={c.id} onClick={() => setPresenceChildId(c.id)} style={{ ...s.childChip, ...(c.id === presenceChildId ? { background: c.color, borderColor: c.color } : {}) }}>
            <span style={{ fontFamily: "Fredoka, sans-serif", fontSize: 13, color: c.id === presenceChildId ? "#fff" : colors.ink }}>{c.firstName}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={() => shiftMonth(-1)} style={s.iconBtnLight}><ChevronLeft size={16} color={colors.forest} /></button>
        <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 15, color: colors.ink, textTransform: "capitalize" }}>{monthLabel()}</div>
        <button onClick={() => shiftMonth(1)} style={s.iconBtnLight}><ChevronRight size={16} color={colors.forest} /></button>
      </div>

      <div style={s.presenceSummary}>
        <CalendarDays size={26} color={colors.forest} />
        <div>
          <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 20, color: colors.ink }}>{days.length} jour{days.length > 1 ? "s" : ""} de présence</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: colors.inkSoft }}>soit {fmtHM(totalMins)} au total</div>
        </div>
      </div>

      {child && (
        <button
          onClick={() => onExport({ type: "presence", child, monthLabel: monthLabel(), totalMins, days })}
          style={{ ...s.primaryBtn, width: "100%", justifyContent: "center", marginTop: 12 }}
        >
          <Printer size={16} /> Exporter la fiche en PDF
        </button>
      )}

      {days.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {days.map(({ day, mins }) => (
            <div key={day} style={s.presenceDayRow}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: colors.ink, textTransform: "capitalize" }}>{fmtDateShort(day)}</span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: colors.inkSoft }}>{fmtHM(mins)}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: colors.inkSoft, marginTop: 14 }}>
        Calculé à partir des pointages Arrivée / Départ enregistrés dans le journal de l'enfant.
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small shared building blocks                                        */
/* ------------------------------------------------------------------ */
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: colors.inkSoft, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
function Overlay({ children, onClose, full }) {
  return (
    <div style={s.overlayBg} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", display: "flex", justifyContent: "center", ...(full ? { height: "100%" } : {}) }}>
        {children}
      </div>
    </div>
  );
}
function FontStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
      * { box-sizing: border-box; }
      input, textarea, button { font-family: 'Inter', sans-serif; outline: none; }
      input:focus, textarea:focus { border-color: ${colors.forest} !important; }
      ::-webkit-scrollbar { display: none; }
      @media print {
        #app-shell { display: none !important; }
        .no-print { display: none !important; }
        .report-overlay { position: static !important; box-shadow: none !important; }
        body { background: #fff !important; }
      }
    `}</style>
  );
}

/* ------------------------------------------------------------------ */
/* PDF export (browser print → save as PDF)                            */
/* ------------------------------------------------------------------ */
function PrintOverlay({ data, onClose }) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 200);
    function handleAfterPrint() { onClose(); }
    window.addEventListener("afterprint", handleAfterPrint);
    return () => { clearTimeout(t); window.removeEventListener("afterprint", handleAfterPrint); };
  }, []); // eslint-disable-line

  const generated = new Date().toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="report-overlay" style={s.reportOverlay}>
      <div className="no-print" style={s.reportActions}>
        <button onClick={() => window.print()} style={s.primaryBtn}><Printer size={16} /> Imprimer / Enregistrer en PDF</button>
        <button onClick={onClose} style={s.secondaryBtn}>Fermer</button>
      </div>

      <div style={s.reportPage}>
        <div style={s.reportHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Feather size={18} color={colors.forestDeep} />
            <span style={{ fontFamily: "Fredoka, sans-serif", fontSize: 16, color: colors.forestDeep }}>Nid</span>
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: colors.inkSoft }}>Généré le {generated}</div>
        </div>

        {data.type === "presence" ? (
          <>
            <h1 style={s.reportTitle}>Fiche de présence</h1>
            <div style={s.reportMeta}>
              <div><strong>Enfant :</strong> {data.child.firstName} {data.child.lastName}</div>
              <div><strong>Période :</strong> <span style={{ textTransform: "capitalize" }}>{data.monthLabel}</span></div>
            </div>
            <div style={s.reportSummary}>
              <div>{data.days.length} jour{data.days.length > 1 ? "s" : ""} de présence</div>
              <div>{fmtHM(data.totalMins)} au total</div>
            </div>
            <table style={s.reportTable}>
              <thead><tr><th style={s.th}>Date</th><th style={s.th}>Durée</th></tr></thead>
              <tbody>
                {data.days.length === 0 ? (
                  <tr><td style={s.td} colSpan={2}>Aucune présence enregistrée ce mois-ci.</td></tr>
                ) : data.days.map(({ day, mins }) => (
                  <tr key={day}>
                    <td style={{ ...s.td, textTransform: "capitalize" }}>{fmtDateLong(day)}</td>
                    <td style={s.td}>{fmtHM(mins)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <>
            <h1 style={s.reportTitle}>Journal de la journée</h1>
            <div style={s.reportMeta}>
              <div><strong>Enfant :</strong> {data.child.firstName} {data.child.lastName}</div>
              <div><strong>Date :</strong> <span style={{ textTransform: "capitalize" }}>{fmtDateLong(data.date)}</span></div>
            </div>
            <table style={s.reportTable}>
              <thead><tr><th style={s.th}>Heure</th><th style={s.th}>Évènement</th><th style={s.th}>Note</th></tr></thead>
              <tbody>
                {data.events.length === 0 ? (
                  <tr><td style={s.td} colSpan={3}>Aucun évènement enregistré.</td></tr>
                ) : data.events.map(ev => (
                  <tr key={ev.id}>
                    <td style={s.td}>{fmtTime(ev.ts)}</td>
                    <td style={s.td}>{EVENT_MAP[ev.type].label}</td>
                    <td style={s.td}>{ev.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div style={s.reportFooter}>Document généré par Nid — carnet de bord pour assistantes maternelles.</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Backup / export (JSON full backup + CSV for Google Sheets)          */
/* ------------------------------------------------------------------ */
function csvEscape(val) {
  const str = String(val ?? "");
  if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}
function toCSV(headers, rows) {
  const lines = [headers.map(csvEscape).join(",")];
  rows.forEach(r => lines.push(r.map(csvEscape).join(",")));
  return "\uFEFF" + lines.join("\n"); // BOM so accents display correctly in Sheets/Excel
}
function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function BackupModal({ children, events, menus, onRestore, onClose }) {
  const [restoreError, setRestoreError] = useState("");
  const [restoreOk, setRestoreOk] = useState(false);

  function exportChildrenCSV() {
    const headers = ["Prénom", "Nom", "Sexe", "Date de naissance", "Jours d'accueil", "Début", "Fin", "Parents"];
    const rows = children.map(c => [
      c.firstName, c.lastName, c.gender === "F" ? "Fille" : "Garçon", c.birthDate || "",
      (c.schedule?.days || []).map(i => DAY_LABELS_FULL[i]).join(" / "),
      c.schedule?.start || "", c.schedule?.end || "",
      (c.parents || []).map(p => `${p.name} ${p.phone} ${p.email}`.trim()).join(" | "),
    ]);
    downloadText(`nid-enfants-${todayISO()}.csv`, toCSV(headers, rows), "text/csv;charset=utf-8");
  }

  function exportJournalCSV() {
    const headers = ["Enfant", "Date", "Heure", "Évènement", "Note"];
    const rows = [];
    children.forEach(c => {
      (events[c.id] || []).forEach(ev => {
        rows.push([`${c.firstName} ${c.lastName}`, ev.ts.slice(0, 10), fmtTime(ev.ts), EVENT_MAP[ev.type]?.label || ev.type, ev.note || ""]);
      });
    });
    rows.sort((a, b) => (a[1] + a[2]).localeCompare(b[1] + b[2]));
    downloadText(`nid-journal-${todayISO()}.csv`, toCSV(headers, rows), "text/csv;charset=utf-8");
  }

  function exportMenusCSV() {
    const headers = ["Date", "Entrée", "Plat", "Dessert", "Goûter"];
    const rows = Object.keys(menus).sort().map(date => [date, menus[date].entree || "", menus[date].plat || "", menus[date].dessert || "", menus[date].gouter || ""]);
    downloadText(`nid-menus-${todayISO()}.csv`, toCSV(headers, rows), "text/csv;charset=utf-8");
  }

  function exportFullJSON() {
    const payload = { exportedAt: new Date().toISOString(), children, events, menus };
    downloadText(`nid-sauvegarde-${todayISO()}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreError(""); setRestoreOk(false);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== "object" || !Array.isArray(data.children)) {
          throw new Error("format");
        }
        onRestore(data);
        setRestoreOk(true);
      } catch {
        setRestoreError("Ce fichier ne semble pas être une sauvegarde Nid valide.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ ...s.sheet, maxWidth: 420 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ ...s.eventIconRound, background: colors.forest }}><ShieldCheck size={18} color="#fff" /></div>
          <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 18, color: colors.ink }}>Sauvegarde & export</div>
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: colors.inkSoft, marginBottom: 16, lineHeight: 1.6 }}>
          Vos données sont déjà enregistrées automatiquement sur votre compte Claude, pas seulement sur cet appareil.
          Pour garder une copie personnelle (par exemple dans Google Sheets), téléchargez une sauvegarde ci-dessous.
        </div>

        <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 13, color: colors.forestDeep, marginBottom: 8 }}>Exporter en CSV (pour Google Sheets)</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <button onClick={exportChildrenCSV} style={s.backupRow}><Users size={15} color={colors.forest} /> Fiches enfants (.csv)</button>
          <button onClick={exportJournalCSV} style={s.backupRow}><ClipboardList size={15} color={colors.forest} /> Journal complet (.csv)</button>
          <button onClick={exportMenusCSV} style={s.backupRow}><UtensilsCrossed size={15} color={colors.forest} /> Menus (.csv)</button>
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: colors.inkSoft, marginBottom: 18, lineHeight: 1.6 }}>
          Dans Google Sheets : Fichier → Importer → Importer, puis choisissez le fichier téléchargé.
        </div>

        <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 13, color: colors.forestDeep, marginBottom: 8 }}>Sauvegarde complète</div>
        <button onClick={exportFullJSON} style={{ ...s.primaryBtn, width: "100%", justifyContent: "center", marginBottom: 10 }}>
          <Save size={16} /> Télécharger une sauvegarde (.json)
        </button>

        <label style={{ ...s.secondaryBtn, width: "100%", cursor: "pointer" }}>
          <Upload size={15} /> Restaurer une sauvegarde
          <input type="file" accept=".json,application/json" onChange={handleFile} style={{ display: "none" }} />
        </label>
        {restoreOk && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: colors.forest, marginTop: 8 }}>Sauvegarde restaurée avec succès.</div>}
        {restoreError && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: colors.danger, marginTop: 8 }}>{restoreError}</div>}

        <button onClick={onClose} style={{ ...s.secondaryBtn, width: "100%", marginTop: 14 }}>Fermer</button>
      </div>
    </Overlay>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */
const s = {
  app: {
    fontFamily: "Inter, sans-serif",
    background: colors.bg,
    height: "100vh",
    maxWidth: 480,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
  },
  header: {
    background: colors.forest,
    padding: "16px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  logoMark: { width: 32, height: 32, borderRadius: 10, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" },
  iconBtnGhost: { background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  main: { flex: 1, overflowY: "auto", paddingBottom: 12 },
  bottomNav: { display: "flex", borderTop: `1px solid ${colors.line}`, background: colors.card, flexShrink: 0, padding: "6px 0 8px" },
  navBtn: { flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", padding: 4 },
  emptyState: { background: colors.card, border: `1px dashed ${colors.line}`, borderRadius: 16, padding: "32px 20px", textAlign: "center" },
  primaryBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: colors.forest, color: "#fff", border: "none", borderRadius: 12, padding: "11px 18px", fontFamily: "Fredoka, sans-serif", fontSize: 14, cursor: "pointer" },
  secondaryBtn: { display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center", background: "#fff", color: colors.ink, border: `1px solid ${colors.line}`, borderRadius: 12, padding: "11px 18px", fontFamily: "Inter, sans-serif", fontSize: 13.5, cursor: "pointer", flex: 1 },
  smallGhostBtn: { display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", color: colors.forest, fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, cursor: "pointer" },
  childCard: { display: "flex", alignItems: "center", gap: 12, background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 14, padding: 12, cursor: "pointer", textAlign: "left", width: "100%" },
  avatar: { width: 44, height: 44, borderRadius: 12, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Fredoka, sans-serif", fontSize: 18, flexShrink: 0 },
  subTabRow: { display: "flex", alignItems: "center", gap: 8, background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 12, padding: 4 },
  subTab: { flex: 1, background: "none", border: "none", borderRadius: 9, padding: "8px 0", fontFamily: "Inter, sans-serif", fontSize: 13, color: colors.inkSoft, cursor: "pointer", fontWeight: 600 },
  subTabActive: { background: colors.bg, color: colors.forest },
  iconBtnLight: { background: colors.bg, border: `1px solid ${colors.line}`, borderRadius: 9, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
  eventBtn: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, border: "none", padding: "20px 8px", cursor: "pointer" },
  timelineRail: { position: "absolute", left: 8, top: 4, bottom: 4, width: 2, background: colors.line },
  timelineDot: { position: "absolute", left: -1, top: 2, width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },
  timelineCard: { marginLeft: 18, background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 12, padding: 12 },
  trashBtn: { background: "none", border: "none", cursor: "pointer", padding: 2 },
  overlayBg: { position: "fixed", inset: 0, background: "rgba(30,26,20,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 },
  sheet: { background: colors.card, borderRadius: "20px 20px 0 0", padding: 20, width: "100%" },
  fullSheet: { background: colors.card, borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxWidth: 480, height: "92vh", overflowY: "auto" },
  input: { width: "100%", border: `1px solid ${colors.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, color: colors.ink, background: "#fff" },
  toggleBtn: { flex: 1, border: `1px solid ${colors.line}`, borderRadius: 10, padding: "9px 0", background: "#fff", color: colors.ink, fontFamily: "Inter, sans-serif", fontSize: 13.5, cursor: "pointer" },
  dayPill: { width: 34, height: 34, borderRadius: 10, border: `1px solid ${colors.line}`, background: "#fff", color: colors.ink, fontFamily: "Inter, sans-serif", fontSize: 12.5, cursor: "pointer" },
  eventIconRound: { width: 38, height: 38, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  planningRow: { display: "flex", gap: 10, background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 12, padding: 10 },
  planningChip: { display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 8, padding: "6px 10px" },
  dateChip: { minWidth: 46, flexShrink: 0, border: `1px solid ${colors.line}`, background: "#fff", borderRadius: 12, padding: "6px 4px", textAlign: "center", cursor: "pointer" },
  childChip: { flexShrink: 0, border: `1px solid ${colors.line}`, background: "#fff", borderRadius: 999, padding: "7px 14px", cursor: "pointer" },
  presenceSummary: { display: "flex", alignItems: "center", gap: 14, background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 16, padding: 16 },
  presenceDayRow: { display: "flex", justifyContent: "space-between", background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 10, padding: "9px 12px" },
  reportOverlay: { position: "fixed", inset: 0, background: "#fff", zIndex: 100, overflowY: "auto" },
  reportActions: { position: "sticky", top: 0, background: "#fff", borderBottom: `1px solid ${colors.line}`, padding: 14, display: "flex", gap: 10, justifyContent: "center", zIndex: 2 },
  reportPage: { maxWidth: 640, margin: "0 auto", padding: "28px 24px 40px", fontFamily: "Inter, sans-serif", color: colors.ink },
  reportHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `2px solid ${colors.forest}`, paddingBottom: 12, marginBottom: 20 },
  reportTitle: { fontFamily: "Fredoka, sans-serif", fontSize: 24, color: colors.forestDeep, margin: "0 0 14px" },
  reportMeta: { fontSize: 13.5, lineHeight: 1.9, marginBottom: 14 },
  reportSummary: { display: "flex", gap: 24, fontFamily: "Fredoka, sans-serif", fontSize: 15, color: colors.forest, marginBottom: 16 },
  reportTable: { width: "100%", borderCollapse: "collapse", marginTop: 8 },
  th: { textAlign: "left", fontSize: 12, color: colors.inkSoft, borderBottom: `1px solid ${colors.line}`, padding: "8px 6px", fontWeight: 600 },
  td: { fontSize: 13, padding: "9px 6px", borderBottom: `1px solid ${colors.line}` },
  reportFooter: { marginTop: 28, fontSize: 11, color: colors.inkSoft, textAlign: "center" },
  backupRow: { display: "flex", alignItems: "center", gap: 10, background: colors.bg, border: `1px solid ${colors.line}`, borderRadius: 10, padding: "10px 12px", fontFamily: "Inter, sans-serif", fontSize: 13.5, color: colors.ink, cursor: "pointer", textAlign: "left" },
};
