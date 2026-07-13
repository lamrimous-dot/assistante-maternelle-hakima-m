import React, { useState, useEffect, useMemo } from "react";
import {
  Feather, Home, LogOut, UtensilsCrossed, Moon, Palette as PaletteIcon,
  Baby, HeartPulse, Camera, Plus, X, Calendar, Users, ClipboardList,
  Clock, Trash2, ChevronLeft, ChevronRight, Check, Pencil, Phone, Mail,
  ArrowLeft, CalendarDays, Printer, Save, Upload, ShieldCheck, Wallet, Settings, Table2, Send,
  Receipt, LogIn, MoreVertical
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */
const colors = {
  bg: "#F7EFE6",
  card: "#FFFFFF",
  ink: "#2E2A26",
  inkSoft: "#9C9086",
  line: "#EFE2D2",
  forest: "#2F5D50",
  forestDeep: "#1E4038",
  coral: "#E8A08A",
  mustard: "#E3B54F",
  rose: "#F0A8B4",
  sky: "#8FB8B0",
  danger: "#D4685C",
  blush: "#FBEAE3",
  navy: "#2C4A6E",
};
const CHILD_PALETTE = [colors.rose, colors.sky, colors.mustard, colors.coral, colors.forest];

const DEFAULT_BAREMES = {
  entretien: [
    { max: 8, rate: 2.66 },
    { max: 9, rate: 2.85 },
    { max: 10, rate: 3.00 },
    { max: 11, rate: 3.10 },
    { max: 9999, rate: 3.45 },
  ],
  repas: 1.65,
  petitDejeuner: 0.90,
  gouter: 0.75,
  congesPayesPercent: 10,
  majorationHeuresSup: 0,
};
const MEAL_TYPES = [
  { key: "petitDejeuner", label: "Petit-déj" },
  { key: "repas", label: "Repas" },
  { key: "gouter", label: "Goûter" },
];

const EVENT_TYPES = [
  { key: "repas", label: "Repas", icon: UtensilsCrossed, color: colors.coral },
  { key: "sieste", label: "Sieste", icon: Moon, color: colors.sky },
  { key: "activite", label: "Activité", icon: PaletteIcon, color: colors.mustard },
  { key: "change", label: "Change", icon: Baby, color: colors.rose },
  { key: "soins", label: "Soins", icon: HeartPulse, color: colors.danger },
  { key: "photo", label: "Note / Photo", icon: Camera, color: colors.forestDeep },
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
function fmtEuro(n) {
  const v = Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  return v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function fmtHeuresDec(h) {
  return (Math.round(h * 100) / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function daySpanMinutes(start, end) {
  const a = timeToMinutes(start), b = timeToMinutes(end);
  if (a == null || b == null) return 0;
  return Math.max(0, b - a);
}
function daysInMonth(monthISO) {
  const [y, m] = monthISO.split("-").map(Number);
  const count = new Date(y, m, 0).getDate();
  const days = [];
  for (let d = 1; d <= count; d++) {
    days.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return days;
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

  const [tab, setTab] = useState("accueil");  // accueil | enfants | calendrier | rapports
  const [view, setView] = useState("list");   // list | detail | rapport
  const [activeChildId, setActiveChildId] = useState(null);
  const [childSubTab, setChildSubTab] = useState("events"); // events | timeline
  const [rapportChildId, setRapportChildId] = useState(null);

  const [showChildForm, setShowChildForm] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [logModal, setLogModal] = useState(null); // event type key

  const [journalDate, setJournalDate] = useState(todayISO());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [menuDate, setMenuDate] = useState(todayISO());
  const [presenceMonth, setPresenceMonth] = useState(new Date().toISOString().slice(0, 7));
  const [presenceChildId, setPresenceChildId] = useState(null);
  const [printMode, setPrintMode] = useState(null); // { type:'presence'|'journal'|'paie', child, ... }
  const [showBackup, setShowBackup] = useState(false);
  const [baremes, setBaremes] = useState(DEFAULT_BAREMES);
  const [showBaremes, setShowBaremes] = useState(false);
  const [timesheet, setTimesheet] = useState({}); // { childId: { dateISO: {ma,md,aa,ad,repas,petitDejeuner,gouter,absence} } }
  const [sheetsWebhook, setSheetsWebhook] = useState("");
  const [sheetsStatus, setSheetsStatus] = useState(null); // null | 'sending' | 'ok' | 'error'
  const [dayEditor, setDayEditor] = useState(null); // { childId, dateISO } | null

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
      try {
        const b = await window.storage.get("baremes", false);
        setBaremes(b ? { ...DEFAULT_BAREMES, ...JSON.parse(b.value) } : DEFAULT_BAREMES);
      } catch { setBaremes(DEFAULT_BAREMES); }
      try {
        const t = await window.storage.get("timesheet", false);
        setTimesheet(t ? JSON.parse(t.value) : {});
      } catch { setTimesheet({}); }
      try {
        const w = await window.storage.get("sheetsWebhook", false);
        setSheetsWebhook(w ? JSON.parse(w.value) : "");
      } catch { setSheetsWebhook(""); }
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
  const saveBaremes = (next) => persist("baremes", next, setBaremes);
  const saveTimesheet = (next) => persist("timesheet", next, setTimesheet);
  const saveSheetsWebhook = (next) => persist("sheetsWebhook", next, setSheetsWebhook);

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
  function logEvent(childId, type, ts, note, meals) {
    const list = events[childId] ? [...events[childId]] : [];
    const entry = { id: uid(), type, ts, note: note || "" };
    if (meals && meals.length) entry.meals = meals;
    list.push(entry);
    list.sort((a, b) => new Date(a.ts) - new Date(b.ts));
    saveEvents({ ...events, [childId]: list });
  }
  function deleteEvent(childId, eventId) {
    const list = (events[childId] || []).filter(e => e.id !== eventId);
    saveEvents({ ...events, [childId]: list });
  }

  /* ---------------- Google Sheets sync ---------------- */
  async function pushMonthToSheets(child, monthISO) {
    if (!sheetsWebhook) return;
    setSheetsStatus("sending");
    const childSheet = timesheet[child.id] || {};
    const rows = daysInMonth(monthISO).map(day => {
      const rec = childSheet[day] || {};
      return {
        enfant: `${child.firstName} ${child.lastName}`.trim(),
        date: day,
        matinArrivee: rec.ma || "",
        matinDepart: rec.md || "",
        apremArrivee: rec.aa || "",
        apremDepart: rec.ad || "",
        heures: Math.round((dayMinutes(rec) / 60) * 100) / 100,
        repas: !!rec.repas,
        petitDejeuner: !!rec.petitDejeuner,
        gouter: !!rec.gouter,
        absence: rec.absence || "",
      };
    });
    try {
      await fetch(sheetsWebhook, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ rows }),
      });
      setSheetsStatus("ok");
    } catch {
      setSheetsStatus("error");
    }
    setTimeout(() => setSheetsStatus(null), 4000);
  }

  const activeChild = children.find(c => c.id === activeChildId) || null;

  /* ---------------- derived: today's events per child/date ---------------- */
  function eventsForDate(childId, dateISO) {
    return (events[childId] || []).filter(e => e.ts.slice(0, 10) === dateISO);
  }

  function updateTimesheetDay(childId, dateISO, patch) {
    const childSheet = { ...(timesheet[childId] || {}) };
    const current = childSheet[dateISO] || { ma: "", md: "", aa: "", ad: "", repas: false, petitDejeuner: false, gouter: false, absence: "" };
    childSheet[dateISO] = { ...current, ...patch };
    saveTimesheet({ ...timesheet, [childId]: childSheet });
  }

  function dayMinutes(rec) {
    if (!rec) return 0;
    return daySpanMinutes(rec.ma, rec.md) + daySpanMinutes(rec.aa, rec.ad);
  }

  /* ---------------- presence calc (from grid) ---------------- */
  function monthlyPresence(childId, monthISO) {
    const childSheet = timesheet[childId] || {};
    let totalMins = 0;
    const days = [];
    Object.keys(childSheet).filter(d => d.startsWith(monthISO)).sort().forEach(day => {
      const mins = dayMinutes(childSheet[day]);
      if (mins > 0) { totalMins += mins; days.push({ day, mins }); }
    });
    return { totalMins, days };
  }

  /* ---------------- paie calc (from grid) ---------------- */
  function computeMonthlyPaie(child, monthISO) {
    const childSheet = timesheet[child.id] || {};
    let totalMins = 0;
    let entretienTotal = 0;
    let daysWorked = 0;
    let countRepas = 0, countPetitDej = 0, countGouter = 0;
    Object.keys(childSheet).filter(d => d.startsWith(monthISO)).sort().forEach(day => {
      const rec = childSheet[day];
      const mins = dayMinutes(rec);
      if (mins > 0) {
        totalMins += mins;
        daysWorked += 1;
        const hours = mins / 60;
        const sortedBrackets = [...baremes.entretien].sort((a, b) => a.max - b.max);
        const bracket = sortedBrackets.find(b => hours <= b.max) || sortedBrackets[sortedBrackets.length - 1];
        entretienTotal += bracket.rate;
      }
      if (rec.repas) countRepas++;
      if (rec.petitDejeuner) countPetitDej++;
      if (rec.gouter) countGouter++;
    });
    const totalHeures = totalMins / 60;
    const baseHeuresMois = Number(child.baseHeuresMois) || 0;
    const tauxHoraire = Number(child.tauxHoraire) || 0;
    const heuresBase = baseHeuresMois > 0 ? Math.min(totalHeures, baseHeuresMois) : totalHeures;
    const heuresSup = baseHeuresMois > 0 ? Math.max(0, totalHeures - baseHeuresMois) : 0;
    const salaireBase = heuresBase * tauxHoraire;
    const remunerationHeuresSup = heuresSup * tauxHoraire * (1 + (baremes.majorationHeuresSup || 0) / 100);
    const congesPayes = (salaireBase + remunerationHeuresSup) * (baremes.congesPayesPercent || 0) / 100;
    const indemniteRepas = countRepas * baremes.repas + countPetitDej * baremes.petitDejeuner + countGouter * baremes.gouter;
    const totalNet = salaireBase + remunerationHeuresSup + congesPayes + entretienTotal + indemniteRepas;
    return {
      totalHeures, daysWorked, heuresBase, heuresSup, salaireBase, remunerationHeuresSup,
      congesPayes, entretienTotal, indemniteRepas, totalNet, tauxHoraire, baseHeuresMois,
      countRepas, countPetitDej, countGouter,
    };
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
            : view === "rapport" && rapportChildId
            ? "Facture"
            : { accueil: "Nid", enfants: "Mes enfants", calendrier: "Calendrier", rapports: "Rapports" }[tab]
        }
        onBack={
          view === "detail" ? () => { setView("list"); setActiveChildId(null); }
          : view === "rapport" ? () => { setView("list"); setRapportChildId(null); }
          : null
        }
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
            timesheet={timesheet}
            onUpdateDay={updateTimesheetDay}
            dayMinutes={dayMinutes}
            onEditDay={(dateISO) => setDayEditor({ childId: activeChild.id, dateISO })}
          />
        ) : view === "rapport" && rapportChildId ? (
          <Facture
            child={children.find(c => c.id === rapportChildId)}
            monthISO={presenceMonth}
            setMonthISO={setPresenceMonth}
            timesheet={timesheet}
            dayMinutes={dayMinutes}
            baremes={baremes}
            computeMonthlyPaie={computeMonthlyPaie}
            onExport={(payload) => setPrintMode(payload)}
            onOpenBaremes={() => setShowBaremes(true)}
          />
        ) : tab === "accueil" ? (
          <Dashboard
            children={children}
            timesheet={timesheet}
            onUpdateDay={updateTimesheetDay}
            dayMinutes={dayMinutes}
            onOpenChild={(id) => { setActiveChildId(id); setView("detail"); setChildSubTab("events"); setJournalDate(todayISO()); }}
            onAdd={openNewChild}
          />
        ) : tab === "enfants" ? (
          <ChildrenList
            children={children}
            onOpen={(id) => { setActiveChildId(id); setView("detail"); setChildSubTab("events"); setJournalDate(todayISO()); }}
            onAdd={openNewChild}
          />
        ) : tab === "calendrier" ? (
          <CalendarView
            children={children}
            timesheet={timesheet}
            dayMinutes={dayMinutes}
            monthISO={presenceMonth}
            setMonthISO={setPresenceMonth}
            onEditDay={(childId, dateISO) => setDayEditor({ childId, dateISO })}
          />
        ) : (
          <ChildrenList
            children={children}
            onOpen={(id) => { setRapportChildId(id); setView("rapport"); }}
            onAdd={openNewChild}
            reportMode
          />
        )}
      </main>

      {view === "list" && (
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
          onConfirm={(ts, note, meals) => { logEvent(activeChild.id, logModal, ts, note, meals); setLogModal(null); }}
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

      {showBaremes && (
        <BaremesModal
          baremes={baremes}
          onSave={(next) => { saveBaremes(next); setShowBaremes(false); }}
          onCancel={() => setShowBaremes(false)}
          sheetsWebhook={sheetsWebhook}
          onSaveWebhook={(url) => saveSheetsWebhook(url)}
        />
      )}

      {dayEditor && (
        <DayEditorModal
          child={children.find(c => c.id === dayEditor.childId)}
          dateISO={dayEditor.dateISO}
          rec={(timesheet[dayEditor.childId] || {})[dayEditor.dateISO]}
          onSave={(patch) => { updateTimesheetDay(dayEditor.childId, dayEditor.dateISO, patch); setDayEditor(null); }}
          onCancel={() => setDayEditor(null)}
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
    { key: "accueil", label: "Accueil", icon: Home },
    { key: "enfants", label: "Enfants", icon: Users },
    { key: "calendrier", label: "Calendrier", icon: Calendar },
    { key: "rapports", label: "Rapports", icon: Receipt },
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
/* Dashboard — tableau de bord (page d'accueil)                         */
/* ------------------------------------------------------------------ */
function Dashboard({ children, timesheet, onUpdateDay, dayMinutes, onOpenChild, onAdd }) {
  const today = todayISO();
  const now = new Date();
  const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const greeting = now.getHours() < 12 ? "Bonjour" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir";

  if (children.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <div style={s.emptyState}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🪺</div>
          <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 17, color: colors.ink, marginBottom: 4 }}>Bienvenue dans Nid</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: colors.inkSoft, marginBottom: 16 }}>
            Ajoutez un premier enfant pour commencer à pointer ses journées.
          </div>
          <button onClick={onAdd} style={s.primaryBtn}><Plus size={16} /> Ajouter un enfant</button>
        </div>
      </div>
    );
  }

  let presentCount = 0;
  children.forEach(c => {
    const rec = (timesheet[c.id] || {})[today] || {};
    if (rec.ma && !rec.md) presentCount++;
  });

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 18, color: colors.ink, marginBottom: 2 }}>{greeting} 👋</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: colors.inkSoft, marginBottom: 16, textTransform: "capitalize" }}>{fmtDateLong(today)}</div>

      {presentCount > 0 && (
        <div style={{ ...s.badgeGreen, display: "inline-block", marginBottom: 14 }}>{presentCount} enfant{presentCount > 1 ? "s" : ""} présent{presentCount > 1 ? "s" : ""} actuellement</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {children.map(c => {
          const rec = (timesheet[c.id] || {})[today] || {};
          let label, action, done = false;
          if (rec.absence) { label = "Absent aujourd'hui"; action = null; done = true; }
          else if (!rec.ma) { label = "Arrivée"; action = () => onUpdateDay(c.id, today, { ma: nowHHMM }); }
          else if (!rec.md) { label = "Départ"; action = () => onUpdateDay(c.id, today, { md: nowHHMM }); }
          else { label = "Journée pointée"; action = null; done = true; }
          const mins = dayMinutes(rec);

          return (
            <div key={c.id} style={s.dashCard}>
              <button onClick={() => onOpenChild(c.id)} style={{ display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", padding: 0, cursor: "pointer", flex: 1, textAlign: "left" }}>
                <div style={{ ...s.avatar, background: c.color, width: 40, height: 40, fontSize: 16 }}>{c.firstName ? c.firstName[0].toUpperCase() : "?"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 15, color: colors.ink }}>{c.firstName}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: colors.inkSoft }}>
                    {rec.ma ? `${rec.ma}${rec.md ? " → " + rec.md : " → …"}` : "Pas encore pointé"}
                    {mins > 0 && ` · ${fmtHeuresDec(mins / 60)}h`}
                  </div>
                </div>
              </button>
              <button
                onClick={action || undefined}
                disabled={!action}
                style={{ ...s.dashPointageBtn, ...(done ? { background: colors.bg, color: colors.inkSoft } : { background: colors.coral, color: "#fff" }) }}
              >
                {label}
              </button>
            </div>
          );
        })}
      </div>

      <button onClick={onAdd} style={{ ...s.smallGhostBtn, marginTop: 16 }}><Plus size={14} /> Ajouter un enfant</button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Children list                                                        */
/* ------------------------------------------------------------------ */
function ChildrenList({ children, onOpen, onAdd, reportMode }) {
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
                {reportMode ? "Voir la facture du mois" : `${c.gender === "F" ? "Fille" : "Garçon"} · ${fmtAge(c.birthDate)}`}
              </div>
            </div>
            {reportMode ? <Receipt size={17} color={colors.inkSoft} /> : <ChevronRight size={18} color={colors.inkSoft} />}
          </button>
        ))}
      </div>

      {children.length > 0 && !reportMode && (
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
function ChildDetail({ child, childSubTab, setChildSubTab, journalDate, setJournalDate, eventsForDate, onLog, onDeleteEvent, onEdit, onExportDay, timesheet, onUpdateDay, dayMinutes, onEditDay }) {
  const dayEvents = eventsForDate(child.id, journalDate).slice().sort((a, b) => new Date(a.ts) - new Date(b.ts));
  const childSheet = timesheet[child.id] || {};
  const today = todayISO();
  const todayRec = childSheet[today] || {};
  const now = new Date();
  const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  let pointageLabel, pointageAction, pointageDone = false;
  if (!todayRec.ma) {
    pointageLabel = `Arrivée de ${child.firstName}`;
    pointageAction = () => onUpdateDay(child.id, today, { ma: nowHHMM });
  } else if (!todayRec.md) {
    pointageLabel = `Départ de ${child.firstName}`;
    pointageAction = () => onUpdateDay(child.id, today, { md: nowHHMM });
  } else {
    pointageLabel = "Journée pointée";
    pointageAction = () => onEditDay(today);
    pointageDone = true;
  }

  const weekStartD = startOfWeek(new Date());
  const weekDays = [0, 1, 2, 3, 4, 5, 6].map(i => toISODate(addDays(weekStartD, i)));
  let weekTotalMins = 0;
  weekDays.forEach(d => { weekTotalMins += dayMinutes(childSheet[d]); });

  return (
    <div style={{ padding: "14px 16px 90px" }}>
      <div style={s.contractCard}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ ...s.avatar, background: child.color, position: "relative" }}>
            {child.firstName ? child.firstName[0].toUpperCase() : "?"}
            <button onClick={onEdit} style={s.editBadge} aria-label="Modifier"><Pencil size={11} color="#fff" /></button>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 17, color: colors.ink }}>
              {child.firstName} <span style={{ fontSize: 13, color: colors.inkSoft, fontFamily: "Inter, sans-serif" }}>{fmtAge(child.birthDate)}</span>
            </div>
            {(child.parents || []).map((p, i) => (
              p.name || p.phone ? <div key={i} style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: colors.inkSoft }}>{p.name} {p.phone && `· ${p.phone}`}</div> : null
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {child.baseHeuresMois > 0 && (
            <span style={s.badgeGreen}>Mensualisation · {fmtEuro((child.tauxHoraire || 0) * child.baseHeuresMois)}/mois</span>
          )}
          {(child.schedule?.days || []).length > 0 && (
            <span style={s.badgeSoft}>{(child.schedule.days).map(i => DAY_LABELS_FULL[i].slice(0, 3)).join(", ")}</span>
          )}
          {child.schedule?.start && <span style={s.badgeSoft}>{child.schedule.start} → {child.schedule.end}</span>}
          {child.tauxHoraire > 0 && <span style={s.badgeSoft}>{fmtEuro(child.tauxHoraire)}/h</span>}
        </div>
      </div>

      <button onClick={pointageAction} disabled={pointageDone} style={{ ...s.pointageBtn, ...(pointageDone ? s.pointageBtnDone : {}) }}>
        {pointageDone ? <Check size={18} /> : <LogIn size={18} />} {pointageLabel} {!pointageDone && "→"}
      </button>

      <div style={s.weekCard}>
        <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 13.5, color: colors.forestDeep, marginBottom: 10 }}>Cette semaine</div>
        {weekDays.map(d => {
          const rec = childSheet[d] || {};
          const mins = dayMinutes(rec);
          const isFuture = d > today;
          const dObj = new Date(d + "T00:00:00");
          return (
            <div key={d} style={s.weekRow} onClick={() => onEditDay(d)}>
              <div style={{ width: 70, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: colors.ink }}>
                <span style={{ textTransform: "capitalize" }}>{DAY_LABELS_FULL[isoDayIndex(dObj)].slice(0, 3)}</span> {dObj.getDate()}
              </div>
              <div style={{ flex: 1, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: rec.ma ? colors.ink : colors.inkSoft }}>
                {rec.absence ? rec.absence : rec.ma ? `${rec.ma} → ${rec.md || "…"}` : isFuture ? "—" : "Non pointé"}
              </div>
              <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 12.5, color: colors.forest }}>{mins > 0 ? fmtHeuresDec(mins / 60) + " h" : ""}</div>
              <MoreVertical size={14} color={colors.inkSoft} style={{ marginLeft: 8 }} />
            </div>
          );
        })}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${colors.line}` }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: colors.inkSoft }}>Total semaine</span>
          <strong style={{ fontFamily: "Fredoka, sans-serif", fontSize: 14, color: colors.ink }}>{fmtHeuresDec(weekTotalMins / 60)} h</strong>
        </div>
      </div>

      <button onClick={() => onEditDay(today)} style={{ ...s.secondaryBtn, width: "100%", marginTop: 12, color: colors.danger, borderColor: "#F3D9D4" }}>
        Signaler une absence
      </button>

      <div style={{ marginTop: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 13.5, color: colors.forestDeep, flex: 1 }}>Notes pour les parents</div>
          <button onClick={() => setChildSubTab(childSubTab === "timeline" ? "events" : "timeline")} style={s.smallGhostBtn}>
            {childSubTab === "timeline" ? "Ajouter une note" : "Voir le journal"}
          </button>
        </div>

        {childSubTab === "events" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {EVENT_TYPES.map(et => (
              <button key={et.key} onClick={() => onLog(et.key)} style={{ ...s.eventBtn, background: et.color }}>
                <et.icon size={19} color="#fff" />
                <span style={{ fontFamily: "Fredoka, sans-serif", fontSize: 11.5, color: "#fff" }}>{et.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <DateStepper dateISO={journalDate} onChange={setJournalDate} />
            <button onClick={() => onExportDay(dayEvents)} style={{ ...s.smallGhostBtn, marginTop: 10 }}>
              <Printer size={14} /> Exporter cette journée en PDF
            </button>
            <div style={{ marginTop: 14 }}>
              {dayEvents.length === 0 ? (
                <div style={{ ...s.emptyState, padding: "28px 16px" }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: colors.inkSoft }}>Aucune note ce jour-là.</div>
                </div>
              ) : (
                <div style={{ position: "relative", paddingLeft: 22 }}>
                  <div style={s.timelineRail} />
                  {dayEvents.map(ev => {
                    const meta = EVENT_MAP[ev.type] || { label: ev.type, icon: Camera, color: colors.inkSoft };
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
  const [meals, setMeals] = useState({ petitDejeuner: false, repas: eventType.key === "repas", gouter: false });

  function toggleMeal(key) { setMeals(m => ({ ...m, [key]: !m[key] })); }

  function confirm() {
    const [h, m] = time.split(":").map(Number);
    const ts = new Date();
    ts.setHours(h, m, 0, 0);
    const mealsArr = eventType.key === "repas" ? Object.keys(meals).filter(k => meals[k]) : undefined;
    onConfirm(ts.toISOString(), note.trim(), mealsArr);
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
        {eventType.key === "repas" && (
          <Field label="Repas fournis (pour la paie)">
            <div style={{ display: "flex", gap: 8 }}>
              {MEAL_TYPES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleMeal(key)}
                  style={{ ...s.toggleBtn, ...(meals[key] ? { background: colors.forest, color: "#fff", borderColor: colors.forest } : {}) }}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
        )}
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
  const [tauxHoraire, setTauxHoraire] = useState(initial?.tauxHoraire ?? "");
  const [baseHeuresMois, setBaseHeuresMois] = useState(initial?.baseHeuresMois ?? "");

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
      tauxHoraire: parseFloat(tauxHoraire) || 0,
      baseHeuresMois: parseFloat(baseHeuresMois) || 0,
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

        <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 15, color: colors.ink, margin: "18px 0 8px" }}>Rémunération</div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Taux horaire net (€)">
              <input type="number" step="0.01" min="0" value={tauxHoraire} onChange={e => setTauxHoraire(e.target.value)} style={s.input} placeholder="3,10" />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Base heures/mois">
              <input type="number" step="0.5" min="0" value={baseHeuresMois} onChange={e => setBaseHeuresMois(e.target.value)} style={s.input} placeholder="75" />
            </Field>
          </div>
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: colors.inkSoft, marginTop: -8, marginBottom: 4 }}>
          Utilisés pour calculer le bulletin de paie automatiquement (onglet Présences).
        </div>

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
/* Day editor — quick edit for one day (used by Calendrier & ChildDetail) */
/* ------------------------------------------------------------------ */
function DayEditorModal({ child, dateISO, rec, onSave, onCancel }) {
  const r = rec || {};
  const [ma, setMa] = useState(r.ma || "");
  const [md, setMd] = useState(r.md || "");
  const [aa, setAa] = useState(r.aa || "");
  const [ad, setAd] = useState(r.ad || "");
  const [repas, setRepas] = useState(!!r.repas);
  const [petitDejeuner, setPetitDejeuner] = useState(!!r.petitDejeuner);
  const [gouter, setGouter] = useState(!!r.gouter);
  const [absence, setAbsence] = useState(r.absence || "");

  function submit() {
    onSave({ ma, md, aa, ad, repas, petitDejeuner, gouter, absence: absence.trim() });
  }

  if (!child) return null;

  return (
    <Overlay onClose={onCancel}>
      <div style={{ ...s.sheet, maxWidth: 400 }}>
        <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 17, color: colors.ink, marginBottom: 2 }}>{child.firstName}</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: colors.inkSoft, marginBottom: 14, textTransform: "capitalize" }}>{fmtDateLong(dateISO)}</div>

        <Field label="Matin">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="time" value={ma} onChange={e => setMa(e.target.value)} style={s.input} />
            <span style={{ color: colors.inkSoft }}>→</span>
            <input type="time" value={md} onChange={e => setMd(e.target.value)} style={s.input} />
          </div>
        </Field>
        <Field label="Après-midi (si coupure)">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="time" value={aa} onChange={e => setAa(e.target.value)} style={s.input} />
            <span style={{ color: colors.inkSoft }}>→</span>
            <input type="time" value={ad} onChange={e => setAd(e.target.value)} style={s.input} />
          </div>
        </Field>
        <Field label="Repas fournis">
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setPetitDejeuner(v => !v)} style={{ ...s.toggleBtn, ...(petitDejeuner ? { background: colors.forest, color: "#fff", borderColor: colors.forest } : {}) }}>Petit-déj</button>
            <button onClick={() => setRepas(v => !v)} style={{ ...s.toggleBtn, ...(repas ? { background: colors.forest, color: "#fff", borderColor: colors.forest } : {}) }}>Repas</button>
            <button onClick={() => setGouter(v => !v)} style={{ ...s.toggleBtn, ...(gouter ? { background: colors.forest, color: "#fff", borderColor: colors.forest } : {}) }}>Goûter</button>
          </div>
        </Field>
        <Field label="Absence (facultatif)">
          <input type="text" value={absence} onChange={e => setAbsence(e.target.value)} placeholder="Ex : Enfant malade, congé, férié…" style={s.input} />
        </Field>

        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button onClick={onCancel} style={s.secondaryBtn}>Annuler</button>
          <button onClick={submit} style={{ ...s.primaryBtn, flex: 1, justifyContent: "center" }}><Check size={16} /> Enregistrer</button>
        </div>
      </div>
    </Overlay>
  );
}
function BaremesModal({ baremes, onSave, onCancel, sheetsWebhook, onSaveWebhook }) {
  const [entretien, setEntretien] = useState(baremes.entretien.map(b => ({ ...b })));
  const [repas, setRepas] = useState(baremes.repas);
  const [petitDejeuner, setPetitDejeuner] = useState(baremes.petitDejeuner);
  const [gouter, setGouter] = useState(baremes.gouter);
  const [congesPayesPercent, setCongesPayesPercent] = useState(baremes.congesPayesPercent);
  const [majorationHeuresSup, setMajorationHeuresSup] = useState(baremes.majorationHeuresSup);
  const [webhook, setWebhook] = useState(sheetsWebhook || "");

  const bracketLabels = ["Moins de 8h", "8h - 9h", "9h - 10h", "10h - 11h", "Plus de 11h"];

  function updateBracket(i, value) {
    setEntretien(entretien.map((b, idx) => idx === i ? { ...b, rate: parseFloat(value) || 0 } : b));
  }

  function submit() {
    onSave({
      entretien,
      repas: parseFloat(repas) || 0,
      petitDejeuner: parseFloat(petitDejeuner) || 0,
      gouter: parseFloat(gouter) || 0,
      congesPayesPercent: parseFloat(congesPayesPercent) || 0,
      majorationHeuresSup: parseFloat(majorationHeuresSup) || 0,
    });
    onSaveWebhook(webhook.trim());
  }

  return (
    <Overlay onClose={onCancel} full>
      <div style={s.fullSheet}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 20, color: colors.ink }}>Réglages de paie</div>
          <button onClick={onCancel} style={s.iconBtnLight}><X size={18} color={colors.ink} /></button>
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: colors.inkSoft, marginBottom: 16, lineHeight: 1.6 }}>
          Ces montants sont les mêmes pour tous les enfants. Vérifiez qu'ils correspondent à la convention collective en vigueur — ce sont des valeurs par défaut, à ajuster si besoin.
        </div>

        <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 14, color: colors.forestDeep, marginBottom: 8 }}>Indemnité d'entretien / jour</div>
        {entretien.map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ flex: 1, fontFamily: "Inter, sans-serif", fontSize: 13, color: colors.ink }}>{bracketLabels[i] || `Tranche ${i + 1}`}</span>
            <input type="number" step="0.01" min="0" value={b.rate} onChange={e => updateBracket(i, e.target.value)} style={{ ...s.input, width: 90 }} />
          </div>
        ))}

        <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 14, color: colors.forestDeep, margin: "18px 0 8px" }}>Indemnités de repas</div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><Field label="Petit-déj (€)"><input type="number" step="0.01" min="0" value={petitDejeuner} onChange={e => setPetitDejeuner(e.target.value)} style={s.input} /></Field></div>
          <div style={{ flex: 1 }}><Field label="Repas (€)"><input type="number" step="0.01" min="0" value={repas} onChange={e => setRepas(e.target.value)} style={s.input} /></Field></div>
          <div style={{ flex: 1 }}><Field label="Goûter (€)"><input type="number" step="0.01" min="0" value={gouter} onChange={e => setGouter(e.target.value)} style={s.input} /></Field></div>
        </div>

        <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 14, color: colors.forestDeep, margin: "18px 0 8px" }}>Autres</div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><Field label="Congés payés (%)"><input type="number" step="0.1" min="0" value={congesPayesPercent} onChange={e => setCongesPayesPercent(e.target.value)} style={s.input} /></Field></div>
          <div style={{ flex: 1 }}><Field label="Majoration heures sup. (%)"><input type="number" step="1" min="0" value={majorationHeuresSup} onChange={e => setMajorationHeuresSup(e.target.value)} style={s.input} /></Field></div>
        </div>

        <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 14, color: colors.forestDeep, margin: "18px 0 8px" }}>Google Sheets</div>
        <Field label="URL de l'application Google Apps Script">
          <input type="text" value={webhook} onChange={e => setWebhook(e.target.value)} style={s.input} placeholder="https://script.google.com/macros/s/.../exec" />
        </Field>

        <button onClick={submit} style={{ ...s.primaryBtn, width: "100%", justifyContent: "center", marginTop: 14 }}>
          <Check size={16} /> Enregistrer les réglages
        </button>
      </div>
    </Overlay>
  );
}

/* ------------------------------------------------------------------ */
/* Saisie — grille façon tableur (heures, repas, absences)              */
/* ------------------------------------------------------------------ */
function SaisieGrid({ children, timesheet, onUpdateDay, dayMinutes, baremes, sheetsWebhook, sheetsStatus, onPushSheets, onOpenSettings }) {
  const [childId, setChildId] = useState(children[0]?.id || null);
  const [monthISO, setMonthISO] = useState(new Date().toISOString().slice(0, 7));

  const child = children.find(c => c.id === childId);

  const shiftMonth = (n) => {
    const [y, m] = monthISO.split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    setMonthISO(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const monthLabel = () => {
    const [y, m] = monthISO.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  };

  if (children.length === 0) {
    return <div style={{ padding: 16 }}><div style={s.emptyState}><div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: colors.inkSoft }}>Ajoutez un enfant pour saisir ses heures.</div></div></div>;
  }

  const childSheet = timesheet[child.id] || {};
  const days = daysInMonth(monthISO);
  let totalMins = 0;
  days.forEach(d => { totalMins += dayMinutes(childSheet[d]); });

  function entretienRate(mins) {
    if (mins <= 0) return 0;
    const hours = mins / 60;
    const sorted = [...baremes.entretien].sort((a, b) => a.max - b.max);
    const bracket = sorted.find(b => hours <= b.max) || sorted[sorted.length - 1];
    return bracket.rate;
  }

  return (
    <div style={{ padding: "16px 12px" }}>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 4 }}>
        {children.map(c => (
          <button key={c.id} onClick={() => setChildId(c.id)} style={{ ...s.childChip, ...(c.id === childId ? { background: c.color, borderColor: c.color } : {}) }}>
            <span style={{ fontFamily: "Fredoka, sans-serif", fontSize: 13, color: c.id === childId ? "#fff" : colors.ink }}>{c.firstName}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 12px" }}>
        <button onClick={() => shiftMonth(-1)} style={s.iconBtnLight}><ChevronLeft size={16} color={colors.forest} /></button>
        <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 15, color: colors.ink, textTransform: "capitalize" }}>{monthLabel()}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => shiftMonth(1)} style={s.iconBtnLight}><ChevronRight size={16} color={colors.forest} /></button>
          <button onClick={onOpenSettings} style={s.iconBtnLight} aria-label="Réglages de paie"><Settings size={16} color={colors.forest} /></button>
        </div>
      </div>

      <div style={{ overflowX: "auto", border: `1px solid ${colors.line}`, borderRadius: 12, background: colors.card }}>
        <table style={s.gridTable}>
          <thead>
            <tr>
              <th style={s.gridTh}>Jour</th>
              <th style={s.gridTh} colSpan={2}>Matin</th>
              <th style={s.gridTh} colSpan={2}>Après-midi</th>
              <th style={s.gridTh}>Total</th>
              <th style={s.gridTh}>Entr.</th>
              <th style={s.gridTh}>🍼</th>
              <th style={s.gridTh}>🍽</th>
              <th style={s.gridTh}>🍪</th>
              <th style={s.gridTh}>Absence</th>
            </tr>
            <tr>
              <th style={s.gridThSub}></th>
              <th style={s.gridThSub}>Arr.</th>
              <th style={s.gridThSub}>Dép.</th>
              <th style={s.gridThSub}>Arr.</th>
              <th style={s.gridThSub}>Dép.</th>
              <th style={s.gridThSub}></th>
              <th style={s.gridThSub}></th>
              <th style={s.gridThSub}></th>
              <th style={s.gridThSub}></th>
              <th style={s.gridThSub}></th>
              <th style={s.gridThSub}></th>
            </tr>
          </thead>
          <tbody>
            {days.map(day => {
              const rec = childSheet[day] || {};
              const mins = dayMinutes(rec);
              const d = new Date(day + "T00:00:00");
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <tr key={day} style={isWeekend ? { background: colors.bg } : undefined}>
                  <td style={s.gridTdLabel}>
                    <div style={{ fontFamily: "Fredoka, sans-serif" }}>{d.getDate()}</div>
                    <div style={{ fontSize: 9.5, color: colors.inkSoft }}>{DAY_LABELS_FULL[isoDayIndex(d)].slice(0, 3)}</div>
                  </td>
                  <td style={s.gridTd}><input type="time" value={rec.ma || ""} onChange={e => onUpdateDay(child.id, day, { ma: e.target.value })} style={s.gridInput} /></td>
                  <td style={s.gridTd}><input type="time" value={rec.md || ""} onChange={e => onUpdateDay(child.id, day, { md: e.target.value })} style={s.gridInput} /></td>
                  <td style={s.gridTd}><input type="time" value={rec.aa || ""} onChange={e => onUpdateDay(child.id, day, { aa: e.target.value })} style={s.gridInput} /></td>
                  <td style={s.gridTd}><input type="time" value={rec.ad || ""} onChange={e => onUpdateDay(child.id, day, { ad: e.target.value })} style={s.gridInput} /></td>
                  <td style={{ ...s.gridTd, fontFamily: "Fredoka, sans-serif", fontSize: 12 }}>{mins > 0 ? fmtHeuresDec(mins / 60) : ""}</td>
                  <td style={{ ...s.gridTd, fontSize: 11, color: colors.inkSoft }}>{mins > 0 ? fmtEuro(entretienRate(mins)) : ""}</td>
                  <td style={s.gridTd}><input type="checkbox" checked={!!rec.petitDejeuner} onChange={e => onUpdateDay(child.id, day, { petitDejeuner: e.target.checked })} /></td>
                  <td style={s.gridTd}><input type="checkbox" checked={!!rec.repas} onChange={e => onUpdateDay(child.id, day, { repas: e.target.checked })} /></td>
                  <td style={s.gridTd}><input type="checkbox" checked={!!rec.gouter} onChange={e => onUpdateDay(child.id, day, { gouter: e.target.checked })} /></td>
                  <td style={s.gridTd}><input type="text" value={rec.absence || ""} onChange={e => onUpdateDay(child.id, day, { absence: e.target.value })} placeholder="—" style={{ ...s.gridInput, width: 60 }} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontFamily: "Inter, sans-serif", fontSize: 13, color: colors.ink }}>
        <span>Total du mois</span>
        <strong style={{ fontFamily: "Fredoka, sans-serif", color: colors.forest }}>{fmtHeuresDec(totalMins / 60)} h</strong>
      </div>

      {sheetsWebhook ? (
        <button onClick={() => onPushSheets(child, monthISO)} style={{ ...s.primaryBtn, width: "100%", justifyContent: "center", marginTop: 14 }}>
          {sheetsStatus === "sending" ? "Envoi en cours…" : <><Send size={16} /> Envoyer vers Google Sheets</>}
        </button>
      ) : (
        <button onClick={onOpenSettings} style={{ ...s.secondaryBtn, width: "100%", marginTop: 14 }}>
          Configurer l'envoi vers Google Sheets
        </button>
      )}
      {sheetsStatus === "ok" && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: colors.forest, marginTop: 8, textAlign: "center" }}>Envoyé — vérifiez votre feuille Google Sheets.</div>}
      {sheetsStatus === "error" && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: colors.danger, marginTop: 8, textAlign: "center" }}>Échec de l'envoi. Vérifiez l'URL dans les réglages.</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Calendrier — vue mensuelle colorée                                    */
/* ------------------------------------------------------------------ */
function CalendarView({ children, timesheet, dayMinutes, monthISO, setMonthISO, onEditDay }) {
  const [filterId, setFilterId] = useState("tous");

  const shiftMonth = (n) => {
    const [y, m] = monthISO.split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    setMonthISO(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const monthLabel = () => {
    const [y, m] = monthISO.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  };

  if (children.length === 0) {
    return <div style={{ padding: 16 }}><div style={s.emptyState}><div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: colors.inkSoft }}>Ajoutez un enfant pour voir le calendrier.</div></div></div>;
  }

  const days = daysInMonth(monthISO);
  const leading = isoDayIndex(new Date(days[0] + "T00:00:00"));
  const today = todayISO();

  function dayInfo(dateISO) {
    if (filterId === "tous") {
      let total = 0;
      children.forEach(c => { total += dayMinutes((timesheet[c.id] || {})[dateISO]); });
      return { status: total > 0 ? "travaille" : "none", mins: total };
    }
    const child = children.find(c => c.id === filterId);
    if (!child) return { status: "none", mins: 0 };
    const rec = (timesheet[child.id] || {})[dateISO] || {};
    const mins = dayMinutes(rec);
    if (rec.absence) {
      const isFerie = /féri/i.test(rec.absence);
      return { status: isFerie ? "ferie" : "absence", mins };
    }
    if (mins > 0) return { status: "travaille", mins };
    const dow = isoDayIndex(new Date(dateISO + "T00:00:00"));
    const scheduled = (child.schedule?.days || []).includes(dow);
    if (!scheduled) return { status: "none", mins: 0 };
    return { status: dateISO <= today ? "manquant" : "prevu", mins: 0 };
  }

  const statusStyle = {
    travaille: { background: "#DCEBE3", color: colors.forestDeep },
    absence: { background: colors.blush, color: colors.danger },
    ferie: { background: "#F7E9C4", color: "#8A6B1E" },
    manquant: { background: "#fff", color: colors.danger, border: `1.5px solid ${colors.danger}` },
    prevu: { background: "#E7F0F5", color: colors.navy },
    none: { background: "transparent", color: colors.inkSoft },
  };

  let sumMins = 0, joursTravailles = 0, joursPrevus = 0, joursAbsence = 0;
  days.forEach(d => {
    const info = dayInfo(d);
    if (info.status === "travaille") { sumMins += info.mins; joursTravailles++; joursPrevus++; }
    if (info.status === "manquant" || info.status === "prevu") joursPrevus++;
    if (info.status === "absence" || info.status === "ferie") joursAbsence++;
  });
  const selectedChild = children.find(c => c.id === filterId);
  const heuresComp = selectedChild && selectedChild.baseHeuresMois > 0 ? Math.max(0, sumMins / 60 - selectedChild.baseHeuresMois) : 0;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10 }}>
        <button onClick={() => setFilterId("tous")} style={{ ...s.childChip, ...(filterId === "tous" ? { background: colors.forest, borderColor: colors.forest } : {}) }}>
          <span style={{ fontFamily: "Fredoka, sans-serif", fontSize: 13, color: filterId === "tous" ? "#fff" : colors.ink }}>Tous</span>
        </button>
        {children.map(c => (
          <button key={c.id} onClick={() => setFilterId(c.id)} style={{ ...s.childChip, ...(filterId === c.id ? { background: c.color, borderColor: c.color } : {}) }}>
            <span style={{ fontFamily: "Fredoka, sans-serif", fontSize: 13, color: filterId === c.id ? "#fff" : colors.ink }}>{c.firstName}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 12px" }}>
        <button onClick={() => shiftMonth(-1)} style={s.iconBtnLight}><ChevronLeft size={16} color={colors.forest} /></button>
        <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 16, color: colors.ink, textTransform: "capitalize" }}>{monthLabel()}</div>
        <button onClick={() => shiftMonth(1)} style={s.iconBtnLight}><ChevronRight size={16} color={colors.forest} /></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
        {DAY_LABELS_FULL.map(d => <div key={d} style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 10.5, color: colors.inkSoft }}>{d[0]}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {Array.from({ length: leading }).map((_, i) => <div key={"b" + i} />)}
        {days.map(d => {
          const info = dayInfo(d);
          const dNum = Number(d.slice(8, 10));
          const clickable = filterId !== "tous";
          return (
            <button
              key={d}
              onClick={() => clickable && onEditDay(filterId, d)}
              style={{ ...s.calDay, ...statusStyle[info.status], cursor: clickable ? "pointer" : "default" }}
            >
              <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 13 }}>{dNum}</div>
              {info.status === "travaille" && <div style={{ fontSize: 9.5 }}>{fmtHeuresDec(info.mins / 60)}h</div>}
            </button>
          );
        })}
      </div>

      <div style={s.legendRow}>
        {[["travaille", "Travaillé"], ["absence", "Absence"], ["manquant", "Manquant"], ["ferie", "Férié"], ["prevu", "Prévu"]].map(([k, l]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: statusStyle[k].background, border: statusStyle[k].border || "none" }} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: colors.inkSoft }}>{l}</span>
          </div>
        ))}
      </div>

      <div style={s.calSummary}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 0.4 }}>
          Récap {monthLabel()}
        </div>
        <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 22, color: "#fff", margin: "4px 0 8px" }}>{fmtHeuresDec(sumMins / 60)} h total</div>
        {selectedChild ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 14, color: "#fff" }}>{selectedChild.firstName}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "rgba(255,255,255,0.75)" }}>{joursTravailles}j trav / {joursPrevus}j prévus · {joursAbsence}j abs</div>
            </div>
            {heuresComp > 0 && <span style={s.badgeOnDark}>+{fmtHeuresDec(heuresComp)}h comp</span>}
          </div>
        ) : (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: "rgba(255,255,255,0.75)" }}>Sélectionnez un enfant pour le détail et modifier un jour.</div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Facture — récapitulatif mensuel + récap Pajemploi                    */
/* ------------------------------------------------------------------ */
function Facture({ child, monthISO, setMonthISO, timesheet, dayMinutes, baremes, computeMonthlyPaie, onExport, onOpenBaremes }) {
  const shiftMonth = (n) => {
    const [y, m] = monthISO.split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    setMonthISO(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const monthLabel = () => {
    const [y, m] = monthISO.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  };

  if (!child) return <div style={{ padding: 16 }}><div style={s.emptyState}><div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: colors.inkSoft }}>Enfant introuvable.</div></div></div>;

  const childSheet = timesheet[child.id] || {};
  const days = daysInMonth(monthISO).filter(d => {
    const rec = childSheet[d];
    return rec && (dayMinutes(rec) > 0 || rec.absence);
  });
  const paie = computeMonthlyPaie(child, monthISO);
  const joursMensualises = (() => {
    let n = 0;
    daysInMonth(monthISO).forEach(d => {
      const dow = isoDayIndex(new Date(d + "T00:00:00"));
      if ((child.schedule?.days || []).includes(dow)) n++;
    });
    return n;
  })();

  return (
    <div style={{ padding: 16, paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={() => shiftMonth(-1)} style={s.iconBtnLight}><ChevronLeft size={16} color={colors.forest} /></button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 16, color: colors.ink }}>Facture — {child.firstName}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: colors.inkSoft, textTransform: "capitalize" }}>{monthLabel()}</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => shiftMonth(1)} style={s.iconBtnLight}><ChevronRight size={16} color={colors.forest} /></button>
          <button onClick={onOpenBaremes} style={s.iconBtnLight}><Settings size={16} color={colors.forest} /></button>
        </div>
      </div>

      <div style={s.factureCard}>
        <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 12, color: colors.inkSoft, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>Détail du mois</div>
        {days.length === 0 ? (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: colors.inkSoft }}>Aucune donnée ce mois-ci.</div>
        ) : days.map(d => {
          const rec = childSheet[d];
          const mins = dayMinutes(rec);
          const dObj = new Date(d + "T00:00:00");
          return (
            <div key={d} style={s.factureDayRow}>
              <div style={{ width: 56, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: colors.ink, textTransform: "capitalize" }}>
                {DAY_LABELS_FULL[isoDayIndex(dObj)].slice(0, 3)} {dObj.getDate()}
              </div>
              {rec.absence ? (
                <>
                  <div style={{ flex: 1, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: colors.inkSoft }}>🤒 {rec.absence}</div>
                  <span style={s.badgeMuted}>Non rém.</span>
                </>
              ) : (
                <>
                  <div style={{ flex: 1, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: colors.ink }}>{rec.ma} → {rec.md}{rec.aa ? ` · ${rec.aa} → ${rec.ad}` : ""}</div>
                  <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 13, color: colors.forest }}>{fmtHeuresDec(mins / 60)}h</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div style={s.factureCard}>
        <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 12, color: colors.inkSoft, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>Récapitulatif</div>
        <div style={s.paieRow}><span>Salaire de base</span><strong>{fmtEuro(paie.salaireBase)}</strong></div>
        {paie.heuresSup > 0 && (
          <div style={s.paieRow}><span>Heures complémentaires ({fmtHeuresDec(paie.heuresSup)}h)</span><strong>{fmtEuro(paie.remunerationHeuresSup)}</strong></div>
        )}
        <div style={s.paieRow}><span>Congés payés</span><strong>{fmtEuro(paie.congesPayes)}</strong></div>
        <div style={s.paieDivider} />
        <div style={s.paieRow}><span>Ind. entretien ({paie.daysWorked}j)</span><strong>{fmtEuro(paie.entretienTotal)}</strong></div>
        <div style={s.paieRow}><span>Ind. repas ({paie.countRepas + paie.countPetitDej + paie.countGouter} repas)</span><strong>{fmtEuro(paie.indemniteRepas)}</strong></div>
      </div>

      <div style={s.factureTotalBanner}>
        <div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.75)", textTransform: "uppercase" }}>Total dû</div>
          <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 26, color: "#fff" }}>{fmtEuro(paie.totalNet)}</div>
        </div>
        <div style={{ fontSize: 26 }}>💶</div>
      </div>

      <div style={{ ...s.factureCard, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <ClipboardList size={15} color={colors.forest} />
          <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 13, color: colors.ink }}>Récap Pajemploi — {child.firstName} — <span style={{ textTransform: "capitalize" }}>{monthLabel()}</span></div>
        </div>
        <div style={s.paieRow}><span>Période d'emploi</span><strong>{daysInMonth(monthISO)[0]?.split("-").reverse().join("/")} → {daysInMonth(monthISO).at(-1)?.split("-").reverse().join("/")}</strong></div>
        <div style={s.paieRow}><span>Jours d'activité</span><strong>{paie.daysWorked}</strong></div>
        <div style={s.paieRow}><span>Heures à déclarer</span><strong>{fmtHeuresDec(paie.totalHeures)} h</strong></div>
        <div style={s.paieDivider} />
        <div style={s.paieRow}><span>Heures normales ({fmtHeuresDec(paie.heuresBase)}h)</span><strong>{fmtEuro(paie.salaireBase)}</strong></div>
        {paie.heuresSup > 0 && (
          <div style={s.paieRow}><span>Heures majorées ({fmtHeuresDec(paie.heuresSup)}h)</span><strong>{fmtEuro(paie.remunerationHeuresSup)}</strong></div>
        )}
        <div style={s.paieDivider} />
        <div style={s.paieRow}><span>Indemnités et frais</span><strong>{fmtEuro(paie.entretienTotal + paie.indemniteRepas)}</strong></div>
        <div style={{ ...s.paieRow, marginTop: 4 }}>
          <span style={{ fontFamily: "Fredoka, sans-serif", color: colors.ink }}>{joursMensualises} jours mensualisés à déclarer</span>
          <strong style={{ fontFamily: "Fredoka, sans-serif", color: colors.forest }}>{fmtEuro(paie.totalNet)}</strong>
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: colors.inkSoft, marginTop: 10, lineHeight: 1.5 }}>
          Estimation à vérifier sur le site officiel Pajemploi avant déclaration — les règles de mensualisation et de cotisations peuvent varier selon votre situation.
        </div>
      </div>

      <button
        onClick={() => onExport({ type: "paie", child, monthLabel: monthLabel(), paie })}
        style={{ ...s.primaryBtn, width: "100%", justifyContent: "center", marginTop: 14 }}
      >
        <Printer size={16} /> Exporter la facture en PDF
      </button>
    </div>
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
function Presence({ children, presenceMonth, setPresenceMonth, presenceChildId, setPresenceChildId, monthlyPresence, computeMonthlyPaie, onExport, onOpenBaremes }) {
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
  const paie = child ? computeMonthlyPaie(child, presenceMonth) : null;

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
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => shiftMonth(1)} style={s.iconBtnLight}><ChevronRight size={16} color={colors.forest} /></button>
          <button onClick={onOpenBaremes} style={s.iconBtnLight} aria-label="Réglages de paie"><Settings size={16} color={colors.forest} /></button>
        </div>
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

      {child && paie && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "24px 0 10px" }}>
            <Wallet size={17} color={colors.forest} />
            <div style={{ fontFamily: "Fredoka, sans-serif", fontSize: 15, color: colors.ink }}>Bulletin de paie</div>
          </div>

          {(!paie.tauxHoraire) ? (
            <div style={s.emptyState}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: colors.inkSoft }}>
                Renseignez le taux horaire de {child.firstName} dans sa fiche pour calculer la paie.
              </div>
            </div>
          ) : (
            <div style={s.paieCard}>
              <div style={s.paieRow}><span>Heures réalisées</span><strong>{fmtHeuresDec(paie.totalHeures)} h</strong></div>
              {paie.baseHeuresMois > 0 && (
                <div style={s.paieRow}><span>dont heures supplémentaires</span><strong>{fmtHeuresDec(paie.heuresSup)} h</strong></div>
              )}
              <div style={s.paieRow}><span>Jours travaillés</span><strong>{paie.daysWorked}</strong></div>
              <div style={s.paieDivider} />
              <div style={s.paieRow}><span>Salaire de base</span><strong>{fmtEuro(paie.salaireBase)}</strong></div>
              {paie.heuresSup > 0 && (
                <div style={s.paieRow}><span>Rémunération heures sup.</span><strong>{fmtEuro(paie.remunerationHeuresSup)}</strong></div>
              )}
              <div style={s.paieRow}><span>Indemnités de congés payés</span><strong>{fmtEuro(paie.congesPayes)}</strong></div>
              <div style={s.paieRow}><span>Indemnités d'entretien</span><strong>{fmtEuro(paie.entretienTotal)}</strong></div>
              <div style={s.paieRow}><span>Indemnités de repas</span><strong>{fmtEuro(paie.indemniteRepas)}</strong></div>
              <div style={s.paieDivider} />
              <div style={{ ...s.paieRow, fontSize: 16 }}>
                <span style={{ fontFamily: "Fredoka, sans-serif", color: colors.ink }}>Total net à verser</span>
                <strong style={{ color: colors.forest, fontFamily: "Fredoka, sans-serif" }}>{fmtEuro(paie.totalNet)}</strong>
              </div>
            </div>
          )}

          <button
            onClick={() => onExport({ type: "paie", child, monthLabel: monthLabel(), paie })}
            style={{ ...s.primaryBtn, width: "100%", justifyContent: "center", marginTop: 12 }}
          >
            <Printer size={16} /> Exporter le bulletin en PDF
          </button>
        </>
      )}
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
        ) : data.type === "paie" ? (
          <>
            <h1 style={s.reportTitle}>Bulletin de paie</h1>
            <div style={s.reportMeta}>
              <div><strong>Enfant :</strong> {data.child.firstName} {data.child.lastName}</div>
              <div><strong>Période :</strong> <span style={{ textTransform: "capitalize" }}>{data.monthLabel}</span></div>
              <div><strong>Taux horaire net :</strong> {fmtEuro(data.paie.tauxHoraire)}</div>
            </div>
            <table style={s.reportTable}>
              <tbody>
                <tr><td style={s.td}>Heures réalisées</td><td style={{ ...s.td, textAlign: "right" }}>{fmtHeuresDec(data.paie.totalHeures)} h</td></tr>
                {data.paie.baseHeuresMois > 0 && (
                  <tr><td style={s.td}>dont heures supplémentaires</td><td style={{ ...s.td, textAlign: "right" }}>{fmtHeuresDec(data.paie.heuresSup)} h</td></tr>
                )}
                <tr><td style={s.td}>Jours travaillés</td><td style={{ ...s.td, textAlign: "right" }}>{data.paie.daysWorked}</td></tr>
                <tr><td style={s.td}>Salaire de base</td><td style={{ ...s.td, textAlign: "right" }}>{fmtEuro(data.paie.salaireBase)}</td></tr>
                {data.paie.heuresSup > 0 && (
                  <tr><td style={s.td}>Rémunération heures supplémentaires</td><td style={{ ...s.td, textAlign: "right" }}>{fmtEuro(data.paie.remunerationHeuresSup)}</td></tr>
                )}
                <tr><td style={s.td}>Indemnités de congés payés</td><td style={{ ...s.td, textAlign: "right" }}>{fmtEuro(data.paie.congesPayes)}</td></tr>
                <tr><td style={s.td}>Indemnités d'entretien</td><td style={{ ...s.td, textAlign: "right" }}>{fmtEuro(data.paie.entretienTotal)}</td></tr>
                <tr><td style={s.td}>Indemnités de repas</td><td style={{ ...s.td, textAlign: "right" }}>{fmtEuro(data.paie.indemniteRepas)}</td></tr>
                <tr>
                  <td style={{ ...s.td, fontFamily: "Fredoka, sans-serif", fontSize: 15, borderTop: `2px solid ${colors.forest}` }}>Total net à verser</td>
                  <td style={{ ...s.td, textAlign: "right", fontFamily: "Fredoka, sans-serif", fontSize: 15, color: colors.forest, borderTop: `2px solid ${colors.forest}` }}>{fmtEuro(data.paie.totalNet)}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: colors.inkSoft, marginTop: 14 }}>
              Calculé automatiquement à partir des pointages et des repas enregistrés. À vérifier avant tout versement.
            </div>
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
                    <td style={s.td}>{EVENT_MAP[ev.type]?.label || ev.type}</td>
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
    const headers = ["Prénom", "Nom", "Sexe", "Date de naissance", "Jours d'accueil", "Début", "Fin", "Taux horaire (€)", "Base heures/mois", "Parents"];
    const rows = children.map(c => [
      c.firstName, c.lastName, c.gender === "F" ? "Fille" : "Garçon", c.birthDate || "",
      (c.schedule?.days || []).map(i => DAY_LABELS_FULL[i]).join(" / "),
      c.schedule?.start || "", c.schedule?.end || "",
      c.tauxHoraire || "", c.baseHeuresMois || "",
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
  paieCard: { background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 16, padding: 16 },
  paieRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", fontFamily: "Inter, sans-serif", fontSize: 13.5, color: colors.ink },
  paieDivider: { height: 1, background: colors.line, margin: "6px 0" },
  gridTable: { borderCollapse: "collapse", fontFamily: "Inter, sans-serif", fontSize: 11, minWidth: 640 },
  gridTh: { background: colors.forest, color: "#fff", padding: "6px 4px", fontWeight: 600, fontSize: 10.5, borderRight: "1px solid rgba(255,255,255,0.15)" },
  gridThSub: { background: colors.forest, color: "rgba(255,255,255,0.75)", padding: "2px 4px", fontWeight: 500, fontSize: 9.5, borderRight: "1px solid rgba(255,255,255,0.15)" },
  gridTd: { padding: "3px 4px", textAlign: "center", borderRight: `1px solid ${colors.line}`, borderBottom: `1px solid ${colors.line}` },
  gridTdLabel: { padding: "3px 6px", textAlign: "center", borderRight: `1px solid ${colors.line}`, borderBottom: `1px solid ${colors.line}`, background: colors.bg, fontSize: 12, color: colors.ink },
  gridInput: { width: 62, border: `1px solid ${colors.line}`, borderRadius: 6, fontSize: 11, padding: "2px 1px", textAlign: "center", background: "#fff" },
  contractCard: { background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 16, padding: 14, marginBottom: 14 },
  editBadge: { position: "absolute", bottom: -3, right: -3, width: 20, height: 20, borderRadius: "50%", background: colors.forest, border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  badgeGreen: { background: "#DCEBE3", color: colors.forestDeep, fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 999 },
  badgeSoft: { background: colors.bg, color: colors.ink, fontFamily: "Inter, sans-serif", fontSize: 11.5, padding: "4px 10px", borderRadius: 999, border: `1px solid ${colors.line}` },
  badgeMuted: { background: colors.blush, color: colors.danger, fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999 },
  badgeOnDark: { background: "rgba(255,255,255,0.2)", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 999 },
  pointageBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: colors.coral, color: "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontFamily: "Fredoka, sans-serif", fontSize: 16, cursor: "pointer", marginBottom: 14 },
  pointageBtnDone: { background: "#DCEBE3", color: colors.forestDeep, cursor: "default" },
  weekCard: { background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 16, padding: 14 },
  weekRow: { display: "flex", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${colors.line}`, cursor: "pointer" },
  calDay: { aspectRatio: "1", border: "none", borderRadius: 9, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, fontFamily: "Inter, sans-serif" },
  legendRow: { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14, padding: "10px 12px", background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 12 },
  calSummary: { background: colors.forestDeep, borderRadius: 16, padding: 16, marginTop: 14 },
  factureCard: { background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 16, padding: 14, marginBottom: 12 },
  factureDayRow: { display: "flex", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${colors.line}` },
  factureTotalBanner: { display: "flex", alignItems: "center", justifyContent: "space-between", background: colors.forest, borderRadius: 16, padding: 16 },
  dashCard: { display: "flex", alignItems: "center", gap: 10, background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 14, padding: 12 },
  dashPointageBtn: { border: "none", borderRadius: 10, padding: "9px 14px", fontFamily: "Fredoka, sans-serif", fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap" },
};
