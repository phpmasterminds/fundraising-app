import { IonPage, IonContent } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import './PrivacyPolicy.css';
import HostHeader from '../../../components/HostHeader';

/**
 * Route: /privacy-policy  →  https://app.onehive.world/privacy-policy
 * Content sourced from https://onehive.ai/policy-detail/privacy-policy
 *
 * Wire-up (add to your router, e.g. App.tsx):
 *   <Route path="/privacy-policy" component={PrivacyPolicy} exact />
 *
 * Uses the shared HostHeader ('back' variant) so the header matches
 * CreateEvent / ViewEvent / HostProfile etc. exactly.
 */

const PrivacyPolicy: React.FC = () => {
  const router = useIonRouter();

  return (
    <IonPage>
      <IonContent fullscreen className="privacy-page">
        <div className="container">

          {/* ── Shared Header ── */}
          <HostHeader
            variant="back"
            title="Privacy Policy"
            onBack={() => router.back()}
          />

          <div className="privacy-card">
            <section>
              <h2>1. Important Information and Who We Are</h2>
              <p>
                This privacy policy sets out how OneHive (referred to as the
                &ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
                &ldquo;our&rdquo; in this privacy policy) collects and uses your
                personal data derived from your use of this app and website
                (the &ldquo;Website&rdquo;), the provision of services
                facilitated by the Company and any related marketing or events
                (collectively the &ldquo;Services&rdquo;).
              </p>
              <p>
                We take protection of your privacy very seriously. In this
                privacy policy, we seek to explain to you with clarity, what
                information we collect, how we use it and what rights you have
                in relation to it. Please take some time to read through it
                carefully.
              </p>
            </section>

            <section>
              <h2>2. Types of Personal Data We Collect About You</h2>
              <p>
                <em>In sum: we collect information about you that you provide
                to us.</em>
              </p>
              <p>
                Personal data means any information about an individual from
                which that person can be identified. We may collect, use,
                store and transfer different kinds of personal data about you,
                grouped as follows:
              </p>
              <ul>
                <li>
                  <strong>Identity Data</strong> — first name, last name, any
                  previous names, username or similar identifier, marital
                  status, title, date of birth and gender.
                </li>
                <li>
                  <strong>Contact Data</strong> — billing address, delivery
                  address, email address and telephone numbers.
                </li>
                <li>
                  <strong>Financial Data</strong> — bank account and payment
                  card details.
                </li>
                <li>
                  <strong>Transaction Data</strong> — details about payments to
                  and from you and other details of services you have
                  purchased from us.
                </li>
                <li>
                  <strong>Technical Data</strong> — IP address, login data,
                  browser type and version, time zone setting and location,
                  browser plug-in types and versions, operating system and
                  platform, device ID and other technology on the devices you
                  use to access the Website.
                </li>
                <li>
                  <strong>Profile Data</strong> — your username and password,
                  purchases made by you, your interests, preferences, feedback
                  and survey responses.
                </li>
                <li>
                  <strong>Usage Data</strong> — information about how you
                  interact with and use the Website and Services.
                </li>
                <li>
                  <strong>Marketing and Communications Data</strong> — your
                  preferences in receiving marketing from us and our third
                  parties and your communication preferences.
                </li>
                <li>
                  <strong>Social Media Login Data</strong> — details of the
                  social media platform (such as Facebook or LinkedIn), account
                  and profile details used when registering with the Website,
                  as applicable.
                </li>
              </ul>
              <p>
                We do not control, and are not responsible for, other uses of
                your personal information by your third-party social media
                provider. We recommend reviewing the privacy notices of each
                provider you use.
              </p>
              <p>
                We also collect, use and share aggregated data such as
                statistical or demographic data which is not personal data, as
                it does not directly or indirectly reveal your identity — for
                example, to analyse general trends in how users interact with
                the Website.
              </p>
            </section>

            <section>
              <h2>3. How Is Your Personal Data Collected?</h2>
              <p>We use different methods to collect data from and about you, including through:</p>
              <p>
                <strong>Your interactions with us.</strong> You may give us
                your personal data by filling in online forms or by
                corresponding with us by post, phone, email or otherwise,
                including when you create an account, request our Services,
                subscribe to publications, request marketing, enter a
                competition or survey, or give us feedback or contact us.
              </p>
              <p>
                <strong>Automated technologies or interactions.</strong> As you
                interact with the Website, we automatically collect Technical
                Data about your equipment, browsing actions and patterns using
                cookies, server logs and similar technologies.
              </p>
              <p>
                <strong>Third parties or publicly available sources.</strong>{' '}
                Technical Data may be collected from advertising networks;
                Contact, Financial and Transaction Data from providers of
                technical, payment and delivery services; and Identity/Contact
                Data from background-check providers, where applicable.
              </p>
            </section>

            <section>
              <h2>4. How We Use Your Personal Data</h2>
              <p>
                <em>In sum: we must have a legal basis to use the personal
                data you provide to us.</em>
              </p>
              <p>We rely on one or more of the following legal bases:</p>
              <ul>
                <li>
                  <strong>Performance of a contract</strong> with you.
                </li>
                <li>
                  <strong>Legitimate interests</strong> — to conduct our
                  business, prevent fraud and give you the best and most
                  secure experience, balanced against your rights.
                </li>
                <li>
                  <strong>Legal obligation</strong> — where necessary for
                  compliance with applicable law.
                </li>
                <li>
                  <strong>Consent</strong> — where you have actively agreed,
                  for example to receive marketing communications.
                </li>
              </ul>
              <p>
                We use your data to create and manage your account, deliver
                the Services (including processing payments and managing
                bookings), manage our relationship with you, administer and
                protect our platform, improve the Website and Services through
                data analytics, and — where you have consented — send you
                relevant marketing communications.
              </p>
              <p>
                You can opt out of marketing communications at any time by
                following the opt-out link in any marketing message or by
                contacting us; you will still receive essential
                service-related communications.
              </p>
            </section>

            <section>
              <h2>5. Disclosures of Your Personal Data</h2>
              <p>
                We may share your personal data where necessary with our
                payment processors and service providers, and with third
                parties in connection with a sale, transfer or merger of parts
                of our business or assets. We require all third parties to
                respect the security of your personal data and to treat it in
                accordance with the law, and we only permit them to process it
                for specified purposes on our instructions.
              </p>
            </section>

            <section>
              <h2>6. International Transfers</h2>
              <p>
                Where your personal data is transferred outside of your home
                jurisdiction, we ensure a similar degree of protection is
                afforded to it by using appropriate safeguards.
              </p>
            </section>

            <section>
              <h2>7. Data Security</h2>
              <p>
                We have put in place appropriate security measures to prevent
                your personal data from being accidentally lost, used or
                accessed in an unauthorised way, altered or disclosed. We
                limit access to your personal data to those employees, agents,
                contractors and third parties who have a business need to
                know, and we have procedures in place to deal with any
                suspected data breach.
              </p>
            </section>

            <section>
              <h2>8. Data Retention</h2>
              <p>
                We only retain your personal data for as long as reasonably
                necessary to fulfil the purposes we collected it for,
                including to satisfy any legal, regulatory, tax, accounting or
                reporting requirements. In some circumstances we will
                anonymise your data for research or statistical purposes, in
                which case we may use it indefinitely without further notice
                to you.
              </p>
            </section>

            <section>
              <h2>9. Your Legal Rights</h2>
              <p>Subject to applicable law, you have the right to:</p>
              <ul>
                <li>Request access to your personal data.</li>
                <li>Request correction of your personal data.</li>
                <li>Request erasure of your personal data.</li>
                <li>Object to processing based on legitimate interests.</li>
                <li>Request restriction of processing.</li>
                <li>Request transfer of your personal data.</li>
                <li>Withdraw consent at any time, where processing is based on consent.</li>
              </ul>
              <p>
                To exercise any of these rights, please contact us using the
                details in Section 10. You will not usually have to pay a fee,
                though we may charge a reasonable fee for requests that are
                unfounded, repetitive or excessive. We aim to respond to all
                legitimate requests within one month.
              </p>
            </section>

            <section>
              <h2>10. Contact Details</h2>
              <p>
                If you have any questions about this privacy policy or the use
                of your personal data, or wish to exercise your privacy
                rights, please contact us at:{' '}
                <a href="mailto:info@onehive.ai">info@onehive.ai</a>
              </p>
            </section>

            <section>
              <h2>11. Complaints</h2>
              <p>
                You have the right to make a complaint at any time to your
                local data protection regulator. We would, however, appreciate
                the chance to address your concerns before you approach a
                regulator, so please contact us in the first instance.
              </p>
            </section>

            <section>
              <h2>12. Changes to This Privacy Policy</h2>
              <p>
                We keep our privacy policy under regular review. It is
                important that the personal data we hold about you is
                accurate and current — please keep us informed if your details
                change.
              </p>
            </section>

            <section>
              <h2>13. Third-Party Links</h2>
              <p>
                The Website may include links to third-party websites,
                plug-ins and applications. Clicking on those links or enabling
                those connections may allow third parties to collect or share
                data about you. We do not control these third-party websites
                and are not responsible for their privacy practices. We
                encourage you to read the privacy policy of every website you
                visit.
              </p>
            </section>

            <p className="privacy-updated">Last updated: September 2026</p>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default PrivacyPolicy;