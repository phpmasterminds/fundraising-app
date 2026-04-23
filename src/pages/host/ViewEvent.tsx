import {
  IonPage,
  IonContent
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useState } from 'react';
import './ViewEvent.css';

/* ── Types ── */
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
  label: string;
  status: 'complete' | 'bidding' | 'not-started';
  raised: string | null;
  alerts: number | null;
  groups: string;
  groupRows: RoundGroupRow[];
}

const ViewEvent: React.FC = () => {
  const router = useIonRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [ignoreZeroBids, setIgnoreZeroBids] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showAllDonors, setShowAllDonors] = useState(false);
  const [showLiveSummary, setShowLiveSummary] = useState(false);
  const [showRoundOverview, setShowRoundOverview] = useState(false);
  const [activeRoundTab, setActiveRoundTab] = useState(0);

  /* ── Event data ── */
  const event = {
    title: 'Spring Gala 2026',
    org: 'EduReach Foundation',
    raised: '£2,840',
    target: '£15,000',
    progressPercent: 19,
    donors: 16,
    round: '1/3',
    timerLabel: '00:45',
    roundProgress: '1/4 Complete',
    alert: 'Group B: Co-equal minimum bids detected',
    joinLink: 'https://17b224a9-b6ed-47fa-abfd-680a37b13b04-v2-figmaiframepreview.figma.site/join',
    eventName: 'Ocean Guardian Gala 2026',
    charityName: 'Clean Oceans Initiative',
    targetAmount: '25000',
    controls: { groupSize: '4 donors', totalRounds: 3, seedingMethod: 'donation' },
    groups: [
      {
        name: 'Group A', bids: 4, totalBids: 4,
        min: '£180 · 1:3', status: 'done' as const,
        donors: [
          { initial: 'A', name: 'Bobi', sub: 'Alice M.', bid: '£350', totalCommitted: '£475', color: '#E6F4F2' },
          { initial: 'A', name: 'Atlas', sub: 'Alice M.', bid: '£150', totalCommitted: '£680', color: '#E6F4F2' },
          { initial: 'C', name: 'Cascade', sub: 'Frank L.', bid: '£247', totalCommitted: '£800', color: '#EEF1F4' },
          { initial: 'C', name: 'Horizon', sub: 'Frank L.', bid: '£321', totalCommitted: '£780', color: '#EEF1F4' },
        ],
      },
      {
        name: 'Group B', bids: 2, totalBids: 4, alert: true, status: 'pending' as const,
        donors: [
          { initial: 'A', name: 'Contras', sub: 'Alice M.', bid: null, totalCommitted: '£475', status: 'bidding' as const, color: '#E6F4F2' },
          { initial: 'A', name: 'Albart', sub: 'Alice M.', bid: null, totalCommitted: '£680', status: 'left' as const, color: '#E6F4F2' },
          { initial: 'C', name: 'Cascade', sub: 'Frank L.', bid: '£247', totalCommitted: '£800', color: '#EEF1F4' },
          { initial: 'C', name: 'Davu', sub: 'Frank L.', bid: '£321', totalCommitted: '£780', color: '#EEF1F4' },
          { initial: 'A', name: 'Comkos', sub: 'Alice M.', bid: null, totalCommitted: '£680', status: 'left' as const, color: '#E6F4F2' },
        ],
      },
      {
        name: 'Group C', bids: 1, totalBids: 4, status: 'waiting' as const,
        donors: [
          { initial: 'A', name: 'Contras', sub: 'Alice M.', bid: null, totalCommitted: '£475', status: 'bidding' as const, color: '#E6F4F2' },
          { initial: 'A', name: 'Albart', sub: 'Alice M.', bid: null, totalCommitted: '£680', color: '#E6F4F2' },
          { initial: 'C', name: 'Cascade', sub: 'Frank L.', bid: '£247', totalCommitted: '£800', color: '#EEF1F4' },
          { initial: 'C', name: 'Davu', sub: 'Frank L.', bid: '£321', totalCommitted: '£780', color: '#EEF1F4' },
        ],
      },
      {
        name: 'Group D', bids: 0, totalBids: 4, status: 'waiting' as const,
        donors: [
          { initial: 'A', name: 'Nebula', sub: 'David R.', bid: null, totalCommitted: '£475', color: '#E6F4F2' },
          { initial: 'H', name: 'Horizon', sub: 'Grace W.', bid: null, totalCommitted: '£680', color: '#FFF3E6' },
          { initial: 'C', name: 'Cedar', sub: 'Maya F.', bid: null, totalCommitted: '£800', color: '#EEF1F4' },
          { initial: 'D', name: 'Drift', sub: 'Noah D.', bid: null, totalCommitted: '£780', color: '#EEF1F4' },
        ],
      },
    ] as Group[],
  };

  /* ── Round Overview data ── */
  const rounds: RoundData[] = [
    {
      label: 'R1', status: 'complete', raised: '£2,160', alerts: 1, groups: '1/4',
      groupRows: [
        { name: 'Group A', status: 'done', detail: '£180 min · 1:3', detailColor: '#2BA7A0' },
        { name: 'Group B', status: 'done', detail: '£240 min · 1:3', detailColor: '#2BA7A0' },
        { name: 'Group C', status: 'done', detail: '£315 min · 1:3', detailColor: '#2BA7A0' },
        { name: 'Group D', status: 'done', detail: '£58 min · 1:3', detailColor: '#2BA7A0' },
      ],
    },
    {
      label: 'R2', status: 'bidding', raised: null, alerts: 1, groups: '1/4',
      groupRows: [
        { name: 'Group A', status: 'done', detail: '£180 min · 1:3', detailColor: '#2BA7A0' },
        { name: 'Group B', status: 'pending', alert: true, detail: '2/4 bids', detailColor: '#9AA0A6' },
        { name: 'Group C', status: 'waiting', detail: '1/4 bids', detailColor: '#F4A43A' },
        { name: 'Group D', status: 'waiting', detail: '0/4 bids', detailColor: '#9AA0A6' },
      ],
    },
    {
      label: 'R3', status: 'not-started', raised: null, alerts: null, groups: '--',
      groupRows: [
        { name: 'Group A', status: 'waiting', detail: null },
        { name: 'Group B', status: 'waiting', detail: null },
        { name: 'Group C', status: 'waiting', detail: null },
        { name: 'Group D', status: 'waiting', detail: null },
      ],
    },
  ];

  /* ── Live Summary data ── */
  const liveSummary = {
    eventName: 'Hope Gala 2026',
    raised: '£780',
    org: 'Shelter Tomorrow Foundation',
    donors: 24,
    groups: 6,
    milestones: [
      { amount: '£500', label: 'First Milestone!', reached: true },
      { amount: '£1,000', label: 'Half Way!', reached: false },
      { amount: '£2,000', label: 'Stretch Goal!', reached: false },
    ],
    leaderboard: [
      { rank: 1, name: 'Group C', members: 4, match: '1:3', total: '£112' },
      { rank: 2, name: 'Group B', members: 4, match: '1:3', total: '£68' },
      { rank: 3, name: 'Group E', members: 4, match: '1:3', total: '£48' },
      { rank: 4, name: 'Group E', members: 4, match: '1:3', total: '£32' },
      { rank: 5, name: 'Group E', members: 4, match: '1:3', total: '£24' },
      { rank: 6, name: 'Group E', members: 4, match: '1:3', total: '£20' },
    ],
  };

  /* ── Helpers ── */
  const getGroupCardClass = (status: string) => {
    if (status === 'done') return 've-group-card teal-border';
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
    if (group.bids === group.totalBids) return { label: 'Done', cls: 'badge-done' };
    if (group.bids > 0) return { label: 'Bidding', cls: 'badge-bidding' };
    return { label: 'Waiting', cls: 'badge-waiting' };
  };

  const allDonorGroups = event.groups.map(g => ({ name: g.name, donors: g.donors }));
  const activeRound = rounds[activeRoundTab];

  const closeAll = () => {
    setShowQR(false); setShowAllDonors(false);
    setShowLiveSummary(false); setShowRoundOverview(false);
    setSelectedGroup(null);
  };

  return (
    <IonPage>
      <IonContent fullscreen className="view-event-page">
        <div className="ve-container padding-bttom-0">

          {/* ── Header ── */}
          <div className="ve-header">
            <div className="ve-back-btn" onClick={() => router.goBack()}>
              <img src="/assets/img/Back.svg" alt="back" />
            </div>
            <div className="ve-header-right">
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
<path d="M8.14667 1.3335H7.85333C7.49971 1.3335 7.16057 1.47397 6.91053 1.72402C6.66048 1.97407 6.52 2.31321 6.52 2.66683V2.78683C6.51976 3.02065 6.45804 3.25029 6.34103 3.45272C6.22401 3.65515 6.05583 3.82325 5.85333 3.94016L5.56667 4.10683C5.36398 4.22385 5.13405 4.28546 4.9 4.28546C4.66595 4.28546 4.43603 4.22385 4.23333 4.10683L4.13333 4.0535C3.82738 3.877 3.46389 3.82913 3.12267 3.92037C2.78145 4.01161 2.49037 4.23452 2.31333 4.54016L2.16667 4.7935C1.99018 5.09945 1.9423 5.46294 2.03354 5.80416C2.12478 6.14539 2.34769 6.43646 2.65333 6.6135L2.75333 6.68016C2.95485 6.7965 3.12241 6.96356 3.23937 7.16472C3.35632 7.36588 3.4186 7.59414 3.42 7.82683V8.16683C3.42093 8.40178 3.35977 8.6328 3.2427 8.8365C3.12563 9.04021 2.95681 9.20936 2.75333 9.32683L2.65333 9.38683C2.34769 9.56386 2.12478 9.85494 2.03354 10.1962C1.9423 10.5374 1.99018 10.9009 2.16667 11.2068L2.31333 11.4602C2.49037 11.7658 2.78145 11.9887 3.12267 12.08C3.46389 12.1712 3.82738 12.1233 4.13333 11.9468L4.23333 11.8935C4.43603 11.7765 4.66595 11.7149 4.9 11.7149C5.13405 11.7149 5.36398 11.7765 5.56667 11.8935L5.85333 12.0602C6.05583 12.1771 6.22401 12.3452 6.34103 12.5476C6.45804 12.75 6.51976 12.9797 6.52 13.2135V13.3335C6.52 13.6871 6.66048 14.0263 6.91053 14.2763C7.16057 14.5264 7.49971 14.6668 7.85333 14.6668H8.14667C8.50029 14.6668 8.83943 14.5264 9.08948 14.2763C9.33953 14.0263 9.48 13.6871 9.48 13.3335V13.2135C9.48024 12.9797 9.54196 12.75 9.65898 12.5476C9.77599 12.3452 9.94418 12.1771 10.1467 12.0602L10.4333 11.8935C10.636 11.7765 10.866 11.7149 11.1 11.7149C11.3341 11.7149 11.564 11.7765 11.7667 11.8935L11.8667 11.9468C12.1726 12.1233 12.5361 12.1712 12.8773 12.08C13.2186 11.9887 13.5096 11.7658 13.6867 11.4602L13.8333 11.2002C14.0098 10.8942 14.0577 10.5307 13.9665 10.1895C13.8752 9.84827 13.6523 9.5572 13.3467 9.38016L13.2467 9.32683C13.0432 9.20936 12.8744 9.04021 12.7573 8.8365C12.6402 8.6328 12.5791 8.40178 12.58 8.16683V7.8335C12.5791 7.59855 12.6402 7.36753 12.7573 7.16382C12.8744 6.96012 13.0432 6.79097 13.2467 6.6735L13.3467 6.6135C13.6523 6.43646 13.8752 6.14539 13.9665 5.80416C14.0577 5.46294 14.0098 5.09945 13.8333 4.7935L13.6867 4.54016C13.5096 4.23452 13.2186 4.01161 12.8773 3.92037C12.5361 3.82913 12.1726 3.877 11.8667 4.0535L11.7667 4.10683C11.564 4.22385 11.3341 4.28546 11.1 4.28546C10.866 4.28546 10.636 4.22385 10.4333 4.10683L10.1467 3.94016C9.94418 3.82325 9.77599 3.65515 9.65898 3.45272C9.54196 3.25029 9.48024 3.02065 9.48 2.78683V2.66683C9.48 2.31321 9.33953 1.97407 9.08948 1.72402C8.83943 1.47397 8.50029 1.3335 8.14667 1.3335Z" stroke={showSettings ? '#fff' : '#1A1A2E'} stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke={showSettings ? '#fff' : '#1A1A2E'} stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

              </div>
            </div>
          </div>

          {/* ── Event Info Card ── */}

          <div className="ve-live-badge">
            <span className="ve-live-dot" />Live Event
          </div>
          <h1 className="ve-event-title">{event.title}</h1>
          <p className="ve-event-org">{event.org}</p>

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
              <div className={`ve-toggle ${ignoreZeroBids ? 've-toggle--on' : ''}`} onClick={() => setIgnoreZeroBids(p => !p)}>
                <div className="ve-toggle-knob" />
              </div>
            </div>
            <div className="ve-control-divider" />
            <div className="ve-control-row">
              <span className="ve-control-label">Group Size</span>
              <span className="ve-control-chip">{event.controls.groupSize}</span>
            </div>
            <div className="ve-control-divider" />
            <div className="ve-control-row">
              <span className="ve-control-label">Total Rounds</span>
              <span className="ve-control-chip">{event.controls.totalRounds}</span>
            </div>
            <div className="ve-control-divider" />
            <div className="ve-control-row">
              <span className="ve-control-label">Seeding Method</span>
              <span className="ve-control-chip">{event.controls.seedingMethod}</span>
            </div>
          </div>
        </div> <div className="ve-container bg-white">
          {/* Stats Row */}
          <div className="ve-event-info">
            <div className="ve-stats-row">
              <div className="ve-stat-card" style={{ cursor: 'pointer' }} onClick={() => { closeAll(); setShowLiveSummary(true); }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M2 14l5-5 4 4 7-8" stroke="#2BA7A0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="ve-stat-value">{event.raised}</p>
                <p className="ve-stat-label">Raised</p>
              </div>
              <div className="ve-stat-card" style={{ cursor: 'pointer' }} onClick={() => { closeAll(); setShowAllDonors(true); }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M13.5 17v-1.5A3 3 0 0010.5 12h-6a3 3 0 00-3 3.5V17" stroke="#2BA7A0" strokeWidth="1.6" strokeLinecap="round" />
                  <circle cx="7.5" cy="6.5" r="2.5" stroke="#2BA7A0" strokeWidth="1.6" />
                  <path d="M17 17v-1.5a3 3 0 00-2-2.83M13.5 4.17a3 3 0 010 5.66" stroke="#2BA7A0" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <p className="ve-stat-value">{event.donors}</p>
                <p className="ve-stat-label">Donors</p>
              </div>
              <div className="ve-stat-card" style={{ cursor: 'pointer' }} onClick={() => { closeAll(); setShowRoundOverview(true); }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" stroke="#2BA7A0" strokeWidth="1.6" />
                  <circle cx="10" cy="10" r="4" stroke="#2BA7A0" strokeWidth="1.6" />
                  <circle cx="10" cy="10" r="1" fill="#2BA7A0" />
                </svg>
                <p className="ve-stat-value">{event.round}</p>
                <p className="ve-stat-label">Round</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="ve-progress-card">
              <div className="ve-progress-header">
                <span className="ve-progress-label">Progress to Target</span>
                <span className="ve-progress-amount">{event.raised} / {event.target}</span>
              </div>
              <div className="ve-progress-track">
                <div className="ve-progress-fill" style={{ width: `${event.progressPercent}%` }} />
              </div>
              <div className="ve-progress-scale">
                <span>£5k</span><span>£10k</span><span>£15k</span>
              </div>
            </div>
          </div>

          {/* ── Alert Banner ── */}
          <div className="ve-alert-banner">
            <div className="ve-alert-left">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                <path d="M9 2L16.5 15.5H1.5L9 2Z" fill="#F4A43A" strokeLinejoin="round" />
                <path d="M9 7.5v3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="9" cy="13" r="0.8" fill="#fff" />
              </svg>
              <span className="ve-alert-text">{event.alert}</span>
            </div>
            <span className="ve-alert-chevron">›</span>
          </div>

          {/* ── Round Header ── */}
          <div className="ve-round-header">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
              <rect x="1.5" y="1.5" width="6" height="6" rx="1" stroke="#1A1A2E" strokeWidth="1.5" />
              <rect x="10.5" y="1.5" width="6" height="6" rx="1" stroke="#1A1A2E" strokeWidth="1.5" />
              <rect x="1.5" y="10.5" width="6" height="6" rx="1" stroke="#1A1A2E" strokeWidth="1.5" />
              <rect x="10.5" y="10.5" width="6" height="6" rx="1" stroke="#1A1A2E" strokeWidth="1.5" />
            </svg>
            <span className="ve-round-title">Round 1</span>
            <div className="ve-round-timer">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5.25" stroke="#fff" strokeWidth="1.2" />
                <path d="M6 3.5V6l1.5 1.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {event.timerLabel}
            </div>
            <span className="ve-round-complete">{event.roundProgress}</span>
          </div>

          {/* ── Group Grid ── */}
          <div className="ve-group-grid">
            {event.groups.map((group, i) => (
              <div key={i} className={getGroupCardClass(group.status)} onClick={() => setSelectedGroup(group)}>
                <div className="ve-group-header">
                  <span className="ve-group-name">{group.name}</span>
                  {getStatusIcon(group.status)}
                </div>
                <div className="ve-bid-dots">{renderDots(group.bids, group.totalBids, group.status)}</div>
                <div className="ve-group-bids">{group.bids}/{group.totalBids} bids</div>
                {group.min && <div className="ve-group-min">Min: {group.min}</div>}
                {group.alert && <div className="ve-group-alert">⚠ Alert</div>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom Actions ── */}
        <div className="ve-bottom-area">
          <div className="ve-launch-btn" onClick={() => router.goBack()}>Launch Round 2 →</div>
          <div className="ve-end-btn" onClick={() => router.goBack()}>End Event</div>
        </div>

        {/* ══ QR / Setup Sheet ══ */}
        {showQR && (
          <>
            <div className="ve-backdrop" onClick={() => setShowQR(false)} />
            <div className="ve-sheet ve-sheet--full">
              <div className="ve-sheet-topbar">
                <div className="ve-back-btn" onClick={() => setShowQR(false)}>
                  <img src="/assets/img/Back.svg" alt="back" />
                </div>
                <span className="ve-sheet-topbar-title">Setup &amp; QR</span>
                <div style={{ width: 36 }} />
              </div>
              <div className="ve-qr-section-title">Join Information</div>
              <div className="ve-qr-box">
                <svg viewBox="0 0 200 200" width="180" height="180">
                  <rect x="10" y="10" width="56" height="56" rx="4" fill="#000" />
                  <rect x="18" y="18" width="40" height="40" rx="2" fill="#fff" />
                  <rect x="26" y="26" width="24" height="24" rx="1" fill="#000" />
                  <rect x="134" y="10" width="56" height="56" rx="4" fill="#000" />
                  <rect x="142" y="18" width="40" height="40" rx="2" fill="#fff" />
                  <rect x="150" y="26" width="24" height="24" rx="1" fill="#000" />
                  <rect x="10" y="134" width="56" height="56" rx="4" fill="#000" />
                  <rect x="18" y="142" width="40" height="40" rx="2" fill="#fff" />
                  <rect x="26" y="150" width="24" height="24" rx="1" fill="#000" />
                  {[76, 84, 92, 100, 108, 116, 124].map(x =>
                    [10, 18, 26, 34, 42, 50, 58, 66, 74].map(y =>
                      ((x * y) % 7 < 4) && <rect key={`a${x}-${y}`} x={x} y={y} width="5" height="5" fill="#000" />
                    )
                  )}
                  {[10, 18, 26, 34, 42, 50, 58, 66, 74].map(x =>
                    [76, 84, 92, 100, 108, 116, 124, 132].map(y =>
                      ((x + y * 2) % 9 < 5) && <rect key={`b${x}-${y}`} x={x} y={y} width="5" height="5" fill="#000" />
                    )
                  )}
                  {[80, 88, 96, 104, 112].map(x => [80, 88, 96, 104, 112].map(y =>
                    ((x + y) % 16 < 8) && <rect key={`c${x}-${y}`} x={x} y={y} width="6" height="6" fill="#000" />
                  ))}
                </svg>
                <button className="ve-qr-share-btn">
                 <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.8331 7.31021L10.1187 1.59582C10.0388 1.51585 9.93705 1.46137 9.82621 1.43926C9.71537 1.41715 9.60046 1.42841 9.49602 1.47161C9.39157 1.51481 9.30229 1.58801 9.23945 1.68196C9.17661 1.7759 9.14304 1.88637 9.14299 1.9994V4.8816C7.2901 5.04017 5.24363 5.94733 3.56002 7.37522C1.53284 9.09525 0.270676 11.3117 0.00567097 13.616C-0.0150382 13.7952 0.0212866 13.9763 0.109476 14.1336C0.197665 14.2909 0.333225 14.4164 0.496864 14.4922C0.660503 14.568 0.843883 14.5903 1.02091 14.5559C1.19793 14.5214 1.35958 14.432 1.48284 14.3003C2.26857 13.4639 5.06434 10.8189 9.14299 10.586V13.4282C9.14304 13.5412 9.17661 13.6517 9.23945 13.7456C9.30229 13.8396 9.39157 13.9128 9.49602 13.956C9.60046 13.9992 9.71537 14.0104 9.82621 13.9883C9.93705 13.9662 10.0388 13.9117 10.1187 13.8318L15.8331 8.11737C15.94 8.01025 16 7.86511 16 7.71379C16 7.56248 15.94 7.41734 15.8331 7.31021ZM10.2859 12.0489V9.99955C10.2859 9.848 10.2257 9.70265 10.1185 9.59548C10.0113 9.48832 9.86598 9.42811 9.71443 9.42811C7.70868 9.42811 5.75507 9.95169 3.90789 10.9853C2.96712 11.514 2.09058 12.1497 1.2957 12.8796C1.70999 11.1767 2.7543 9.5574 4.29933 8.24666C5.95793 6.84021 7.98225 5.99947 9.71443 5.99947C9.86598 5.99947 10.0113 5.93927 10.1185 5.8321C10.2257 5.72494 10.2859 5.57959 10.2859 5.42804V3.37942L14.621 7.71379L10.2859 12.0489Z" fill="#25201D"/>
</svg>

                </button>
              </div>
              <div className="ve-qr-section-title" style={{ marginTop: 20 }}>Public Join Link</div>
              <div className="ve-join-link-box">
                <span className="ve-join-link-text">{event.joinLink}</span>
                <button className="ve-qr-share-btn ve-qr-share-btn--sm">
                 <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.8331 7.31021L10.1187 1.59582C10.0388 1.51585 9.93705 1.46137 9.82621 1.43926C9.71537 1.41715 9.60046 1.42841 9.49602 1.47161C9.39157 1.51481 9.30229 1.58801 9.23945 1.68196C9.17661 1.7759 9.14304 1.88637 9.14299 1.9994V4.8816C7.2901 5.04017 5.24363 5.94733 3.56002 7.37522C1.53284 9.09525 0.270676 11.3117 0.00567097 13.616C-0.0150382 13.7952 0.0212866 13.9763 0.109476 14.1336C0.197665 14.2909 0.333225 14.4164 0.496864 14.4922C0.660503 14.568 0.843883 14.5903 1.02091 14.5559C1.19793 14.5214 1.35958 14.432 1.48284 14.3003C2.26857 13.4639 5.06434 10.8189 9.14299 10.586V13.4282C9.14304 13.5412 9.17661 13.6517 9.23945 13.7456C9.30229 13.8396 9.39157 13.9128 9.49602 13.956C9.60046 13.9992 9.71537 14.0104 9.82621 13.9883C9.93705 13.9662 10.0388 13.9117 10.1187 13.8318L15.8331 8.11737C15.94 8.01025 16 7.86511 16 7.71379C16 7.56248 15.94 7.41734 15.8331 7.31021ZM10.2859 12.0489V9.99955C10.2859 9.848 10.2257 9.70265 10.1185 9.59548C10.0113 9.48832 9.86598 9.42811 9.71443 9.42811C7.70868 9.42811 5.75507 9.95169 3.90789 10.9853C2.96712 11.514 2.09058 12.1497 1.2957 12.8796C1.70999 11.1767 2.7543 9.5574 4.29933 8.24666C5.95793 6.84021 7.98225 5.99947 9.71443 5.99947C9.86598 5.99947 10.0113 5.93927 10.1185 5.8321C10.2257 5.72494 10.2859 5.57959 10.2859 5.42804V3.37942L14.621 7.71379L10.2859 12.0489Z" fill="#25201D"/>
</svg>

                </button>
              </div>
              <div className="ve-qr-divider" />
              <div className="ve-qr-section-title">Event Configuration</div>
              <div className="ve-config-field">
                <label className="ve-config-label">Event Name</label>
                <input className="ve-config-input" defaultValue={event.eventName} />
              </div>
              <div className="ve-config-field">
                <label className="ve-config-label">Charity Name</label>
                <input className="ve-config-input" defaultValue={event.charityName} />
              </div>
              <div className="ve-config-field">
                <label className="ve-config-label">Target Amount (£)</label>
                <input className="ve-config-input" defaultValue={event.targetAmount} type="number" />
              </div>
              <div style={{ height: 100 }} />
              <div className="ve-bottom-area" style={{ background: 'linear-gradient(to top,#fff 80%,transparent)' }}>
                <div className="ve-launch-btn" style={{ background: '#2BA7A0', boxShadow: '0 6px 15px rgba(43,167,160,0.35)' }}>Save</div>
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
                <div className="ve-back-btn" onClick={() => setShowAllDonors(false)}>
                  <img src="/assets/img/Back.svg" alt="back" />
                </div>
                <span className="ve-sheet-topbar-title">All Donors</span>
                <span className="ve-active-badge">{event.donors} Active</span>
              </div>
              <div className="ve-all-donors-list">
                {allDonorGroups.map((g, gi) => (
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
                            {donor.status === 'bidding'
                              ? <span className="ve-donor-bidding-orange">Bidding...</span>
                              : donor.status === 'left'
                                ? <span className="ve-left-event-chip">Left Event</span>
                                : donor.bid
                                  ? <span className="ve-all-donor-col-val">{donor.bid}</span>
                                  : <span className="ve-donor-bidding">—</span>
                            }
                          </div>
                        </div>
                        <span className="ve-donor-remove">⊗</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══ Live Summary Sheet (Raised click) ══ */}
        {showLiveSummary && (
          <>
            <div className="ve-backdrop" onClick={() => setShowLiveSummary(false)} />
            <div className="ve-sheet ve-sheet--full ve-sheet--white">
              <div className="ve-sheet-topbar ve-sheet-topbar--white">
                <div className="ve-back-btn" onClick={() => setShowLiveSummary(false)}>
                  <img src="/assets/img/Back.svg" alt="back" />
                </div>
                <span className="ve-sheet-topbar-title">Live Summary</span>
                <div style={{ width: 36 }} />
              </div>

              <div className="ve-ls-body">
                {/* Event name pill */}
                <div className="ve-ls-event-pill">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1.5l1.3 2.8 3.2.5-2.3 2.2.5 3.1L7 8.5l-2.7 1.6.5-3.1L2.5 4.8l3.2-.5L7 1.5z"
                      stroke="#9AA0A6" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                  <span className="ve-ls-event-name">{liveSummary.eventName}</span>
                </div>

                <div className="ve-ls-amount">{liveSummary.raised}</div>
                <div className="ve-ls-org">raised for {liveSummary.org}</div>

                <div className="ve-ls-meta">
                  <span className="ve-ls-meta-item">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M9.5 12v-1A2.5 2.5 0 007 8.5H4A2.5 2.5 0 001.5 11v1" stroke="#9AA0A6" strokeWidth="1.3" strokeLinecap="round" />
                      <circle cx="5.5" cy="4.5" r="2" stroke="#9AA0A6" strokeWidth="1.3" />
                      <path d="M12 12v-1a2.5 2.5 0 00-1.5-2.3M9.5 2.7a2 2 0 010 3.6" stroke="#9AA0A6" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    {liveSummary.donors} donors
                  </span>
                  <span className="ve-ls-meta-item">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M9.5 12v-1A2.5 2.5 0 007 8.5H4A2.5 2.5 0 001.5 11v1" stroke="#9AA0A6" strokeWidth="1.3" strokeLinecap="round" />
                      <circle cx="5.5" cy="4.5" r="2" stroke="#9AA0A6" strokeWidth="1.3" />
                      <path d="M12 12v-1a2.5 2.5 0 00-1.5-2.3M9.5 2.7a2 2 0 010 3.6" stroke="#9AA0A6" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    {liveSummary.groups} groups
                  </span>
                </div>

                <div className="ve-ls-section-title">Milestones</div>
                <div className="ve-ls-milestones">
                  {liveSummary.milestones.map((m, i) => (
                    <div key={i} className={`ve-ls-milestone${m.reached ? ' ve-ls-milestone--reached' : ''}`}>
                      <div className={`ve-ls-milestone-icon${m.reached ? ' reached' : ''}`}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M9 2l1.8 3.5 4 .6-2.9 2.8.7 4L9 11.2l-3.6 1.7.7-4L3.2 6.1l4-.6L9 2z"
                            fill={m.reached ? '#fff' : 'none'}
                            stroke={m.reached ? '#fff' : '#C5C8CC'}
                            strokeWidth="1.3" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className={`ve-ls-milestone-text${m.reached ? ' reached' : ''}`}>
                        {m.amount} — {m.label}
                      </span>
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

        {/* ══ Round Overview Sheet (Round click) ══ */}
        {showRoundOverview && (
          <>
            <div className="ve-backdrop" onClick={() => setShowRoundOverview(false)} />
            <div className="ve-sheet ve-ro-sheet">
              <div className="ve-sheet-handle" />

              {/* Title row */}
              <div className="ve-ro-header">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="11" r="9.5" stroke="#2BA7A0" strokeWidth="1.6" />
                  <circle cx="11" cy="11" r="5" stroke="#2BA7A0" strokeWidth="1.6" />
                  <circle cx="11" cy="11" r="1.5" fill="#2BA7A0" />
                </svg>
                <span className="ve-ro-title">Round Overview</span>
              </div>

              {/* Tab indicators + labels */}
              <div className="ve-ro-tab-bars">
                {rounds.map((r, i) => (
                  <div
                    key={i}
                    className={`ve-ro-tab-bar ${activeRoundTab === i ? 'active' : ''}`}
                    onClick={() => setActiveRoundTab(i)}
                  />
                ))}
              </div>
              <div className="ve-ro-tab-labels">
                {rounds.map((r, i) => (
                  <button
                    key={i}
                    className={`ve-ro-tab-label ${activeRoundTab === i ? 'active' : ''}`}
                    onClick={() => setActiveRoundTab(i)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Round card */}
              <div className="ve-ro-card">
                <div className="ve-ro-card-header">
                  <span className="ve-ro-card-title">Round {activeRoundTab + 1}</span>
                  <span className={`ve-ro-badge ve-ro-badge--${activeRound.status}`}>
                    {activeRound.status === 'complete' ? 'complete' : ''}
                    {activeRound.status === 'bidding' ? 'Bidding' : ''}
                    {activeRound.status === 'not-started' ? 'Not yet started' : ''}
                  </span>
                </div>

                <div className="ve-ro-divider" />

                <div className="ve-ro-stats">
                  <div className="ve-ro-stat">
                    <span className="ve-ro-stat-label">Raised</span>
                    <span className="ve-ro-stat-val">{activeRound.raised ?? '--'}</span>
                  </div>
                  <div className="ve-ro-stat">
                    <span className="ve-ro-stat-label">Alerts</span>
                    <span className={`ve-ro-stat-val${activeRound.alerts ? ' ve-ro-stat-val--alert' : ''}`}>
                      {activeRound.alerts ?? '--'}
                    </span>
                  </div>
                  <div className="ve-ro-stat">
                    <span className="ve-ro-stat-label">Groups</span>
                    <span className="ve-ro-stat-val">{activeRound.groups}</span>
                  </div>
                </div>

                <div className="ve-ro-divider" />

                <div className="ve-ro-group-list">
                  {activeRound.groupRows.map((g, i) => (
                    <div key={i} className="ve-ro-group-row">
                      <div className="ve-ro-group-left">
                        <RowStatusIcon status={g.status} />
                        <span className="ve-ro-group-name">{g.name}</span>
                        {g.alert && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M7 1.5L13 12.5H1L7 1.5Z" fill="#F4A43A" />
                            <path d="M7 6v3" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
                            <circle cx="7" cy="10.5" r="0.6" fill="#fff" />
                          </svg>
                        )}
                      </div>
                      <span className="ve-ro-group-detail" style={{ color: g.detailColor ?? '#C5C8CC' }}>
                        {g.detail ?? '–'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ve-sheet-close" onClick={() => setShowRoundOverview(false)}>Close</div>
            </div>
          </>
        )}

        {/* ══ Group Detail Bottom Sheet ══ */}
        {selectedGroup && (
          <>
            <div className="ve-backdrop" onClick={() => setSelectedGroup(null)} />
            <div className="ve-sheet">
              <div className="ve-sheet-handle" />
              <div className="ve-sheet-header">
                <h3 className="ve-sheet-title">{selectedGroup.name}</h3>
                <span className={`ve-sheet-badge ${getGroupBadge(selectedGroup).cls}`}>
                  {getGroupBadge(selectedGroup).label}
                </span>
              </div>
              <div className="ve-donor-list">
                {selectedGroup.donors.map((donor, i) => (
                  <div key={i} className="ve-donor-row">
                    <div className="ve-donor-avatar" style={{ background: donor.color }}>{donor.initial}</div>
                    <div className="ve-donor-info">
                      <span className="ve-donor-name">{donor.name}</span>
                      <span className="ve-donor-sub">{donor.sub}</span>
                    </div>
                    <div className="ve-donor-right">
                      {donor.bid
                        ? <span className="ve-donor-bid">{donor.bid}</span>
                        : <span className="ve-donor-bidding">Bidding...</span>
                      }
                    </div>
                    <span className="ve-donor-remove">⊗</span>
                  </div>
                ))}
              </div>
              <div className="ve-sheet-close" onClick={() => setSelectedGroup(null)}>Close</div>
            </div>
          </>
        )}

      </IonContent>
    </IonPage>
  );
};

export default ViewEvent;