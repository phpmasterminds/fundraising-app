import React from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon,
  IonTitle, IonContent, IonAccordionGroup, IonAccordion, IonItem, IonLabel,
  useIonRouter,
} from '@ionic/react';
import { arrowBack, mailOutline } from 'ionicons/icons';
import './Support.css';

const SUPPORT_EMAIL = 'support@onehive.world';

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How do I join a fundraising event?',
    a: "Tap Join, then scan the event's QR code or enter the event code shared by the host. You'll see the campaign details before you donate.",
  },
  {
    q: 'Why does the app ask for camera access?',
    a: 'The camera is used only to scan fundraising QR codes so you can open a campaign and view its details before making a donation. You can also join by typing the event code. To change this permission, go to your device Settings > OneHive > Camera.',
  },
  {
    q: 'How does bidding and grouping work?',
    a: "Events run in rounds. In each round donors are placed into groups and place bids, and the matched donation amount is calculated from the group's minimum bid. The host controls when rounds start and end.",
  },
  {
    q: 'My payment failed or I was charged twice.',
    a: 'Wait a few minutes and check your event history first. If the problem continues, email us with the event name, date and payment reference so we can look into it.',
  },
  {
    q: 'I forgot my password.',
    a: 'On the login screen tap "Forgot password" and follow the emailed reset link. Check your spam folder if it does not arrive.',
  },
  {
    q: 'I was signed out unexpectedly.',
    a: 'For security, only one active session is allowed per account. Signing in on another device signs you out of the previous one.',
  },
  {
    q: 'How do I become a host?',
    a: "Host accounts are created by the OneHive admin team. Email us with your organisation details and we'll set you up.",
  },
];

const Support: React.FC = () => {
  const router = useIonRouter();

  const goBack = () => {
    if (router.canGoBack()) router.goBack();
    else router.push('/join', 'root', 'replace');
  };

  return (
    <IonPage>
      <IonHeader className="support-header ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={goBack} aria-label="Back">
              <IonIcon icon={arrowBack} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Support</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="support-content">
        <div className="support-hero">
          <h1>How can we help?</h1>
          <p>Help with joining events, bidding, payments and your account.</p>
        </div>

        <div className="support-wrap">
          <section className="support-card">
            <h2>Contact us</h2>
            <p>
              Can't find an answer below? Email us and we'll get back to you,
              usually within 1–2 business days.
            </p>
            <a
              className="support-btn"
              href={`mailto:${SUPPORT_EMAIL}?subject=OneHive%20Support`}
            >
              <IonIcon icon={mailOutline} />
              {SUPPORT_EMAIL}
            </a>
            <p className="support-note">
              Please include your registered email, your device and a short
              description or screenshot of the issue.
            </p>
          </section>

          <section className="support-card">
            <h2>Frequently asked questions</h2>
            <IonAccordionGroup className="support-accordion">
              {FAQS.map((f, i) => (
                <IonAccordion key={i} value={`faq-${i}`}>
                  <IonItem slot="header" lines="none">
                    <IonLabel className="ion-text-wrap">{f.q}</IonLabel>
                  </IonItem>
                  <div slot="content" className="support-answer">{f.a}</div>
                </IonAccordion>
              ))}
            </IonAccordionGroup>
          </section>

          <section className="support-card">
            <h2>Account and data requests</h2>
            <p>
              To request deletion of your account or a copy of your data, email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from your
              registered address.
            </p>
          </section>

          <p className="support-footer">
            <a href="/privacy-policy">Privacy Policy</a>
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Support;
