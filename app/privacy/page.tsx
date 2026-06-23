import type { Metadata } from "next";

import { APP_NAME } from "@/lib/constants";
import {
  LegalDocument,
  LegalSection,
} from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${APP_NAME} collects, uses, and protects personal information.`,
};

const LAST_UPDATED = "23 June 2026";

/**
 * Public privacy policy template (Phase 2.8). Institutes should review with
 * their own legal counsel before production launch.
 */
export default function PrivacyPolicyPage() {
  return (
    <LegalDocument title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <LegalSection title="1. Introduction">
        <p>
          {APP_NAME} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) provides a
          multi-institute mental-math and abacus practice platform for schools and
          training centres. This policy explains what personal information we
          process when you use the service and how we protect it.
        </p>
        <p>
          Each institute using the platform is a separate tenant. Your institute
          admin provisions accounts; there is no public student sign-up in Phase 1.
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <p>We collect and store the following categories of data:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Account data</strong> — name,
            email address, role (student, teacher, admin), and institute
            membership.
          </li>
          <li>
            <strong className="text-foreground">Practice data</strong> — timed
            and review practice sessions, questions attempted, scores, accuracy,
            pass/fail results, and level progression. Timing and grading are
            computed on our servers.
          </li>
          <li>
            <strong className="text-foreground">Technical data</strong> — sign-in
            sessions, IP address, and browser user-agent as recorded by our
            authentication provider for security purposes.
          </li>
          <li>
            <strong className="text-foreground">Institute branding</strong> —
            optional institute name, tagline, and logo URL supplied by your
            institute admin.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How we use information">
        <p>We use personal information to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide and operate the practice platform for your institute.</li>
          <li>
            Display progress, rankings, and analytics to authorised teachers and
            admins within your institute.
          </li>
          <li>Authenticate users and protect accounts from unauthorised access.</li>
          <li>Improve reliability, security, and product quality.</li>
        </ul>
        <p>
          We do not sell personal information. We do not use student data for
          third-party advertising.
        </p>
      </LegalSection>

      <LegalSection title="4. Institute responsibilities">
        <p>
          Your institute admin and teachers control who receives an account and
          which group and practice level a student is assigned. Institutes are
          responsible for providing accurate account information and for
          communicating with students and parents under applicable local law.
        </p>
      </LegalSection>

      <LegalSection title="5. Data retention">
        <p>
          We retain account and practice records while your institute maintains an
          active account and as needed to provide the service. When an institute
          or user is disabled, access is blocked but historical practice data may
          be retained for reporting unless deletion is requested by the institute
          admin or required by law.
        </p>
      </LegalSection>

      <LegalSection title="6. Security">
        <p>
          We use industry-standard measures including encrypted connections (HTTPS),
          hashed passwords, server-side scoring, and role-based access controls
          scoped by institute. No system is completely secure; please use a strong
          password and keep your credentials confidential.
        </p>
      </LegalSection>

      <LegalSection title="7. Your rights">
        <p>
          Depending on your location, you may have rights to access, correct, or
          delete your personal information. Students and teachers should contact
          their institute admin first. Platform operators can be reached using the
          contact details below.
        </p>
      </LegalSection>

      <LegalSection title="8. Contact">
        <p>
          For privacy questions about {APP_NAME}, contact your institute
          administrator or email{" "}
          <a
            href="mailto:privacy@seft.test"
            className="text-primary underline-offset-4 hover:underline"
          >
            privacy@seft.test
          </a>{" "}
          (replace with your production contact before launch).
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
