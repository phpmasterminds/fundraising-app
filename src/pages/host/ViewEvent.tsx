import {
  IonPage,
  IonContent,
  IonIcon
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './ViewEvent.css';
import HostHeader from '../../components/HostHeader';
import {
  getEvent,
  updateEvent,
  startEvent,
  endEvent,
  startRound,
  endRound,
  moveGroupMembers,
  rebalanceGroups,
  deleteGroupMembers,
  createGroup,
} from '../../services/events';
import type { Event, ApiGroup, ApiRound, ApiGroupRow } from '../../services/events';
import { copyOutline, checkmarkOutline } from 'ionicons/icons';

const imgBase = import.meta.env.VITE_ASSETS_URL;

/* ── Local types ── */
interface Donor {
  initial: string;
  name: string;
  sub: string;
  bid: string | null;
  totalCommitted?: string;
  status?: 'bidding' | 'left' | null;
  color: string;
}

interface Group {
  name: string;
  bids: number;
  totalBids: number;
  min?: string;
  alert?: boolean;
  status: 'done' | 'pending' | 'waiting';
  donors: Donor[];
}

interface RoundGroupRow {
  name: string;
  status: 'done' | 'pending' | 'waiting';
  alert?: boolean;
  detail: string | null;
  detailColor?: string;
}

interface RoundData {
  id: number;
  label: string;
  status: 'complete' | 'bidding' | 'not-started';
  raised: string | null;
  alerts: number | null;
  groups: string;
  groupRows: RoundGroupRow[];
}

// ── Proposed Group Allocations types ─────────────────────────────────────────
interface PgaMember {
  id: string;             // composite key for React list
  groupMemberId: number;  // group_members.id — sent to API
  name: string;
  initial: string;
  amount: string;
  emoji: string;
  selected: boolean;
  isYou: boolean;         // true only for the logged-in user's own cell
}

interface PgaGroup {
  id: number;    // groups.id
  label: string; // "Group A"
  members: PgaMember[];
  expanded: boolean;
}

/* ── Color palette for donor avatars ── */
const COLORS = ['#E6F4F2', '#FFF3E6', '#EEF1F4', '#F2F2F2'];

// Fallback emoji pool when emoji is not stored on GroupMember
const EMOJI_POOL = ['🍏','🍒','🐰','🌸','🥜','🧅','🥔','🥦','🦀','🌽','🍇','🍋','🥝','🫐','🍑'];

const ViewEvent: React.FC = () => {
  const router   = useIonRouter();
  const location = useLocation();

  const [showSettings, setShowSettings]           = useState(false);
  const [selectedGroup, setSelectedGroup]         = useState<Group | null>(null);
  const [ignoreZeroBids, setIgnoreZeroBids]       = useState(false);
  const [showQR, setShowQR]                       = useState(false);
  const [showAllDonors, setShowAllDonors]         = useState(false);
  const [showLiveSummary, setShowLiveSummary]     = useState(false);
  const [showRoundOverview, setShowRoundOverview] = useState(false);
  const [activeRoundTab, setActiveRoundTab]       = useState(0);
  const [actionLoading, setActionLoading]         = useState(false);
  const [showCallTimeConfirm, setShowCallTimeConfirm] = useState(false); // Call Time end-round confirmation
  const [showEndEventConfirm, setShowEndEventConfirm] = useState(false); // End Event confirmation

  // ─── Config edit state ────────────────────────────────────────────────────
  const [editName, setEditName]                   = useState('');
  const [editCharityName, setEditCharityName]     = useState('');
  const [editTargetAmount, setEditTargetAmount]   = useState('');
  const [saveLoading, setSaveLoading]             = useState(false);
  const [saveError, setSaveError]                 = useState<string | null>(null);

  // ─── API state ────────────────────────────────────────────────────────────
  const [apiEvent, setApiEvent]   = useState<Event | null>(null);
  const [timerSecs, setTimerSecs]       = useState(0);   // bidding countdown
  const [waitingSecs, setWaitingSecs]   = useState(0);   // waiting-period countdown
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null);
  const waitingRef                = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef                   = useRef<ReturnType<typeof setInterval> | null>(null);
  const [roundEnding, setRoundEnding] = useState(false); // timer hit 0, polling 2s until backend confirms closed

  // ─── Proposed Group Allocations (PGA) state ───────────────────────────────
  const [showPGA, setShowPGA]           = useState(false);
  const [pgaGroups, setPgaGroups]       = useState<PgaGroup[]>([]);
  const [pgaRoundId, setPgaRoundId]     = useState<number | null>(null);
  const [moveSheet, setMoveSheet]       = useState<{
    open: boolean;
    fromGroupId: number | null;
    selectedMemberIds: number[]; // group_member.id[]
  }>({ open: false, fromGroupId: null, selectedMemberIds: [] });
  const [pgaMoveLoading, setPgaMoveLoading] = useState(false);
  const [pgaToast, setPgaToast]         = useState<string | null>(null);
  const [pgaLaunched, setPgaLaunched]   = useState(false);
  const [pgaActionSheet, setPgaActionSheet] = useState<{
    open: boolean;
    fromGroupId: number | null;
    selectedMemberIds: number[];
  }>({ open: false, fromGroupId: null, selectedMemberIds: [] });
  const [pgaDeleteLoading, setPgaDeleteLoading] = useState(false);
  const [pgaCreateLoading, setPgaCreateLoading] = useState(false);
  const moveSheetRef                    = useRef<HTMLDivElement>(null);

  const eventId = new URLSearchParams(location.search).get('id');

  // Parse "HH:MM:SS" or "MM:SS" duration strings into total seconds
  const parseDurationToSecs = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string' && val.includes(':')) {
      const parts = val.split(':').map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
    }
    return Number(val) || 0;
  };

  const seedCountdown = (data: Event) => {
    const timer = data.current_round_timer as any;

    // Use backend-calculated remaining seconds — backend is the source of truth
    // seconds_left = bidding time remaining for the open round
    // waiting_seconds_left = PGA waiting period remaining after round closes
    const biddingSecsLeft = (data as any).seconds_left ?? 0;
    const waitingSecsLeft = (data as any).waiting_seconds_left ?? 0;

    console.log('[seedCountdown]', { biddingSecsLeft, waitingSecsLeft, timer });

    // Clear both running intervals before reseeding
    if (timerRef.current)   { clearInterval(timerRef.current);   timerRef.current   = null; }
    if (waitingRef.current) { clearInterval(waitingRef.current); waitingRef.current = null; }

    if (biddingSecsLeft > 0) {
      // Round is open — show bidding countdown on Call Time button
      setTimerSecs(biddingSecsLeft);
      setWaitingSecs(0);
      timerRef.current = setInterval(() => {
        setTimerSecs(s => Math.max(0, s - 1));
      }, 1000);
    } else if (waitingSecsLeft > 0) {
      // Round closed — show waiting countdown on PGA button
      setTimerSecs(0);
      setWaitingSecs(waitingSecsLeft);
      waitingRef.current = setInterval(() => {
        setWaitingSecs(w => Math.max(0, w - 1));
      }, 1000);
    } else {
      setTimerSecs(0);
      setWaitingSecs(0);
    }
  };

  const refreshEvent = async () => {
    if (!eventId) return;
    const data = await getEvent(Number(eventId));
    setApiEvent(data);
    setIgnoreZeroBids(!!(data as any).ignore_zero_bids);
    if ((data as any).seconds_left != null || (data as any).waiting_seconds_left != null) {
      seedCountdown(data);
    }
  };

  useEffect(() => {
    if (!eventId) return;
    getEvent(Number(eventId)).then((data) => {
      setApiEvent(data);
      setEditName(data.name ?? '');
      setEditCharityName(data.charity_name ?? '');
      setEditTargetAmount(String(data.target_amount ?? ''));
      setIgnoreZeroBids(!!(data as any).ignore_zero_bids);
      if ((data as any).seconds_left != null || (data as any).waiting_seconds_left != null) {
        seedCountdown(data);
      }
    });
  }, [location.search]);

  // ─── Cleanup timers on unmount ───────────────────────────────────────────
  // seedCountdown() owns both interval lifecycles; clean up on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current)   clearInterval(timerRef.current);
      if (waitingRef.current) clearInterval(waitingRef.current);
    };
  }, []);

  // ─── Auto-refresh polling (live events only) ──────────────────────────────
  // Normal: polls every 5s. When timer hits 0 (roundEnding=true): polls every 2s
  // until backend confirms round is closed, then drops back to 5s.
  useEffect(() => {
    if (apiEvent?.status !== 'live') {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    const interval = roundEnding ? 2000 : 5000;
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    pollRef.current = setInterval(() => { refreshEvent(); }, interval);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiEvent?.status, eventId, roundEnding]);

  const formatTimer = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // ─── Host action handlers ─────────────────────────────────────────────────
  const handleStartEvent = async () => {
    if (!eventId || actionLoading) return;
    setActionLoading(true);
    try { const data = await startEvent(Number(eventId)); setApiEvent(data); }
    catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

const handleEndEvent = async () => {
  if (!eventId || actionLoading) return;

  setActionLoading(true);

  try {
    const data = await endEvent(Number(eventId));
    setApiEvent(data);
  } catch (e) {
    console.error(e);
  } finally {
    setActionLoading(false);
  }
};

  const handleStartRound = async () => {
    if (!eventId || actionLoading) return;
    setActionLoading(true);
    try { await startRound(Number(eventId)); await refreshEvent(); }
    catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  const handleEndRound = async () => {
    if (!eventId || actionLoading || !openRound) return;
    setActionLoading(true);
    try { await endRound(Number(eventId), openRound.id); await refreshEvent(); }
    catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  // ─── Save handler ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!eventId || saveLoading) return;
    setSaveError(null);
    setSaveLoading(true);
    try {
      const updated = await updateEvent(Number(eventId), {
        name: editName, charity_name: editCharityName, target_amount: Number(editTargetAmount),
      });
      setApiEvent(updated);
      setShowQR(false);
    } catch (e: any) {
      setSaveError(e?.message ?? 'Failed to save. Please try again.');
    } finally { setSaveLoading(false); }
  };

  // ─── Map API → local types ────────────────────────────────────────────────
  const mapGroups = (apiGroups: ApiGroup[]): Group[] =>
    apiGroups.map((g, gi) => ({
      name: g.name, bids: g.bids, totalBids: g.total_bids,
      min: g.min ?? undefined, alert: g.alert, status: g.status,
      donors: g.donors.map((d, di) => ({
        initial: d.initial, name: d.pseudonym, sub: d.pseudonym,
        bid: d.is_quit ? null : d.bid_amount,
        totalCommitted: d.total_committed ?? undefined,
        status: d.is_quit ? 'left' : d.bid_amount ? null : 'bidding',
        color: COLORS[(gi + di) % COLORS.length],
      })),
    }));

  const mapRounds = (apiRounds: ApiRound[]): RoundData[] =>
    apiRounds.map((r) => ({
      id: r.id, label: `R${r.round_number}`,
      status: r.status === 'closed' ? 'complete' : r.status === 'open' ? 'bidding' : 'not-started',
      raised: r.raised, alerts: r.alerts, groups: r.groups_done,
      groupRows: r.group_rows.map((row): RoundGroupRow => ({
        name: row.name, status: row.status, alert: row.alert,
        detail: row.detail, detailColor: row.detail_color,
      })),
    }));

  // ─── Derived values ───────────────────────────────────────────────────────
  const groups: Group[]     = apiEvent?.current_groups?.length ? mapGroups(apiEvent.current_groups) : [];
  const rounds: RoundData[] = apiEvent?.rounds_overview?.length ? mapRounds(apiEvent.rounds_overview) : [];

  const totalRaised     = apiEvent?.total_raised ?? 0;
  const targetAmount    = Number(apiEvent?.target_amount ?? 0);
  const progressPercent = targetAmount > 0 ? Math.min(100, Math.round((totalRaised / targetAmount) * 100)) : 0;

  // Must be declared before currentRoundNum which depends on it
  const openRound    = rounds.find(r => r.status === 'bidding');
  const hasOpenRound = !!openRound;
  const totalRoundsCount = apiEvent?.rounds_count ?? 0;
  const allRoundsDone = rounds.length === totalRoundsCount && rounds.every(r => r.status === 'complete');

  // When a round is open show current_round_number; when between rounds (closed) show
  // completed_rounds so the header reads "Round 2" (last done) not "Round 3" (next).
  const currentRoundNum = hasOpenRound
    ? (apiEvent?.current_round_number ?? apiEvent?.completed_rounds ?? 0)
    : (apiEvent?.completed_rounds ?? apiEvent?.current_round_number ?? 0);

  const scaleLabels = targetAmount > 0
    ? [0.33, 0.66, 1].map(f => { const v = Math.round(targetAmount * f); return v >= 1000 ? `£${Math.round(v / 1000)}k` : `£${v}`; })
    : ['£5k', '£10k', '£15k'];

  // Reset pgaLaunched once a new round is actually open
  useEffect(() => {
    if (hasOpenRound) setPgaLaunched(false);
  }, [hasOpenRound]);

  // ─── Detect when timerSecs hits 0 while a round is open ──────────────────
  // Switches polling to 2s aggressive mode until backend confirms round closed.
  useEffect(() => {
    if (timerSecs === 0 && hasOpenRound && apiEvent?.status === 'live') {
      setRoundEnding(true);
    }
  }, [timerSecs, hasOpenRound, apiEvent?.status]);

  // ─── Reset roundEnding once backend confirms no open round ───────────────
  useEffect(() => {
    if (!hasOpenRound && roundEnding) {
      setRoundEnding(false);
    }
  }, [hasOpenRound, roundEnding]);

  // Show "Proposed Group Allocations" button:
  // ONLY when the backend confirms the round is fully closed (!hasOpenRound).
  // Never shown at the same time as the Call Time button.
  const hasClosedRound   = rounds.some(r => r.status === 'complete');
  const inWaitingPeriod  = !hasOpenRound && waitingSecs > 0;
  const roundJustClosed  = (
    !hasOpenRound && hasClosedRound && !allRoundsDone
  ) && apiEvent?.status === 'live' && !pgaLaunched;

  // ─── Build PgaGroup[] from API current_groups ────────────────────────────
  const buildPgaGroups = (apiGroups: ApiGroup[]): PgaGroup[] =>
    apiGroups.map((g, gi) => ({
      id:       g.id ?? gi,
      label:    g.name,
      expanded: gi === 0,
      members:  g.donors.map((d, di) => ({
        id:            `${g.id ?? gi}_${di}`,
        groupMemberId: d.group_member_id ?? (() => { console.warn('group_member_id missing for', d.pseudonym, '— check EventController::show()'); return 0; })(),
        name:          d.pseudonym,
        initial:       d.initial,
        amount:        d.bid_amount ?? '—',
        emoji:         d.emoji ?? EMOJI_POOL[(gi * 10 + di) % EMOJI_POOL.length],
        selected:      false,
        isYou:         !!(d as any).is_you,
      })),
    }));

  const openPGA = async () => {
    setShowPGA(true);
    if (!eventId) return;
    const freshData = await getEvent(Number(eventId));
    setApiEvent(freshData);
    const lastRound = (freshData.rounds_overview ?? []).find((r: ApiRound) => r.status === 'closed');
    setPgaRoundId(lastRound?.id ?? null);

    // current_groups holds the last-closed-round's groups (populated by GroupingService).
    // If empty, fall back to last_round_groups (future backend field).
    // Log to help diagnose if neither is populated.
    const groupSource =
      freshData.current_groups?.length     ? freshData.current_groups :
      (freshData as any).last_round_groups?.length ? (freshData as any).last_round_groups :
      [];

    if (!groupSource.length) {
      console.warn('[PGA] No groups found. current_groups:', freshData.current_groups,
        '| last_round_groups:', (freshData as any).last_round_groups,
        '| Full response:', freshData);
    }

    setPgaGroups(groupSource.length ? buildPgaGroups(groupSource) : []);
  };

  // ─── PGA interactions ─────────────────────────────────────────────────────
  const pgaToggleExpand = (groupId: number) =>
    setPgaGroups(prev => prev.map(g => g.id === groupId ? { ...g, expanded: !g.expanded } : g));

  const pgaToggleMember = (groupId: number, memberId: string) =>
    setPgaGroups(prev => prev.map(g =>
      g.id !== groupId ? g : {
        ...g,
        members: g.members.map(m => m.id === memberId ? { ...m, selected: !m.selected } : m),
      }
    ));

  const pgaOpenMoveSheet = (groupId: number) => {
    const group = pgaGroups.find(g => g.id === groupId);
    if (!group) return;
    const selectedIds = group.members.filter(m => m.selected && m.groupMemberId > 0).map(m => m.groupMemberId);
    if (selectedIds.length === 0) {
      console.error("Move aborted: group_member_id is 0. Check EventController::show() returns group_member_id on each donor.");
      setPgaToast("Cannot move — member IDs not loaded. Deploy the updated EventController.php first.");
      setTimeout(() => setPgaToast(null), 3500);
      return;
    }
    setMoveSheet({ open: true, fromGroupId: groupId, selectedMemberIds: selectedIds });
  };

  const pgaCloseMoveSheet = () =>
    setMoveSheet({ open: false, fromGroupId: null, selectedMemberIds: [] });

  const pgaMoveMembers = async (toGroupId: number) => {
    const { fromGroupId, selectedMemberIds } = moveSheet;
    if (!fromGroupId || fromGroupId === toGroupId || !eventId || selectedMemberIds.length === 0) {
      pgaCloseMoveSheet(); return;
    }

    setPgaMoveLoading(true);
    const toGroup   = pgaGroups.find(g => g.id === toGroupId);
    const fromGroup = pgaGroups.find(g => g.id === fromGroupId);

    // Optimistic update
    setPgaGroups(prev => {
      const movedMembers = (fromGroup?.members ?? [])
        .filter(m => selectedMemberIds.includes(m.groupMemberId))
        .map(m => ({ ...m, selected: false }));
      return prev.map(g => {
        if (g.id === fromGroupId)
          return { ...g, members: g.members.filter(m => !selectedMemberIds.includes(m.groupMemberId)) };
        if (g.id === toGroupId)
          return { ...g, members: [...g.members, ...movedMembers] };
        return g;
      });
    });
    pgaCloseMoveSheet();

    try {
      await moveGroupMembers(Number(eventId), fromGroupId, toGroupId, selectedMemberIds);
      const count = selectedMemberIds.length;
      setPgaToast(`${count} member${count !== 1 ? 's' : ''} moved to ${toGroup?.label}`);
    } catch (err) {
      console.error(err);
      // Rollback optimistic update
      await refreshEvent();
      if (apiEvent?.current_groups) setPgaGroups(buildPgaGroups(apiEvent.current_groups));
      setPgaToast('Move failed — changes reverted.');
    } finally {
      setPgaMoveLoading(false);
      setTimeout(() => setPgaToast(null), 2500);
    }
  };

  const pgaRebalance = async () => {
    if (!eventId) return;
    try {
      await rebalanceGroups(Number(eventId));
      await refreshEvent();
      if (apiEvent?.current_groups) setPgaGroups(buildPgaGroups(apiEvent.current_groups));
      setPgaToast('Groups rebalanced');
      setTimeout(() => setPgaToast(null), 2500);
    } catch (err) { console.error(err); }
  };

  // ── Open action sheet when Move button clicked ──────────────────────────
  const pgaOpenActionSheet = (groupId: number) => {
    const group = pgaGroups.find(g => g.id === groupId);
    if (!group) return;
    const selectedIds = group.members.filter(m => m.selected && m.groupMemberId > 0).map(m => m.groupMemberId);
    if (selectedIds.length === 0) return;
    setPgaActionSheet({ open: true, fromGroupId: groupId, selectedMemberIds: selectedIds });
  };

  const pgaCloseActionSheet = () =>
    setPgaActionSheet({ open: false, fromGroupId: null, selectedMemberIds: [] });

  // ── Delete selected members ───────────────────────────────────────────────
  const pgaDeleteMembers = async () => {
    const { fromGroupId, selectedMemberIds } = pgaActionSheet;
    if (!fromGroupId || !eventId || selectedMemberIds.length === 0) { pgaCloseActionSheet(); return; }
    setPgaDeleteLoading(true);
    // Optimistic update
    setPgaGroups(prev => prev.map(g =>
      g.id !== fromGroupId ? g :
      { ...g, members: g.members.filter(m => !selectedMemberIds.includes(m.groupMemberId)) }
    ));
    pgaCloseActionSheet();
    try {
      await deleteGroupMembers(Number(eventId), fromGroupId, selectedMemberIds);
      const count = selectedMemberIds.length;
      setPgaToast(`${count} member${count !== 1 ? 's' : ''} removed`);
    } catch (err) {
      console.error(err);
      await refreshEvent();
      if (apiEvent?.current_groups) setPgaGroups(buildPgaGroups(apiEvent.current_groups));
      setPgaToast('Delete failed — changes reverted.');
    } finally {
      setPgaDeleteLoading(false);
      setTimeout(() => setPgaToast(null), 2500);
    }
  };

  // ── Create new group and move selected members into it ────────────────────
  const pgaCreateGroupAndMove = async () => {
    const { fromGroupId, selectedMemberIds } = pgaActionSheet;
    if (!fromGroupId || !eventId || selectedMemberIds.length === 0) { pgaCloseActionSheet(); return; }
    setPgaCreateLoading(true);
    pgaCloseActionSheet();
    try {
      // Create new group on backend
      const res = await createGroup(Number(eventId));
      const newGroup: PgaGroup = {
        id:       res.group.id,
        label:    res.group.name,
        expanded: true,
        members:  [],
      };
      // Optimistic: remove from old group, add to new group
      const fromGroup = pgaGroups.find(g => g.id === fromGroupId);
      const movedMembers = (fromGroup?.members ?? [])
        .filter(m => selectedMemberIds.includes(m.groupMemberId))
        .map(m => ({ ...m, selected: false }));
      setPgaGroups(prev => [
        ...prev.map(g =>
          g.id !== fromGroupId ? g :
          { ...g, members: g.members.filter(m => !selectedMemberIds.includes(m.groupMemberId)) }
        ),
        { ...newGroup, members: movedMembers },
      ]);
      // Move members to new group on backend
      await moveGroupMembers(Number(eventId), fromGroupId, res.group.id, selectedMemberIds);
      const count = selectedMemberIds.length;
      setPgaToast(`${count} member${count !== 1 ? 's' : ''} moved to ${res.group.name}`);
    } catch (err) {
      console.error(err);
      await refreshEvent();
      if (apiEvent?.current_groups) setPgaGroups(buildPgaGroups(apiEvent.current_groups));
      setPgaToast('Failed — changes reverted.');
    } finally {
      setPgaCreateLoading(false);
      setTimeout(() => setPgaToast(null), 2500);
    }
  };

  // ── Open move sheet from action sheet ────────────────────────────────────
  const pgaOpenMoveFromAction = () => {
    const { fromGroupId, selectedMemberIds } = pgaActionSheet;
    pgaCloseActionSheet();
    if (!fromGroupId || selectedMemberIds.length === 0) return;
    setMoveSheet({ open: true, fromGroupId, selectedMemberIds });
  };

  const pgaLaunchNextRound = async () => {
    if (!eventId || actionLoading) return;
    setActionLoading(true);
    try {
      await startRound(Number(eventId));
      await refreshEvent();
      setShowPGA(false);
      setPgaLaunched(true);
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  const pgaTotalPeople     = pgaGroups.reduce((s, g) => s + g.members.length, 0);
  const fromGroupForSheet  = pgaGroups.find(g => g.id === moveSheet.fromGroupId);

  // Close move-sheet on backdrop tap
  useEffect(() => {
    if (!moveSheet.open) return;
    const handle = (e: MouseEvent) => {
      if (moveSheetRef.current && !moveSheetRef.current.contains(e.target as Node)) pgaCloseMoveSheet();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [moveSheet.open]);

  // ─── Live summary ─────────────────────────────────────────────────────────
  const liveSummary = {
    eventName: apiEvent?.name ?? '—', raised: `£${totalRaised.toLocaleString()}`,
    org: apiEvent?.charity_name ?? '—', donors: apiEvent?.donors_count ?? 0, groups: groups.length,
    milestones: [
      { amount: `£${Math.round(targetAmount * 0.33).toLocaleString()}`, label: 'First Milestone!', reached: totalRaised >= targetAmount * 0.33 },
      { amount: `£${Math.round(targetAmount * 0.5).toLocaleString()}`,  label: 'Half Way!',        reached: totalRaised >= targetAmount * 0.5 },
      { amount: `£${Math.round(targetAmount * 1).toLocaleString()}`,    label: 'Stretch Goal!',    reached: totalRaised >= targetAmount },
    ],
    leaderboard: groups.map((g, i) => ({ rank: i + 1, name: g.name, members: g.donors.length, match: '1:3', total: g.min ?? '—' })),
  };

  /* ── Helpers ── */
  const getGroupCardClass = (status: string) => {
    if (status === 'done')    return 've-group-card teal-border';
    if (status === 'pending') return 've-group-card orange-border';
    return 've-group-card';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'done') return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="8.25" stroke="#2BA7A0" strokeWidth="1.5" />
        <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="#2BA7A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
    if (status === 'pending') return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="8.25" stroke="#F4A43A" strokeWidth="1.5" />
        <path d="M9 5.5V9l2 2" stroke="#F4A43A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="8.25" stroke="#C5C8CC" strokeWidth="1.5" />
        <path d="M9 5.5V9l2 2" stroke="#C5C8CC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const RowStatusIcon = ({ status }: { status: string }) => {
    if (status === 'done') return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="8" cy="8" r="7" stroke="#2BA7A0" strokeWidth="1.4" />
        <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="#2BA7A0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
    if (status === 'pending') return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="8" cy="8" r="7" stroke="#F4A43A" strokeWidth="1.4" />
        <path d="M8 4.5V8l2 2" stroke="#F4A43A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="8" cy="8" r="7" stroke="#C5C8CC" strokeWidth="1.4" />
        <path d="M8 4.5V8l2 2" stroke="#C5C8CC" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const renderDots = (filled: number, total: number, status: string) => {
    const dotClass = status === 'pending' ? 'filled-orange' : 'filled-teal';
    return Array.from({ length: total }).map((_, i) => (
      <div key={i} className={`ve-dot ${i < filled ? dotClass : ''}`} />
    ));
  };

  const getGroupBadge = (group: Group) => {
    if (group.bids === group.totalBids) return { label: 'Done',    cls: 'badge-done' };
    if (group.bids > 0)                 return { label: 'Bidding', cls: 'badge-bidding' };
    return                                     { label: 'Waiting', cls: 'badge-waiting' };
  };

  /* ── Bid-rank colour coding (green = highest, red = lowest, orange = middle) ── */
  const parseAmount = (val?: string | null): number => {
    if (!val) return 0;
    const n = Number(String(val).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const groupTotal = (g: Group): number =>
    g.donors.reduce((sum, d) => sum + parseAmount(d.bid), 0);

  // Rank groups by their total bid amount. Only groups with a total > 0 are ranked;
  // empty / still-bidding groups stay neutral.
  const rankedGroupTotals = groups.map(groupTotal).filter(t => t > 0);
  const maxGroupTotal = rankedGroupTotals.length ? Math.max(...rankedGroupTotals) : -1;
  const minGroupTotal = rankedGroupTotals.length ? Math.min(...rankedGroupTotals) : -1;

  const getGroupRankStyle = (g: Group): React.CSSProperties => {
    const total = groupTotal(g);
    if (total <= 0 || maxGroupTotal === minGroupTotal) return {};
    if (total === maxGroupTotal) return { background: '#F1FAF3', borderColor: '#4CAF50' };
    if (total === minGroupTotal) return { background: '#FEF5F5', borderColor: '#EF5350' };
    return { background: '#FFFBF5', borderColor: '#FFA726' };
  };

  // Rank donors inside a group by their bid. Only bids > 0 are ranked.
  const getDonorRankStyle = (donor: Donor, donors: Donor[]): React.CSSProperties => {
    const amounts = donors.map(d => parseAmount(d.bid)).filter(a => a > 0);
    if (amounts.length === 0) return {};
    const max = Math.max(...amounts);
    const min = Math.min(...amounts);
    const amt = parseAmount(donor.bid);
    if (amt <= 0 || max === min) return {};
    if (amt === max) return { background: '#EAF6F5', borderRadius: 12, border: '2px solid #2BA7A0' };
    if (amt === min) return { background: '#FEF2F2', borderRadius: 12, border: '2px solid #F54A4D'  };
    return { background: '#FFF8F0', borderRadius: 12, border: '2px solid #FCB040' };
  };

  // ── Same rank colouring for the Proposed Group Allocations sheet ──
  // Exact colour codes sampled from the Figma:
  //   group card tints  → green #E9F7F7, amber #FFF8F0, red #FEF2F2
  //   member cell fills → green #27A99F, amber #FCB13E, red #F6494D (white text)
  const pgaGroupTotal = (g: PgaGroup): number =>
    g.members.reduce((sum, m) => sum + parseAmount(m.amount), 0);

  const getPgaGroupRankStyle = (g: PgaGroup, all: PgaGroup[]): React.CSSProperties => {
    const totals = all.map(pgaGroupTotal).filter(t => t > 0);
    if (totals.length === 0) return {};
    const max = Math.max(...totals);
    const min = Math.min(...totals);
    const total = pgaGroupTotal(g);
    if (total <= 0 || max === min) return {};
    if (total === max) return { background: '#E9F7F7' };
    if (total === min) return { background: '#FEF2F2' };
    return { background: '#FFF8F0' };
  };

  const getPgaMemberRankColor = (m: PgaMember, members: PgaMember[]): string | null => {
    const amounts = members.map(x => parseAmount(x.amount)).filter(a => a > 0);
    if (amounts.length === 0) return null;
    const max = Math.max(...amounts);
    const min = Math.min(...amounts);
    const amt = parseAmount(m.amount);
    if (amt <= 0 || max === min) return null;
    if (amt === max) return '#27A99F'; // highest → green
    if (amt === min) return '#F6494D'; // lowest  → red
    return '#FCB13E';                  // middle  → amber
  };

  // All Donors sheet reads the full roster (incl. donors still bidding) from
  // all_donors_grouped; falls back to current grouped donors if absent.
  const rosterGroups   = (apiEvent as unknown as { all_donors_grouped?: ApiGroup[] } | null)?.all_donors_grouped;
  const allDonorGroups = (rosterGroups?.length ? mapGroups(rosterGroups) : groups)
    .map(g => ({ name: g.name, donors: g.donors }));
  const activeRound    = rounds[activeRoundTab] ?? null;

  const closeAll = () => {
    setShowQR(false); setShowAllDonors(false);
    setShowLiveSummary(false); setShowRoundOverview(false);
    setSelectedGroup(null);
  };

  const formatElapsed = (seconds: number): string => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };
	
	const [copiedField, setCopiedField] = useState<string | null>(null);

const handleCopy = async (text: string, field: string) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 1500);
  } catch {
    /* no-op */
  }
};

  return (
    <IonPage>
      <IonContent fullscreen className="view-event-page">
        <div className="ve-container padding-bttom-0">

          {/* ── Header ── */}
          <HostHeader
            variant="back"
            onBack={() => router.goBack()}
            rightSlot={
              <>
                <div className="ve-icon-btn" onClick={() => { closeAll(); setShowQR(true); }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M6.09091 1H2.27273C1.93518 1 1.61146 1.13409 1.37277 1.37277C1.13409 1.61146 1 1.93518 1 2.27273V6.09091C1 6.42846 1.13409 6.75218 1.37277 6.99086C1.61146 7.22955 1.93518 7.36364 2.27273 7.36364H6.09091C6.42846 7.36364 6.75218 7.22955 6.99086 6.99086C7.22955 6.75218 7.36364 6.42846 7.36364 6.09091V2.27273C7.36364 1.93518 7.22955 1.61146 6.99086 1.37277C6.75218 1.13409 6.42846 1 6.09091 1ZM6.09091 6.09091H2.27273V2.27273H6.09091V6.09091ZM6.09091 8.63636H2.27273C1.93518 8.63636 1.61146 8.77045 1.37277 9.00914C1.13409 9.24782 1 9.57154 1 9.90909V13.7273C1 14.0648 1.13409 14.3885 1.37277 14.6272C1.61146 14.8659 1.93518 15 2.27273 15H6.09091C6.42846 15 6.75218 14.8659 6.99086 14.6272C7.22955 14.3885 7.36364 14.0648 7.36364 13.7273V9.90909C7.36364 9.57154 7.22955 9.24782 6.99086 9.00914C6.75218 8.77045 6.42846 8.63636 6.09091 8.63636ZM6.09091 13.7273H2.27273V9.90909H6.09091V13.7273ZM13.7273 1H9.90909C9.57154 1 9.24782 1.13409 9.00914 1.37277C8.77045 1.61146 8.63636 1.93518 8.63636 2.27273V6.09091C8.63636 6.42846 8.77045 6.75218 9.00914 6.99086C9.24782 7.22955 9.57154 7.36364 9.90909 7.36364H13.7273C14.0648 7.36364 14.3885 7.22955 14.6272 6.99086C14.8659 6.75218 15 6.42846 15 6.09091V2.27273C15 1.93518 14.8659 1.61146 14.6272 1.37277C14.3885 1.13409 14.0648 1 13.7273 1ZM13.7273 6.09091H9.90909V2.27273H13.7273V6.09091ZM8.63636 11.8182V9.27273C8.63636 9.10395 8.70341 8.94209 8.82275 8.82275C8.94209 8.70341 9.10395 8.63636 9.27273 8.63636C9.4415 8.63636 9.60336 8.70341 9.7227 8.82275C9.84205 8.94209 9.90909 9.10395 9.90909 9.27273V11.8182C9.90909 11.987 9.84205 12.1488 9.7227 12.2682C9.60336 12.3875 9.4415 12.4545 9.27273 12.4545C9.10395 12.4545 8.94209 12.3875 8.82275 12.2682C8.70341 12.1488 8.63636 11.987 8.63636 11.8182ZM15 10.5455C15 10.7142 14.933 10.8761 14.8136 10.9954C14.6943 11.1148 14.5324 11.1818 14.3636 11.1818H12.4545V14.3636C12.4545 14.5324 12.3875 14.6943 12.2682 14.8136C12.1488 14.933 11.987 15 11.8182 15H9.27273C9.10395 15 8.94209 14.933 8.82275 14.8136C8.70341 14.6943 8.63636 14.5324 8.63636 14.3636C8.63636 14.1949 8.70341 14.033 8.82275 13.9137C8.94209 13.7943 9.10395 13.7273 9.27273 13.7273H11.1818V9.27273C11.1818 9.10395 11.2489 8.94209 11.3682 8.82275C11.4875 8.70341 11.6494 8.63636 11.8182 8.63636C11.987 8.63636 12.1488 8.70341 12.2682 8.82275C12.3875 8.94209 12.4545 9.10395 12.4545 9.27273V9.90909H14.3636C14.5324 9.90909 14.6943 9.97614 14.8136 10.0955C14.933 10.2148 15 10.3767 15 10.5455ZM15 13.0909V14.3636C15 14.5324 14.933 14.6943 14.8136 14.8136C14.6943 14.933 14.5324 15 14.3636 15C14.1949 15 14.033 14.933 13.9137 14.8136C13.7943 14.6943 13.7273 14.5324 13.7273 14.3636V13.0909C13.7273 12.9221 13.7943 12.7603 13.9137 12.6409C14.033 12.5216 14.1949 12.4545 14.3636 12.4545C14.5324 12.4545 14.6943 12.5216 14.8136 12.6409C14.933 12.7603 15 12.9221 15 13.0909Z" fill="black"/>
</svg>
                </div>
                <div
                  className={`ve-icon-btn ${showSettings ? 've-icon-btn--active' : ''}`}
                  onClick={() => { const s = showSettings; closeAll(); setShowSettings(!s); }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8.14667 1.3335H7.85333C7.49971 1.3335 7.16057 1.47397 6.91053 1.72402C6.66048 1.97407 6.52 2.31321 6.52 2.66683V2.78683C6.51976 3.02065 6.45804 3.25029 6.34103 3.45272C6.22401 3.65515 6.05583 3.82325 5.85333 3.94016L5.56667 4.10683C5.36398 4.22385 5.13405 4.28546 4.9 4.28546C4.66595 4.28546 4.43603 4.22385 4.23333 4.10683L4.13333 4.0535C3.82738 3.877 3.46389 3.82913 3.12267 3.92037C2.78145 4.01161 2.49037 4.23452 2.31333 4.54016L2.16667 4.7935C1.99018 5.09945 1.9423 5.46294 2.03354 5.80416C2.12478 6.14539 2.34769 6.43646 2.65333 6.6135L2.75333 6.68016C2.95485 6.7965 3.12241 6.96356 3.23937 7.16472C3.35632 7.36588 3.4186 7.59414 3.42 7.82683V8.16683C3.42093 8.40178 3.35977 8.6328 3.2427 8.8365C3.12563 9.04021 2.95681 9.20936 2.75333 9.32683L2.65333 9.38683C2.34769 9.56386 2.12478 9.85494 2.03354 10.1962C1.9423 10.5374 1.99018 10.9009 2.16667 11.2068L2.31333 11.4602C2.49037 11.7658 2.78145 11.9887 3.12267 12.08C3.46389 12.1712 3.82738 12.1233 4.13333 11.9468L4.23333 11.8935C4.43603 11.7765 4.66595 11.7149 4.9 11.7149C5.13405 11.7149 5.36398 11.7765 5.56667 11.8935L5.85333 12.0602C6.05583 12.1771 6.22401 12.3452 6.34103 12.5476C6.45804 12.75 6.51976 12.9797 6.52 13.2135V13.3335C6.52 13.6871 6.66048 14.0263 6.91053 14.2763C7.16057 14.5264 7.49971 14.6668 7.85333 14.6668H8.14667C8.50029 14.6668 8.83943 14.5264 9.08948 14.2763C9.33953 14.0263 9.48 13.6871 9.48 13.3335V13.2135C9.48024 12.9797 9.54196 12.75 9.65898 12.5476C9.77599 12.3452 9.94418 12.1771 10.1467 12.0602L10.4333 11.8935C10.636 11.7765 10.866 11.7149 11.1 11.7149C11.3341 11.7149 11.564 11.7765 11.7667 11.8935L11.8667 11.9468C12.1726 12.1233 12.5361 12.1712 12.8773 12.08C13.2186 11.9887 13.5096 11.7658 13.6867 11.4602L13.8333 11.2002C14.0098 10.8942 14.0577 10.5307 13.9665 10.1895C13.8752 9.84827 13.6523 9.5572 13.3467 9.38016L13.2467 9.32683C13.0432 9.20936 12.8744 9.04021 12.7573 8.8365C12.6402 8.6328 12.5791 8.40178 12.58 8.16683V7.8335C12.5791 7.59855 12.6402 7.36753 12.7573 7.16382C12.8744 6.96012 13.0432 6.79097 13.2467 6.6735L13.3467 6.6135C13.6523 6.43646 13.8752 6.14539 13.9665 5.80416C14.0577 5.46294 14.0098 5.09945 13.8333 4.7935L13.6867 4.54016C13.5096 4.23452 13.2186 4.01161 12.8773 3.92037C12.5361 3.82913 12.1726 3.877 11.8667 4.0535L11.7667 4.10683C11.564 4.22385 11.3341 4.28546 11.1 4.28546C10.866 4.28546 10.636 4.22385 10.4333 4.10683L10.1467 3.94016C9.94418 3.82325 9.77599 3.65515 9.65898 3.45272C9.54196 3.25029 9.48024 3.02065 9.48 2.78683V2.66683C9.48 2.31321 9.33953 1.97407 9.08948 1.72402C8.83943 1.47397 8.50029 1.3335 8.14667 1.3335Z" stroke={showSettings ? '#fff' : '#1A1A2E'} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke={showSettings ? '#fff' : '#1A1A2E'} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
</svg>
                </div>
              </>
            }
          />

          {/* ── Event Info ── */}
          <div className="ve-live-badge">
            <span className="ve-live-dot" style={{
              background: apiEvent?.status === 'live'     ? '#2BA7A0'
                        : apiEvent?.status === 'finished' ? '#9AA0A6' : '#F4A43A'
            }} />
            {apiEvent?.status === 'live' ? 'Live Event' : apiEvent?.status === 'finished' ? 'Finished' : 'Draft'}
          </div>
          <h1 className="ve-event-title">{apiEvent?.name ?? '—'}</h1>
          <p className="ve-event-org">{apiEvent?.charity_name ?? '—'}</p>

          {/* Settings Panel */}
          <div className="ve-controls-panel" style={{ display: showSettings ? 'block' : 'none' }}>
            <h4 className="ve-controls-title">Event Controls</h4>
            <div className="ve-control-row">
              <div className="ve-control-label-group">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="8" cy="8" r="6.5" stroke="#9AA0A6" strokeWidth="1.3" />
                  <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" stroke="#9AA0A6" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <span className="ve-control-label">Ignore Zero Bids</span>
              </div>
              <div className={`ve-toggle ${ignoreZeroBids ? 've-toggle--on' : ''}`} onClick={async () => {
                const next = !ignoreZeroBids;
                setIgnoreZeroBids(next);
                try { await updateEvent(Number(eventId), { ignore_zero_bids: next }); }
                catch (e) { console.error('Failed to save ignore_zero_bids', e); setIgnoreZeroBids(!next); }
              }}>
                <div className="ve-toggle-knob" />
              </div>
            </div>
            <div className="ve-control-divider" />
            <div className="ve-control-row">
              <span className="ve-control-label">Group Size</span>
              <span className="ve-control-chip">{apiEvent?.group_size ?? '—'} donors</span>
            </div>
            <div className="ve-control-divider" />
            <div className="ve-control-row">
              <span className="ve-control-label">Total Rounds</span>
              <span className="ve-control-chip">{apiEvent?.rounds_count ?? '—'}</span>
            </div>
            <div className="ve-control-divider" />
            <div className="ve-control-row">
              <span className="ve-control-label">Seeding Method</span>
              <span className="ve-control-chip">donation</span>
            </div>
          </div>
        </div>

        <div className="ve-container bg-white">
          {/* Stats Row */}
          <div className="ve-event-info">
            <div className="ve-stats-row">
              <div className="ve-stat-card" style={{ cursor: 'pointer' }} onClick={() => { closeAll(); setShowLiveSummary(true); }}>
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14.6663 4.6665L8.99967 10.3332L5.66634 6.99984L1.33301 11.3332" stroke="#2BA7A0" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M10.667 4.6665H14.667V8.6665" stroke="#2BA7A0" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="ve-stat-value">£{totalRaised.toLocaleString()}</p>
                <p className="ve-stat-label">Raised</p>
              </div>
              <div className="ve-stat-card" style={{ cursor: 'pointer' }} onClick={() => { closeAll(); setShowAllDonors(true); }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M13.5 17v-1.5A3 3 0 0010.5 12h-6a3 3 0 00-3 3.5V17" stroke="#2BA7A0" strokeWidth="1.6" strokeLinecap="round" />
                  <circle cx="7.5" cy="6.5" r="2.5" stroke="#2BA7A0" strokeWidth="1.6" />
                  <path d="M17 17v-1.5a3 3 0 00-2-2.83M13.5 4.17a3 3 0 010 5.66" stroke="#2BA7A0" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <p className="ve-stat-value">{apiEvent?.donors_count ?? 0}</p>
                <p className="ve-stat-label">Donors</p>
              </div>
              <div className="ve-stat-card" style={{ cursor: 'pointer' }} onClick={() => { closeAll(); setShowRoundOverview(true); }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" stroke="#2BA7A0" strokeWidth="1.6" />
                  <circle cx="10" cy="10" r="4" stroke="#2BA7A0" strokeWidth="1.6" />
                  <circle cx="10" cy="10" r="1" fill="#2BA7A0" />
                </svg>
                <p className="ve-stat-value">{currentRoundNum}/{totalRoundsCount}</p>
                <p className="ve-stat-label">Round</p>
              </div>
            </div>

            <div className="ve-progress-card">
              <div className="ve-progress-header">
                <span className="ve-progress-label">Progress to Target</span>
                <span className="ve-progress-amount">£{totalRaised.toLocaleString()} / £{targetAmount.toLocaleString()}</span>
              </div>
              <div className="ve-progress-track">
                <div className="ve-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="ve-progress-scale">
                {scaleLabels.map((l, i) => <span key={i}>{l}</span>)}
              </div>
            </div>
          </div>

          {apiEvent?.active_alert && (
            <div className="ve-alert-banner">
              <div className="ve-alert-left">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M18.108 14.9999L11.4414 3.33319C11.296 3.0767 11.0852 2.86335 10.8305 2.71492C10.5757 2.56649 10.2862 2.48828 9.99136 2.48828C9.69654 2.48828 9.40699 2.56649 9.15226 2.71492C8.89753 2.86335 8.68673 3.0767 8.54136 3.33319L1.8747 14.9999C1.72777 15.2543 1.65072 15.5431 1.65137 15.837C1.65202 16.1308 1.73035 16.4192 1.8784 16.673C2.02646 16.9269 2.23899 17.137 2.49444 17.2822C2.7499 17.4274 3.0392 17.5025 3.33303 17.4999H16.6664C16.9588 17.4996 17.246 17.4223 17.4991 17.2759C17.7522 17.1295 17.9624 16.9191 18.1085 16.6658C18.2545 16.4125 18.3314 16.1252 18.3313 15.8328C18.3312 15.5404 18.2542 15.2531 18.108 14.9999Z" stroke="#FCB040" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M10 7.5V10.8333" stroke="#FCB040" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
<path d="M10 14.1665H10.0083" stroke="#FCB040" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
                <span className="ve-alert-text">{apiEvent.active_alert}</span>
              </div>
              <span className="ve-alert-chevron">›</span>
            </div>
          )}

          {(currentRoundNum > 0 || groups.length > 0) && (
            <div className="ve-round-section">
              <div className="ve-round-header">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 2H2.66667C2.29848 2 2 2.29848 2 2.66667V6C2 6.36819 2.29848 6.66667 2.66667 6.66667H6C6.36819 6.66667 6.66667 6.36819 6.66667 6V2.66667C6.66667 2.29848 6.36819 2 6 2Z" stroke="#6B7280" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13.333 2H9.99967C9.63148 2 9.33301 2.29848 9.33301 2.66667V6C9.33301 6.36819 9.63148 6.66667 9.99967 6.66667H13.333C13.7012 6.66667 13.9997 6.36819 13.9997 6V2.66667C13.9997 2.29848 13.7012 2 13.333 2Z" stroke="#6B7280" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13.333 9.33301H9.99967C9.63148 9.33301 9.33301 9.63148 9.33301 9.99967V13.333C9.33301 13.7012 9.63148 13.9997 9.99967 13.9997H13.333C13.7012 13.9997 13.9997 13.7012 13.9997 13.333V9.99967C13.9997 9.63148 13.7012 9.33301 13.333 9.33301Z" stroke="#6B7280" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 9.3335H2.66667C2.29848 9.3335 2 9.63197 2 10.0002V13.3335C2 13.7017 2.29848 14.0002 2.66667 14.0002H6C6.36819 14.0002 6.66667 13.7017 6.66667 13.3335V10.0002C6.66667 9.63197 6.36819 9.3335 6 9.3335Z" stroke="#6B7280" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="ve-round-title">Round {currentRoundNum}</span>
                {hasOpenRound && timerSecs > 0 && (
                  <div className="ve-round-timer" style={{ background: '#FFF3E6', color: '#FCB040' }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M6.66699 1.3335H9.33366" stroke="#FCB040" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 9.3335L10 7.3335" stroke="#FCB040" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8.00033 14.6667C10.9458 14.6667 13.3337 12.2789 13.3337 9.33333C13.3337 6.38781 10.9458 4 8.00033 4C5.05481 4 2.66699 6.38781 2.66699 9.33333C2.66699 12.2789 5.05481 14.6667 8.00033 14.6667Z" stroke="#FCB040" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {formatTimer(timerSecs)}
                  </div>
                )}
                {inWaitingPeriod && (
                  <div className="ve-round-timer" style={{ background: '#E6F4F2', color: '#2BA7A0' }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M6.66699 1.3335H9.33366" stroke="#2BA7A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 9.3335L10 7.3335" stroke="#2BA7A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8.00033 14.6667C10.9458 14.6667 13.3337 12.2789 13.3337 9.33333C13.3337 6.38781 10.9458 4 8.00033 4C5.05481 4 2.66699 6.38781 2.66699 9.33333C2.66699 12.2789 5.05481 14.6667 8.00033 14.6667Z" stroke="#2BA7A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {formatTimer(waitingSecs)}
                  </div>
                )}
                {/*<span className="ve-round-complete">{hasOpenRound ? (apiEvent?.round_progress ?? '0/0 Complete') : `${apiEvent?.completed_rounds ?? 0}/${totalRoundsCount} Complete`}</span>*/}
              </div>

              {groups.length > 0 ? (
                <div className="ve-group-grid">
                  {groups.map((group, i) => (
                    <div key={i} className={getGroupCardClass(group.status)} style={getGroupRankStyle(group)} onClick={() => setSelectedGroup(group)}>
                      <div className="ve-group-header">
                        <span className="ve-group-name">{group.name}</span>
                        {getStatusIcon(group.status)}
                      </div>
                      <div className="ve-bid-dots">{renderDots(group.bids, group.totalBids, group.status)}</div>
                      <div className="ve-group-bids">{group.bids}/{group.totalBids} bids</div>
                      {group.min && <div className="ve-group-min">Min: {group.min}</div>}
                      {group.alert && (
                        <div className="ve-group-alert">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M10.865 9L6.865 2C6.778 1.846 6.652 1.718 6.499 1.629C6.346 1.54 6.172 1.493 5.995 1.493C5.818 1.493 5.645 1.54 5.492 1.629C5.339 1.718 5.212 1.846 5.125 2L1.125 9C1.037 9.153 0.991 9.326 0.991 9.502C0.991 9.679 1.039 9.852 1.127 10.004C1.216 10.156 1.344 10.282 1.497 10.37C1.65 10.457 1.824 10.502 2 10.5H10C10.176 10.5 10.348 10.454 10.5 10.366C10.652 10.278 10.778 10.152 10.866 9.999C10.953 9.848 10.999 9.675 10.999 9.5C10.999 9.324 10.953 9.152 10.865 9Z" stroke="#C5821F" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6 4.5V6.5" stroke="#C5821F" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6 8.5H6.005" stroke="#C5821F" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Alert
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ve-no-groups">No groups yet — waiting for donors to bid</div>
              )}
            </div>
          )}

          {currentRoundNum === 0 && groups.length === 0 && (
            <div className="ve-no-groups">
              {apiEvent?.status === 'draft' ? 'Launch the event to start accepting donors' : 'Start a round to see groups'}
            </div>
          )}
        </div>

        {/* ══ BOTTOM ACTIONS ══ */}
        <div className="ve-bottom-area">

          {apiEvent?.status === 'draft' && (
            <div className="ve-launch-btn" style={{ background: '#FCB040', boxShadow: '0 6px 15px rgba(252,176,64,0.35)', opacity: actionLoading ? 0.6 : 1 }} onClick={handleStartEvent}>
              {actionLoading ? 'Launching…' : '🚀 Launch Event'}
            </div>
          )}

          {/* ── NEW: After round closes — show Proposed Group Allocations button ── */}
          {roundJustClosed && (
            <div className="ve-launch-btn ve-launch-btn--arrow" style={{ opacity: actionLoading ? 0.6 : 1 }} onClick={openPGA}>
              Proposed Group Allocations →{waitingSecs > 0 ? ` (${formatTimer(waitingSecs)})` : ''}
            </div>
          )}

          {apiEvent?.status === 'live' && !hasOpenRound && !allRoundsDone && !roundJustClosed && (
            <div className="ve-launch-btn ve-launch-btn--arrow" style={{ background: '#FCB040', boxShadow: '0 6px 15px rgba(252,176,64,0.35)', opacity: actionLoading ? 0.6 : 1 }} onClick={handleStartRound}>
              {actionLoading ? 'Starting…' : `Launch Round ${(apiEvent?.completed_rounds ?? 0) + 1} →`}
            </div>
          )}

          {apiEvent?.status === 'live' && hasOpenRound && (
            <div className="ve-call-time-btn" style={{ opacity: actionLoading ? 0.6 : 1 }} onClick={() => { if (!actionLoading) setShowCallTimeConfirm(true); }}>
              <span className="ve-call-time-icon">■</span>
              {actionLoading ? 'Ending…' : timerSecs > 0 ? `Call Time (${formatTimer(timerSecs)})` : 'Call Time (End Round)'}
            </div>
          )}

          {apiEvent?.status === 'live' && (
            <div className="ve-end-btn" style={{ opacity: actionLoading ? 0.6 : 1 }} onClick={() => { if (!actionLoading) setShowEndEventConfirm(true); }}>
              {actionLoading ? 'Ending…' : 'End Event'}
            </div>
          )}

          {apiEvent?.status === 'finished' && (
            <div className="ve-launch-btn" style={{ background: '#9AA0A6', boxShadow: 'none', cursor: 'default' }}>Event Finished</div>
          )}
        </div>

        {/* ══ Call Time Confirmation ══ */}
        {showCallTimeConfirm && (
          <>
            <div className="ve-backdrop" onClick={() => { if (!actionLoading) setShowCallTimeConfirm(false); }} />
            <div className="ve-sheet">
              <div className="ve-sheet-handle" />
              <div className="ve-sheet-header">
                <h3 className="ve-sheet-title">Call time on this round?</h3>
              </div>
              <p style={{ margin: '4px 24px 18px', color: '#6B7280', fontSize: 14, lineHeight: 1.5, textAlign: 'center' }}>
                This closes bidding for the current round immediately and cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 12, padding: '0 20px 8px' }}>
                <div className="ve-sheet-close" style={{ flex: 1, marginTop: 0 }} onClick={() => { if (!actionLoading) setShowCallTimeConfirm(false); }}>Cancel</div>
                <div
                  className="ve-call-time-btn"
                  style={{ flex: 1, opacity: actionLoading ? 0.6 : 1 }}
                  onClick={async () => { if (actionLoading) return; await handleEndRound(); setShowCallTimeConfirm(false); }}
                >
                  {actionLoading ? 'Ending…' : 'Yes'}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══ End Event Confirmation ══ */}
        {showEndEventConfirm && (
          <>
            <div className="ve-backdrop" onClick={() => { if (!actionLoading) setShowEndEventConfirm(false); }} />
            <div className="ve-sheet">
              <div className="ve-sheet-handle" />
              <div className="ve-sheet-header">
                <h3 className="ve-sheet-title">End this event?</h3>
              </div>
              <p style={{ margin: '4px 24px 18px', color: '#6B7280', fontSize: 14, lineHeight: 1.5, textAlign: 'center' }}>
                This ends the event for all donors immediately and cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 12, padding: '0 20px 8px' }}>
                <div className="ve-sheet-close" style={{ flex: 1, marginTop: 0 }} onClick={() => { if (!actionLoading) setShowEndEventConfirm(false); }}>Cancel</div>
                <div
                  className="ve-call-time-btn"
                  style={{ flex: 1, opacity: actionLoading ? 0.6 : 1 }}
                  onClick={async () => { if (actionLoading) return; await handleEndEvent(); setShowEndEventConfirm(false); }}
                >
                  {actionLoading ? 'Ending…' : 'Yes'}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══ QR / Setup Sheet ══ */}
        {showQR && (
          <>
            <div className="ve-backdrop" onClick={() => setShowQR(false)} />
            <div className="ve-sheet ve-sheet--full">
              <div className="ve-sheet-topbar">
                <div className="ve-back-btn" onClick={() => setShowQR(false)}><img src={`${imgBase}/Back.svg`} alt="back" /></div>
                <span className="ve-sheet-topbar-title">Setup &amp; QR</span>
                <div style={{ width: 36 }} />
              </div>
              <div className="ve-qr-section-title">Join Information</div>
              <div className="ve-qr-box">
                {apiEvent?.join_code ? (
                  <>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(`${import.meta.env.VITE_APP_URL ?? 'https://phpmasterminds.com'}join?code=${apiEvent.join_code}`)}`}
                      alt="QR Code"
                      style={{ width: 180, height: 180, objectFit: 'contain' }}
                    />
                    <div
                      style={{ marginTop: 10, fontSize: 12, color: '#9AA0A6', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => {
                        const link = `${import.meta.env.VITE_APP_URL ?? 'https://phpmasterminds.com'}join?code=${apiEvent.join_code}`;
                        navigator.clipboard?.writeText(link);
                      }}
                    >
                    </div>
                  </>
                ) : (
                  <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9AA0A6', fontSize: 13, border: '1px dashed #C4C4C4', borderRadius: 8 }}>No QR yet</div>
                )}
              </div>
              <div className="ve-qr-section-title" style={{ marginTop: 20 }}>Public Join Link</div>
			<div className="ve-join-link-box" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
			  <span
				className="ve-join-link-text"
				style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
			  >
				{`${import.meta.env.VITE_APP_URL ?? 'https://phpmasterminds.com'}join?code=${apiEvent?.join_code ?? ''}`}
			  </span>
			  <button
				  type="button"
				  aria-label="Copy join link"
				  onClick={() =>
					handleCopy(
					  `${import.meta.env.VITE_APP_URL ?? 'https://phpmasterminds.com'}join?code=${apiEvent?.join_code ?? ''}`,
					  'link'
					)
				  }
				  style={{
					flexShrink: 0,
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					border: 'none',
					background: '#2BA7A0',
					color: '#fff',
					borderRadius: 12,
					width: 40,
					height: 40,
					cursor: 'pointer',
				  }}
				>
				  <IonIcon
					icon={copiedField === 'link' ? checkmarkOutline : copyOutline}
					style={{ fontSize: 18 }}
				  />
				</button>
			</div>
			  <div className="ve-qr-section-title" style={{ marginTop: 20 }}>Event Code</div>
			  <div className="ve-join-link-box" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>

			  <span
				className="ve-join-link-text"
				style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
			  >
				{apiEvent?.join_code ?? ''}
			  </span>
			  
				<button
				  type="button"
				  aria-label="Copy event code"
				  onClick={() => handleCopy(apiEvent?.join_code ?? '', 'code')}
				  style={{
					flexShrink: 0,
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					border: 'none',
					background: '#2BA7A0',
					color: '#fff',
					borderRadius: 12,
					width: 40,
					height: 40,
					cursor: 'pointer',
				  }}
				>
				  <IonIcon
					icon={copiedField === 'code' ? checkmarkOutline : copyOutline}
					style={{ fontSize: 18 }}
				  />
				</button>
			  </div>
			  
              <div className="ve-qr-divider" />
              <div className="ve-qr-section-title">Event Configuration</div>
              {saveError && <div style={{ color: '#E53E3E', fontSize: 13, padding: '0 16px 8px' }}>{saveError}</div>}
              <div className="ve-config-field">
                <label className="ve-config-label">Event Name</label>
                <input className="ve-config-input" value={editName} onChange={(e) => setEditName(e.target.value)} disabled={saveLoading} />
              </div>
              <div className="ve-config-field">
                <label className="ve-config-label">Charity Name</label>
                <input className="ve-config-input" value={editCharityName} onChange={(e) => setEditCharityName(e.target.value)} disabled={saveLoading} />
              </div>
              <div className="ve-config-field">
                <label className="ve-config-label">Target Amount (£)</label>
                <input className="ve-config-input" type="number" value={editTargetAmount} onChange={(e) => setEditTargetAmount(e.target.value)} disabled={saveLoading} />
              </div>
              <div style={{ height: 100 }} />
              <div className="ve-bottom-area" style={{ background: 'linear-gradient(to top,#fff 80%,transparent)' }}>
                <div className="ve-launch-btn" style={{ background: '#2BA7A0', boxShadow: '0 6px 15px rgba(43,167,160,0.35)', opacity: saveLoading ? 0.6 : 1, cursor: saveLoading ? 'not-allowed' : 'pointer' }} onClick={handleSave}>
                  {saveLoading ? 'Saving…' : 'Save'}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══ All Donors Sheet ══ */}
        {showAllDonors && (
          <>
            <div className="ve-backdrop" onClick={() => setShowAllDonors(false)} />
            <div className="ve-sheet ve-sheet--full">
              <div className="ve-sheet-topbar">
                <div className="ve-back-btn" onClick={() => setShowAllDonors(false)}><img src={`${imgBase}/Back.svg`} alt="back" /></div>
                <span className="ve-sheet-topbar-title">All Donors</span>
                <span className="ve-active-badge">{apiEvent?.donors_count ?? 0} Active</span>
              </div>
              <div className="ve-all-donors-list">
                {allDonorGroups.length > 0 ? allDonorGroups.map((g, gi) => (
                  <div key={gi}>
                    <div className="ve-donor-group-label">{g.name}</div>
                    {g.donors.map((donor, di) => (
                      <div key={di} className="ve-all-donor-row">
                        <div className="ve-donor-avatar" style={{ background: donor.color }}>{donor.initial}</div>
                        <div className="ve-donor-info">
                          <span className="ve-donor-name">{donor.name}</span>
                          <span className="ve-donor-sub">{donor.sub}</span>
                        </div>
                        <div className="ve-all-donor-amounts">
                          {donor.totalCommitted && (
                            <div className="ve-all-donor-col">
                              <span className="ve-all-donor-col-label">Total committed</span>
                              <span className="ve-all-donor-col-val">{donor.totalCommitted}</span>
                            </div>
                          )}
                          <div className="ve-all-donor-col">
                            <span className="ve-all-donor-col-label">Current round bid</span>
                            {donor.status === 'bidding' ? <span className="ve-donor-bidding-orange">Bidding...</span>
                              : donor.status === 'left' ? <span className="ve-left-event-chip">Left Event</span>
                              : donor.bid ? <span className="ve-all-donor-col-val">{donor.bid}</span>
                              : <span className="ve-donor-bidding">—</span>}
                          </div>
                        </div>
                        <span className="ve-donor-remove">⊗</span>
                      </div>
                    ))}
                  </div>
                )) : <div style={{ textAlign: 'center', padding: 40, color: '#9AA0A6' }}>No donors yet</div>}
              </div>
            </div>
          </>
        )}

        {/* ══ Live Summary Sheet ══ */}
        {showLiveSummary && (
          <>
            <div className="ve-backdrop" onClick={() => setShowLiveSummary(false)} />
            <div className="ve-sheet ve-sheet--full ve-sheet--white">
              <div className="ve-sheet-topbar ve-sheet-topbar--white">
                <div className="ve-back-btn" onClick={() => setShowLiveSummary(false)}><img src={`${imgBase}/Back.svg`} alt="back" /></div>
                <span className="ve-sheet-topbar-title">Live Summary</span>
                <div style={{ width: 36 }} />
              </div>
              <div className="ve-ls-body">
                <div className="ve-ls-event-pill">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5l1.3 2.8 3.2.5-2.3 2.2.5 3.1L7 8.5l-2.7 1.6.5-3.1L2.5 4.8l3.2-.5L7 1.5z" stroke="#9AA0A6" strokeWidth="1.2" strokeLinejoin="round" /></svg>
                  <span className="ve-ls-event-name">{liveSummary.eventName}</span>
                </div>
                <div className="ve-ls-amount">{liveSummary.raised}</div>
                <div className="ve-ls-org">raised for {liveSummary.org}</div>
                <div className="ve-ls-meta">
                  <span className="ve-ls-meta-item"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 12v-1A2.5 2.5 0 007 8.5H4A2.5 2.5 0 001.5 11v1" stroke="#9AA0A6" strokeWidth="1.3" strokeLinecap="round" /><circle cx="5.5" cy="4.5" r="2" stroke="#9AA0A6" strokeWidth="1.3" /><path d="M12 12v-1a2.5 2.5 0 00-1.5-2.3M9.5 2.7a2 2 0 010 3.6" stroke="#9AA0A6" strokeWidth="1.3" strokeLinecap="round" /></svg>{liveSummary.donors} donors</span>
                  <span className="ve-ls-meta-item"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 12v-1A2.5 2.5 0 007 8.5H4A2.5 2.5 0 001.5 11v1" stroke="#9AA0A6" strokeWidth="1.3" strokeLinecap="round" /><circle cx="5.5" cy="4.5" r="2" stroke="#9AA0A6" strokeWidth="1.3" /><path d="M12 12v-1a2.5 2.5 0 00-1.5-2.3M9.5 2.7a2 2 0 010 3.6" stroke="#9AA0A6" strokeWidth="1.3" strokeLinecap="round" /></svg>{liveSummary.groups} groups</span>
                </div>
                <div className="ve-ls-section-title">Milestones</div>
                <div className="ve-ls-milestones">
                  {liveSummary.milestones.map((m, i) => (
                    <div key={i} className={`ve-ls-milestone${m.reached ? ' ve-ls-milestone--reached' : ''}`}>
                      <div className={`ve-ls-milestone-icon${m.reached ? ' reached' : ''}`}><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2l1.8 3.5 4 .6-2.9 2.8.7 4L9 11.2l-3.6 1.7.7-4L3.2 6.1l4-.6L9 2z" fill={m.reached ? '#fff' : 'none'} stroke={m.reached ? '#fff' : '#C5C8CC'} strokeWidth="1.3" strokeLinejoin="round" /></svg></div>
                      <span className={`ve-ls-milestone-text${m.reached ? ' reached' : ''}`}>{m.amount} — {m.label}</span>
                      {m.reached && <span className="ve-ls-reached-badge">Reached!</span>}
                    </div>
                  ))}
                </div>
                <div className="ve-ls-section-title">Group Leaderboard</div>
                <div className="ve-ls-leaderboard">
                  {liveSummary.leaderboard.map((row, i) => (
                    <div key={i} className="ve-ls-lb-row">
                      <span className="ve-ls-lb-rank">{row.rank}</span>
                      <div className="ve-ls-lb-info">
                        <span className="ve-ls-lb-name">{row.name}</span>
                        <span className="ve-ls-lb-sub">{row.members} members · {row.match} match</span>
                      </div>
                      <span className="ve-ls-lb-total">{row.total}</span>
                    </div>
                  ))}
                </div>
                <div style={{ height: 40 }} />
              </div>
            </div>
          </>
        )}

        {/* ══ Round Overview Sheet ══ */}
        {showRoundOverview && (
          <>
            <div className="ve-backdrop" onClick={() => setShowRoundOverview(false)} />
            <div className="ve-sheet ve-ro-sheet">
              <div className="ve-sheet-handle" />
              <div className="ve-ro-header">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="9.5" stroke="#2BA7A0" strokeWidth="1.6" /><circle cx="11" cy="11" r="5" stroke="#2BA7A0" strokeWidth="1.6" /><circle cx="11" cy="11" r="1.5" fill="#2BA7A0" /></svg>
                <span className="ve-ro-title">Round Overview</span>
              </div>
              <div className="ve-ro-tab-bars">
                {rounds.map((r, i) => <div key={i} className={`ve-ro-tab-bar ${activeRoundTab === i ? 'active' : ''}`} onClick={() => setActiveRoundTab(i)} />)}
              </div>
              <div className="ve-ro-tab-labels">
                {rounds.map((r, i) => <button key={i} className={`ve-ro-tab-label ${activeRoundTab === i ? 'active' : ''}`} onClick={() => setActiveRoundTab(i)}>{r.label}</button>)}
              </div>
              {activeRound && (
                <div className="ve-ro-card">
                  <div className="ve-ro-card-header">
                    <span className="ve-ro-card-title">Round {activeRoundTab + 1}</span>
                    <span className={`ve-ro-badge ve-ro-badge--${activeRound.status}`}>
                      {activeRound.status === 'complete' ? 'Complete' : activeRound.status === 'bidding' ? 'Bidding' : 'Not yet started'}
                    </span>
                  </div>
                  <div className="ve-ro-divider" />
                  <div className="ve-ro-stats">
                    <div className="ve-ro-stat"><span className="ve-ro-stat-label">Raised</span><span className="ve-ro-stat-val">{activeRound.raised ?? '--'}</span></div>
                    <div className="ve-ro-stat"><span className="ve-ro-stat-label">Alerts</span><span className={`ve-ro-stat-val${activeRound.alerts ? ' ve-ro-stat-val--alert' : ''}`}>{activeRound.alerts ?? '--'}</span></div>
                    <div className="ve-ro-stat"><span className="ve-ro-stat-label">Groups</span><span className="ve-ro-stat-val">{activeRound.groups}</span></div>
                  </div>
                  <div className="ve-ro-divider" />
                  <div className="ve-ro-group-list">
                    {activeRound.groupRows.map((g, i) => (
                      <div key={i} className="ve-ro-group-row">
                        <div className="ve-ro-group-left"><RowStatusIcon status={g.status} /><span className="ve-ro-group-name">{g.name}</span></div>
                        <span className="ve-ro-group-detail" style={{ color: g.detailColor ?? '#C5C8CC' }}>{g.detail ?? '–'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {rounds.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#9AA0A6' }}>No rounds started yet</div>}
              <div className="ve-sheet-close" onClick={() => setShowRoundOverview(false)}>Close</div>
            </div>
          </>
        )}

        {/* ══ Group Detail Sheet ══ */}
        {selectedGroup && (
          <>
            <div className="ve-backdrop" onClick={() => setSelectedGroup(null)} />
            <div className="ve-sheet">
              <div className="ve-sheet-handle" />
              <div className="ve-sheet-header">
                <h3 className="ve-sheet-title">{selectedGroup.name}</h3>
                <span className={`ve-sheet-badge ${getGroupBadge(selectedGroup).cls}`}>{getGroupBadge(selectedGroup).label}</span>
              </div>
              <div className="ve-donor-list">
                {selectedGroup.donors.map((donor, i) => (
                  <div key={i} className="ve-donor-row" style={getDonorRankStyle(donor, selectedGroup.donors)}>
                    <div className="ve-donor-avatar" style={{ background: donor.color }}>{donor.initial}</div>
                    <div className="ve-donor-info"><span className="ve-donor-name">{donor.name}</span><span className="ve-donor-sub">{donor.sub}</span></div>
                    <div className="ve-donor-right">{donor.bid ? <span className="ve-donor-bid">{donor.bid}</span> : <span className="ve-donor-bidding">Bidding...</span>}</div>
                    <span className="ve-donor-remove">⊗</span>
                  </div>
                ))}
              </div>
              <div className="ve-sheet-close" onClick={() => setSelectedGroup(null)}>Close</div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            PROPOSED GROUP ALLOCATIONS SHEET
            Shows after round closes. Host reviews groups, selects members
            and moves them between groups, then launches the next round.
        ══════════════════════════════════════════════════════════════════════ */}
        {showPGA && (
          <>
            <div className="ve-backdrop" onClick={() => setShowPGA(false)} />
            <div className="ve-sheet ve-sheet--full ve-pga-sheet">

              {/* Top bar */}
              <div className="ve-sheet-topbar">
                <div className="ve-back-btn" onClick={() => setShowPGA(false)}><img src={`${imgBase}/Back.svg`} alt="back" /></div>
                <span className="ve-sheet-topbar-title">Proposed Group Allocations</span>
                <div style={{ width: 36 }} />
              </div>

              {/* Summary bar */}
              <div className="ve-pga-summary-bar">
                <span className="ve-pga-total">Total: {pgaTotalPeople} people</span>
                <button className="ve-pga-rebalance-btn" onClick={pgaRebalance}>Rebalance</button>
              </div>

              {/* Scrollable group list */}
              <div className="ve-pga-group-list">
                {pgaGroups.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 12, color: '#9AA0A6', textAlign: 'center' }}>
                    <span style={{ fontSize: 40 }}>👥</span>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#1A1A2E' }}>No group members yet</span>
                    <span style={{ fontSize: 13 }}>No donors placed bids in this round. The next round will start automatically.</span>
                  </div>
                )}
                {pgaGroups.map(group => {
                  const selectedCount = group.members.filter(m => m.selected).length;
                  return (
                    <div key={group.id} className="ve-pga-group-card" style={getPgaGroupRankStyle(group, pgaGroups)}>
                      {/* Group header */}
                      <div className="ve-pga-group-header">
                        <div className="ve-pga-group-left">
                          <span className="ve-pga-group-icon">👥</span>
                          <span className="ve-pga-group-label">{group.label}</span>
                          <span className="ve-pga-group-count">{group.members.length}</span>
                        </div>
                        <div className="ve-pga-group-actions">
                          <button className="ve-pga-icon-btn" onClick={() => pgaToggleExpand(group.id)}>
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={`ve-pga-chevron ${group.expanded ? 've-pga-chevron--up' : ''}`}>
                              <polyline points="4,7 9,12 14,7" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Expanded: member grid + Move button */}
                      {group.expanded && (
                        <div className="ve-pga-group-body">
                          <div className="ve-pga-member-grid">
                            {group.members.map(member => {
                              const rankColor = (member.isYou && !member.selected) ? getPgaMemberRankColor(member, group.members) : null;
                              return (
                              <button
                                key={member.id}
                                className={`ve-pga-member-cell ${member.selected ? 've-pga-member-cell--selected' : ''}`}
                                style={rankColor ? { background: rankColor, borderColor: rankColor } : undefined}
                                onClick={() => pgaToggleMember(group.id, member.id)}
                              >
                                <div className="ve-pga-avatar-wrap" style={rankColor ? { background: '#fff', borderRadius: '50%' } : undefined}>
                                  <span className="ve-pga-avatar">{member.emoji}</span>
                                  {member.selected && (
                                    <span className="ve-pga-check">
                                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <circle cx="7" cy="7" r="7" fill="#2BA7A0"/>
                                        <polyline points="3.5,7 5.5,9.5 10.5,4.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </span>
                                  )}
                                </div>
                                <span className="ve-pga-member-name" style={rankColor ? { color: '#fff' } : undefined}>{member.name}</span>
                                <span className="ve-pga-member-amount" style={rankColor ? { color: 'rgba(255,255,255,0.9)' } : undefined}>{member.amount}</span>
                              </button>
                              );
                            })}
                          </div>
                          <button
                            className="ve-pga-move-btn"
                            onClick={() => pgaOpenActionSheet(group.id)}
                            disabled={selectedCount === 0 || pgaMoveLoading || pgaDeleteLoading || pgaCreateLoading}
                          >
                            {selectedCount > 0 ? `Actions (${selectedCount})` : 'Actions'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ height: 110 }} />
              </div>

              {/* Sticky footer */}
              <div className="ve-pga-footer">
                <div className="ve-launch-btn ve-launch-btn--arrow" style={{ opacity: actionLoading ? 0.6 : 1 }} onClick={pgaLaunchNextRound}>
                  {actionLoading ? 'Launching…' : `Launch Round ${(apiEvent?.completed_rounds ?? 0) + 1} →`}
                </div>
                <div className="ve-end-btn" onClick={() => setShowPGA(false)}>End Event</div>
              </div>
            </div>

            {/* ── Action sheet: Move / Delete / New Group ── */}
            {pgaActionSheet.open && (
              <div className="ve-pga-move-backdrop">
                <div className="ve-pga-move-sheet" ref={moveSheetRef}>
                  <div className="ve-sheet-handle" />
                  <h3 className="ve-pga-move-title">
                    {pgaActionSheet.selectedMemberIds.length} member{pgaActionSheet.selectedMemberIds.length !== 1 ? 's' : ''} selected
                  </h3>
                  <div className="ve-pga-move-group-list">
                    {/* Move to existing group */}
                    <button className="ve-pga-action-row ve-pga-action-row--move" onClick={pgaOpenMoveFromAction} disabled={pgaMoveLoading}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M3 9h12M10 4l5 5-5 5" stroke="#1A1A2E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Move to existing group</span>
                    </button>
                    {/* Create new group */}
                    <button className="ve-pga-action-row ve-pga-action-row--create" onClick={pgaCreateGroupAndMove} disabled={pgaCreateLoading}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <circle cx="9" cy="9" r="7.5" stroke="#2BA7A0" strokeWidth="1.5"/>
                        <path d="M9 6v6M6 9h6" stroke="#2BA7A0" strokeWidth="1.6" strokeLinecap="round"/>
                      </svg>
                      <span>{pgaCreateLoading ? 'Creating…' : 'Create new group'}</span>
                    </button>
                    {/* Delete members */}
                    <button className="ve-pga-action-row ve-pga-action-row--delete" onClick={pgaDeleteMembers} disabled={pgaDeleteLoading}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M3 5h12M7 5V3.5h4V5M7.5 8v5M10.5 8v5M4 5l1 10h8l1-10" stroke="#E53E3E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>{pgaDeleteLoading ? 'Removing…' : 'Remove from event'}</span>
                    </button>
                    {/* Cancel */}
                    <button className="ve-pga-action-row ve-pga-action-row--cancel" onClick={pgaCloseActionSheet}>
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Move destination sheet ── */}
            {moveSheet.open && (
              <div className="ve-pga-move-backdrop">
                <div className="ve-pga-move-sheet" ref={moveSheetRef}>
                  <div className="ve-sheet-handle" />
                  <h3 className="ve-pga-move-title">Select where to move the users</h3>

                  {/* Selected member emoji previews */}
                  {fromGroupForSheet && (
                    <div className="ve-pga-move-avatars">
                      {fromGroupForSheet.members.filter(m => m.selected).slice(0, 4).map(m => (
                        <span key={m.id} className="ve-pga-move-avatar">{m.emoji}</span>
                      ))}
                    </div>
                  )}

                  {/* Destination group rows — show full indicator */}
                  <div className="ve-pga-move-group-list">
                    {pgaGroups.map(g => {
                      const isCurrent  = g.id === moveSheet.fromGroupId;
                      const groupSize  = apiEvent?.group_size ?? 999;
                      const wouldFill  = g.members.length + moveSheet.selectedMemberIds.length;
                      const isFull     = !isCurrent && g.members.length >= groupSize;
                      const wouldOver  = !isCurrent && wouldFill > groupSize;
                      const isDisabled = isCurrent || isFull || wouldOver || pgaMoveLoading;
                      return (
                        <button
                          key={g.id}
                          className={`ve-pga-move-group-row ${isCurrent ? 've-pga-move-group-row--current' : ''} ${(isFull || wouldOver) ? 've-pga-move-group-row--full' : ''}`}
                          onClick={() => !isDisabled && pgaMoveMembers(g.id)}
                          disabled={isDisabled}
                        >
                          <span className="ve-pga-move-group-name">{g.label}</span>
                          <span className="ve-pga-move-group-count">{g.members.length}/{groupSize}</span>
                          {isCurrent  && <span className="ve-pga-move-current-badge">Current</span>}
                          {(isFull || wouldOver) && !isCurrent && <span className="ve-pga-move-full-badge">Full</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {pgaToast && <div className="ve-pga-toast">{pgaToast}</div>}
          </>
        )}

      </IonContent>
    </IonPage>
  );
};

export default ViewEvent;