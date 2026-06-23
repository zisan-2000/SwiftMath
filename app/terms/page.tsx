import type { Metadata } from "next";

import { APP_NAME } from "@/lib/constants";
import {
  LegalDocument,
  LegalSection,
} from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms governing use of the ${APP_NAME} platform.`,
};

const LAST_UPDATED = "23 June 2026";

/**
 * Public terms of service template (Phase 2.8). Review with legal counsel before
 * production launch.
 */
export default function TermsOfServicePage() {
  return (
    <LegalDocument title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <LegalSection title="1. Acceptance">
        <p>
          By accessing or using {APP_NAME}, you agree to these Terms of Service.
          If you do not agree, do not use the platform. If you are using the
          service on behalf of an institute, you confirm that you have authority
          to bind that organisation.
        </p>
      </LegalSection>

      <LegalSection title="2. The service">
        <p>
          {APP_NAME} is a web-based practice platform for mental arithmetic and
          abacus training. Features include timed practice sessions, level-based
          curriculum, teacher group management, institute analytics, and
          multi-tenant white-label branding. We may update features from time to
          time.
        </p>
      </LegalSection>

      <LegalSection title="3. Accounts">
        <p>
          Accounts are created by institute administrators and teachers — not via
          public self-registration. You are responsible for maintaining the
          confidentiality of your password and for all activity under your
          account. Notify your institute admin immediately if you suspect
          unauthorised access.
        </p>
      </LegalSection>

      <LegalSection title="4. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Attempt to cheat, manipulate timers, scores, or rankings (including
            automated scripts or sharing answers during timed attempts).
          </li>
          <li>
            Access data belonging to another institute or user without
            authorisation.
          </li>
          <li>
            Reverse engineer, disrupt, or overload the service.
          </li>
          <li>Use the platform for any unlawful purpose.</li>
        </ul>
        <p>
          We may investigate suspicious activity and suspend accounts that violate
          these rules. Practice anomaly signals may be logged server-side for
          review.
        </p>
      </LegalSection>

      <LegalSection title="5. Intellectual property">
        <p>
          The platform software, design, and documentation are owned by us or our
          licensors. Your institute may display its own name and logo within the
          white-label areas you configure. Practice content generated during
          sessions is used solely to operate the service for your institute.
        </p>
      </LegalSection>

      <LegalSection title="6. Disclaimers">
        <p>
          The service is provided &quot;as is&quot; and &quot;as available&quot;.
          We do not guarantee uninterrupted access or that practice results alone
          guarantee educational outcomes. Institutes remain responsible for their
          teaching programmes and student supervision.
        </p>
      </LegalSection>

      <LegalSection title="7. Limitation of liability">
        <p>
          To the fullest extent permitted by law, we are not liable for indirect,
          incidental, or consequential damages arising from use of the platform.
          Our total liability for any claim relating to the service is limited to
          the fees paid by your institute for the service in the twelve months
          before the claim (or zero if the service is provided without charge).
        </p>
      </LegalSection>

      <LegalSection title="8. Changes">
        <p>
          We may update these Terms from time to time. Material changes will be
          posted on this page with an updated date. Continued use after changes
          take effect constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p>
          Questions about these Terms? Contact your institute administrator or
          email{" "}
          <a
            href="mailto:legal@seft.test"
            className="text-primary underline-offset-4 hover:underline"
          >
            legal@seft.test
          </a>{" "}
          (replace with your production contact before launch).
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
