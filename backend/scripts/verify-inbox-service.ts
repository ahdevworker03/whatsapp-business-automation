/**
 * ONE-OFF VERIFICATION SCRIPT — not part of the app, delete after use.
 * Exercises inbox.service.ts's replyToConversation() guards directly against
 * the real dev database: the 24-hour customer-service-window check, and the
 * CLOSED-conversation check added alongside it (verification findings doc
 * 2026-09-16, item 15 — a CLOSED conversation still inside its window used
 * to reach the Meta call instead of being rejected).
 *
 * Does not verify an actual successful Meta send — this dev environment's
 * WhatsApp Business number is unpublished and Meta-allow-list-restricted, so
 * the one case where every guard correctly passes (ACTIVE, within window)
 * is expected to reach metaClient.ts and fail only there (MetaApiError),
 * mirroring verify-messages-service.ts's established pattern for this.
 */
import { prisma } from "../src/prisma/client";
import * as inboxService from "../src/services/inbox.service";
import { MetaApiError } from "../src/lib/metaClient";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

const HOUR_MS = 60 * 60 * 1000;

async function main() {
  console.log("Seeding a lead + conversation fixture...");
  const campaign = await prisma.campaign.findFirst({ orderBy: { createdAt: "asc" } });
  assert(campaign, "expected a seeded campaign to exist (see M2 Step 5)");

  const lead = await prisma.lead.create({
    data: { phone: "+15550004001", name: "Inbox Reply Guard Verify", status: "REPLIED" },
  });
  const conversation = await prisma.conversation.create({
    data: { leadId: lead.id, status: "ACTIVE", lastMessageAt: new Date() },
  });

  async function setLastInbound(hoursAgo: number) {
    await prisma.message.deleteMany({ where: { leadId: lead.id, direction: "INBOUND" } });
    await prisma.message.create({
      data: {
        leadId: lead.id,
        campaignId: campaign!.id,
        direction: "INBOUND",
        type: "TEXT",
        content: "fixture inbound",
        status: "RECEIVED",
        createdAt: new Date(Date.now() - hoursAgo * HOUR_MS),
      },
    });
  }

  try {
    console.log("1. replyToConversation() on a non-existent id throws ConversationNotFoundError...");
    try {
      await inboxService.replyToConversation("00000000-0000-0000-0000-000000000000", "hi");
      throw new Error("expected replyToConversation to throw for a non-existent id");
    } catch (error) {
      assert(
        error instanceof inboxService.ConversationNotFoundError,
        `expected ConversationNotFoundError, got ${error}`
      );
    }

    console.log("2. ACTIVE + outside the 24h window throws OutsideCustomerServiceWindowError...");
    await setLastInbound(30);
    try {
      await inboxService.replyToConversation(conversation.id, "hi");
      throw new Error("expected replyToConversation to throw outside the window");
    } catch (error) {
      assert(
        error instanceof inboxService.OutsideCustomerServiceWindowError,
        `expected OutsideCustomerServiceWindowError, got ${error}`
      );
    }

    console.log(
      "3. CLOSED + inside the 24h window throws ConversationClosedError — the bug this fixes (CLOSED used to be ignored, and this state would previously reach the Meta call)..."
    );
    await setLastInbound(1);
    await prisma.conversation.update({ where: { id: conversation.id }, data: { status: "CLOSED" } });
    try {
      await inboxService.replyToConversation(conversation.id, "hi");
      throw new Error("expected replyToConversation to throw for a CLOSED conversation still inside its window");
    } catch (error) {
      assert(
        error instanceof inboxService.ConversationClosedError,
        `expected ConversationClosedError, got ${error}`
      );
    }

    console.log("4. CLOSED + outside the window still throws ConversationClosedError (no regression — CLOSED wins)...");
    await setLastInbound(30);
    try {
      await inboxService.replyToConversation(conversation.id, "hi");
      throw new Error("expected replyToConversation to throw for a CLOSED conversation outside its window");
    } catch (error) {
      assert(
        error instanceof inboxService.ConversationClosedError,
        `expected ConversationClosedError (checked ahead of the window), got ${error}`
      );
    }

    console.log("5. ACTIVE + inside the window is unaffected: all guards pass, reaches the Meta call...");
    await setLastInbound(1);
    await prisma.conversation.update({ where: { id: conversation.id }, data: { status: "ACTIVE" } });
    try {
      await inboxService.replyToConversation(conversation.id, "hi");
      console.log(
        "   NOTE: the send actually succeeded (this dev number must be allow-listed) — not the expected-failure path this script assumes."
      );
    } catch (error) {
      assert(
        error instanceof MetaApiError,
        `expected the failure to surface as MetaApiError once every guard passes, got ${error}`
      );
      console.log(`   confirmed: failed only at the Meta call itself — ${error.message}`);
    }

    console.log("\nAll direct-call checks passed.");
  } finally {
    console.log("\nCleaning up rows created by this script...");
    await prisma.message.deleteMany({ where: { leadId: lead.id } });
    await prisma.conversation.deleteMany({ where: { id: conversation.id } });
    await prisma.lead.deleteMany({ where: { id: lead.id } });
  }
}

main()
  .catch((error) => {
    console.error("\nVERIFICATION FAILED:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
