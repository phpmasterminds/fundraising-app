import React, { useEffect, useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { Browser } from '@capacitor/browser';
import { getPaymentSummary, markPaid, PaymentSummary } from '../../services/donorEvents';
import { usePaymentGate } from '../../components/PaymentGate';

/**
 * Standalone payment page — the redirect target for the app-wide PaymentGuard.
 * Reads the donor's matched total from /donor/events/:id/payment and lets them either
 * open the charity donation page (external, untracked) or mark the payment settled
 * offline, which clears the lock and returns them to normal navigation.
 */
const PaymentPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const history = useHistory();
  const { refresh } = usePaymentGate();

  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [paid, setPaid] = useState(false);
  const [paidAt, setPaidAt] = useState<string>('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await getPaymentSummary(id);
        if (alive) setSummary(s);
      } catch {
        /* leave summary null -> error state below */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  /*const openCharity = async () => {
    if (summary?.charity_link) {
      await Browser.open({ url: summary.charity_link });
    }
  };*/
  
	const openCharity = async () => {
		if (summary?.charity_link) {
			let url = summary.charity_link.trim();
			if (!/^https?:\/\//i.test(url)) {
			  url = `https://${url}`;
			}
			await Browser.open({ url });
		}
	};

  const confirmPaid = async () => {
    setMarking(true);
    try {
      await markPaid(id);
      await refresh();               // clears the app-wide lock
      setPaidAt(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
      setPaid(true);                 // show the receipt instead of navigating away
      setMarking(false);
    } catch {
      setMarking(false);
    }
  };

  const alreadyPaid = summary?.payment_status === 'paid';
  const charityName = (summary as any)?.charity_name ?? '—';

  return (
    <IonPage>
      <IonContent fullscreen className="pp-page">
        <div className="pp-wrap">
          <div className="pp-head">
            <span className="pp-event">{summary?.event_name ?? 'Your event'}</span>
            <button className="pp-profile" onClick={() => history.push('/profile')}>Profile</button>
          </div>

          {loading ? (
            <div className="pp-state">Loading your donation…</div>
          ) : !summary ? (
            <div className="pp-state">We couldn't load your payment. Please try again shortly.</div>
          ) : paid ? (
            <div className="pp-rc">
              <div className="pp-rc-hero">
                <div className="pp-rc-check">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <circle cx="20" cy="20" r="18" stroke="#fff" strokeWidth="2.5"/>
                    <path d="M12 20l6 6 12-12" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className="pp-rc-hero-title">Thank You!</h2>
                <p className="pp-rc-hero-sub">Your donation has been confirmed</p>
              </div>

              <div className="pp-rc-card">
                <div className="pp-rc-card-header">
                  <span className="pp-rc-card-title">Donation Receipt</span>
                </div>
                {[
                  { label: 'Amount',    val: `£${Number(summary.total_amount).toLocaleString('en-GB')}`, teal: true },
                  { label: 'Charity',   val: charityName },
                  { label: 'Event',     val: summary.event_name ?? '—' },
                  { label: 'Donor',     val: summary.donor_name ?? '—' },
                  { label: 'Reference', val: summary.reference  ?? '—' },
                  { label: 'Date',      val: paidAt || '—' },
                ].map((r, i) => (
                  <div key={i} className="pp-rc-row">
                    <span className="pp-rc-lbl">{r.label}</span>
                    <span className={`pp-rc-val ${r.teal ? 'pp-rc-teal' : ''}`}>{r.val}</span>
                  </div>
                ))}
                <p className="pp-rc-note">A confirmation email will be sent to your registered address.</p>
              </div>

              <div className="pp-rc-diff">
                <div className="pp-rc-diff-header">
                  <span className="pp-rc-diff-title">You made a difference</span>
                </div>
                <p className="pp-rc-diff-desc">Through peer matching, your £{summary.total_amount} donation helped raise funds for {charityName === '—' ? 'the charity' : charityName}.</p>
              </div>

              <button className="pp-btn pp-btn--teal" onClick={() => history.replace('/devents')}>Back to events</button>
              <div style={{ height: 48 }} />
            </div>
          ) : alreadyPaid ? (
            <div className="pp-hero">
              <div className="pp-heart"><svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4L19 7" stroke="#16837E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
              <p className="pp-thanks">All settled</p>
              <p className="pp-sub">Your donation for this event is recorded.</p>
              <button className="pp-btn pp-btn--teal" onClick={() => history.replace('/devents')}>Back to events</button>
            </div>
          ) : (
            <>
              <div className="pp-hero">
                <div className="pp-heart">
                  <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
                    <path d="M18 28s-12-7.5-12-15a7 7 0 0114 0 7 7 0 0114 0c0 7.5-12 15-16 15z" fill="#fff"/>
                  </svg>
                </div>
                <p className="pp-thanks">Thank you, <strong>{summary.donor_name}</strong></p>
                <p className="pp-sub">The event has concluded. Your total donation is:</p>
                <p className="pp-amount">£{summary.total_amount}</p>
                <p className="pp-ref">Reference: {summary.reference}</p>
              </div>

              {summary.rounds_detail.length > 0 && (
                <div className="pp-card">
                  <p className="pp-card-title">Matched by round</p>
                  {summary.rounds_detail.map((r) => (
                    <div className="pp-row" key={r.round}>
                      <span>Round {r.round}</span>
                      <span className="pp-row-val">£{r.matched}</span>
                    </div>
                  ))}
                  <div className="pp-divider" />
                  <div className="pp-row pp-row--total">
                    <span>Total</span>
                    <span>£{summary.total_amount}</span>
                  </div>
                </div>
              )}

              <div className="pp-note">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#C5C8CC" strokeWidth="1.2"/>
                  <path d="M7 4v3l2 1.5" stroke="#C5C8CC" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <span>Pay on the charity's page, then mark it below so we can record it.</span>
              </div>

              <div className="pp-footer">
                {summary.charity_link && (
                  <button className="pp-btn pp-btn--orange" onClick={openCharity}>
                    Make Payment
                  </button>
                )}
                <button className="pp-btn pp-btn--teal" onClick={confirmPaid} disabled={marking}>
                  {marking ? 'Saving…' : 'Mark as Paid Offline'}
                </button>
              </div>
            </>
          )}
        </div>

        <style>{`
          .pp-page{ --background:#F6F7F9; }
          .pp-wrap{ font-family:'Outfit',sans-serif; padding:18px 18px 40px; max-width:520px; margin:0 auto; }
          .pp-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
          .pp-event{ font-size:14px; font-weight:600; color:#5B6068; }
          .pp-profile{ border:none; background:transparent; color:#16837E; font-family:'Outfit',sans-serif; font-weight:600; font-size:14px; padding:6px 4px; }
          .pp-state{ text-align:center; color:#5B6068; font-size:15px; padding:60px 10px; }
          .pp-hero{ text-align:center; padding:12px 0 20px; }
          .pp-heart{ width:64px; height:64px; border-radius:50%; background:#2BA7A0; display:flex; align-items:center; justify-content:center; margin:0 auto 14px; }
          .pp-thanks{ font-size:20px; font-weight:700; color:#1A1A2E; margin:0 0 6px; }
          .pp-sub{ font-size:14px; color:#5B6068; margin:0 0 10px; }
          .pp-amount{ font-size:40px; font-weight:800; color:#C4811F; margin:4px 0; }
          .pp-ref{ font-size:12px; color:#9AA0A6; letter-spacing:.4px; margin:0; }
          .pp-card{ background:#fff; border-radius:16px; padding:18px; margin-bottom:16px; }
          .pp-card-title{ font-size:13px; font-weight:600; color:#5B6068; margin:0 0 12px; }
          .pp-row{ display:flex; justify-content:space-between; font-size:14px; color:#1A1A2E; padding:6px 0; }
          .pp-row-val{ font-weight:600; }
          .pp-row--total{ font-weight:700; font-size:16px; }
          .pp-divider{ height:1px; background:#ECEEF1; margin:8px 0; }
          .pp-note{ display:flex; gap:8px; align-items:flex-start; font-size:12px; color:#9AA0A6; line-height:1.4; margin-bottom:16px; }
          .pp-note svg{ flex:0 0 auto; margin-top:2px; }
          .pp-footer{ display:flex; flex-direction:column; gap:12px; }
          .pp-btn{ width:100%; border:none; border-radius:65px; padding:15px; font-family:'Outfit',sans-serif; font-weight:600; font-size:15px; }
          .pp-btn--orange{ background:#FCB040; color:#25201D; }
          .pp-btn--teal{ background:#2BA7A0; color:#fff; }
          .pp-btn:disabled{ opacity:.6; }

          .pp-rc{ padding-top:4px; }
          .pp-rc-hero{ text-align:center; padding:16px 0 22px; }
          .pp-rc-check{ width:76px; height:76px; border-radius:50%; background:#2BA7A0; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; }
          .pp-rc-hero-title{ font-size:24px; font-weight:800; color:#1A1A2E; margin:0 0 6px; }
          .pp-rc-hero-sub{ font-size:14px; color:#5B6068; margin:0; }
          .pp-rc-card{ background:#fff; border-radius:16px; padding:18px; margin-bottom:14px; }
          .pp-rc-card-header{ border-bottom:1px solid #ECEEF1; padding-bottom:10px; margin-bottom:6px; }
          .pp-rc-card-title{ font-size:15px; font-weight:700; color:#1A1A2E; }
          .pp-rc-row{ display:flex; justify-content:space-between; align-items:center; gap:12px; padding:9px 0; font-size:14px; }
          .pp-rc-lbl{ color:#5B6068; flex:0 0 auto; }
          .pp-rc-val{ color:#1A1A2E; font-weight:600; text-align:right; word-break:break-word; }
          .pp-rc-teal{ color:#16837E; font-size:18px; font-weight:800; }
          .pp-rc-note{ font-size:12px; color:#9AA0A6; line-height:1.4; margin:12px 0 0; }
          .pp-rc-diff{ background:#fff; border-radius:16px; padding:18px; margin-bottom:18px; }
          .pp-rc-diff-header{ margin-bottom:6px; }
          .pp-rc-diff-title{ font-size:15px; font-weight:700; color:#1A1A2E; }
          .pp-rc-diff-desc{ font-size:13px; color:#5B6068; line-height:1.5; margin:0; }
        `}</style>
      </IonContent>
    </IonPage>
  );
};

export default PaymentPage;