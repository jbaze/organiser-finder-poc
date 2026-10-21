import { normaliseEmail } from "./normalise";
import type { Campaign, Contact, Organiser, Product, SuppressionEntry } from "./types";

export type SkipReason = "suppressed" | "invalid_email" | "no_contact" | "no_campaign";

export const SKIP_REASON_LABEL: Record<SkipReason, string> = {
  suppressed: "Email is on the suppression list",
  invalid_email: "Email failed verification (invalid)",
  no_contact: "No contact email found",
  no_campaign: "No product/campaign mapped to this organiser type",
};

export interface PushItem {
  organiser: Organiser;
  contact: Contact;
  product: Product;
  campaign: Campaign;
  /** Risky emails are pushed but flagged. */
  risky: boolean;
}

export interface SkippedItem {
  organiser: Organiser;
  email: string | null;
  reason: SkipReason;
}

export interface PushPlan {
  toPush: PushItem[];
  skipped: SkippedItem[];
}

export function productForType(organiser: Organiser, products: Product[]): Product | undefined {
  return products.find((p) => p.audienceTypes.includes(organiser.type));
}

export function primaryContact(organiser: Organiser): Contact | undefined {
  return organiser.contacts.find((c) => c.isPrimary) ?? organiser.contacts[0];
}

/**
 * Decides which approved, not-yet-pushed organisers go to Instantly.
 * Suppressed and invalid emails are always excluded, with a reason.
 */
export function planPush(
  organisers: Organiser[],
  products: Product[],
  campaigns: Campaign[],
  suppression: SuppressionEntry[],
): PushPlan {
  const suppressed = new Set(suppression.map((s) => normaliseEmail(s.email)));
  const plan: PushPlan = { toPush: [], skipped: [] };

  for (const organiser of organisers) {
    if (organiser.reviewStatus !== "approved" || organiser.outreachStatus !== "not_pushed") continue;

    const contact = primaryContact(organiser);
    if (!contact || !contact.email) {
      plan.skipped.push({ organiser, email: null, reason: "no_contact" });
      continue;
    }
    if (suppressed.has(normaliseEmail(contact.email))) {
      plan.skipped.push({ organiser, email: contact.email, reason: "suppressed" });
      continue;
    }
    if (contact.verification === "invalid") {
      plan.skipped.push({ organiser, email: contact.email, reason: "invalid_email" });
      continue;
    }
    const product = productForType(organiser, products);
    const campaign = product && campaigns.find((c) => c.id === product.campaignId);
    if (!product || !campaign) {
      plan.skipped.push({ organiser, email: contact.email, reason: "no_campaign" });
      continue;
    }
    plan.toPush.push({ organiser, contact, product, campaign, risky: contact.verification === "risky" });
  }

  return plan;
}
