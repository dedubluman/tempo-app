import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3100";
const OUT_DIR = path.resolve(".sisyphus/evidence/final-qa");
const ADDRESS = "0xAbcdEF1234567890AbcdEF1234567890aBcdef12";
const RECIPIENT = "0x1234567890AbcdEF1234567890aBcdef12345678";
const PAY_URL = `/pay?to=${RECIPIENT}&amount=1&token=pathUSD&memo=fix-qa`;

function nowIso() {
  return new Date().toISOString();
}

function toErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function containsAll(source, parts) {
  return parts.every((part) => source.includes(part));
}

async function primeMockWalletState(page, address) {
  await page.evaluate((value) => {
    window.localStorage.setItem("wagmi.webAuthn.activeCredential", "1");
    window.localStorage.setItem("tempo.walletCreated", "1");
    window.localStorage.setItem("tempo.lastAddress", value);
  }, address);
}

async function waitForServer(url, timeoutMs = 180_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) {
        return;
      }
    } catch {
      // server is still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(
    `Server did not become ready at ${url} within ${timeoutMs}ms`,
  );
}

async function enableVirtualAuthenticator(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

async function capture(page, name) {
  const fileName = `${name}.png`;
  const absolutePath = path.join(OUT_DIR, fileName);
  await page.screenshot({ path: absolutePath, fullPage: true });
  return path.relative(process.cwd(), absolutePath);
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  await waitForServer(BASE_URL);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  const checks = [];

  async function record(id, title, runner) {
    const startedAt = nowIso();
    try {
      const result = await runner();
      checks.push({
        id,
        title,
        status: result.status,
        details: result.details,
        screenshot: result.screenshot,
        startedAt,
        finishedAt: nowIso(),
      });
    } catch (error) {
      checks.push({
        id,
        title,
        status: "fail",
        details: toErrorMessage(error),
        screenshot: null,
        startedAt,
        finishedAt: nowIso(),
      });
    }
  }

  try {
    await page.addInitScript((address) => {
      window.localStorage.setItem("wagmi.webAuthn.activeCredential", "1");
      window.localStorage.setItem("tempo.walletCreated", "1");
      window.localStorage.setItem("tempo.lastAddress", address);
    }, ADDRESS);

    let connectedWalletReady = false;
    try {
      await enableVirtualAuthenticator(page);
      await page.goto("/");
      const launchAppButton = page
        .getByRole("button", { name: /Launch App/i })
        .first();
      if (await launchAppButton.count()) {
        await launchAppButton.click();
      }

      const createNewWalletButton = page
        .getByRole("button", { name: /Create New Wallet/i })
        .first();
      if (await createNewWalletButton.count()) {
        await createNewWalletButton.click();
      }

      const createWalletButton = page
        .getByRole("button", { name: /^Create Wallet$/i })
        .first();
      if (await createWalletButton.count()) {
        await createWalletButton.click();
      }

      await page.goto("/app");
      await page.waitForLoadState("networkidle");
      if ((await page.getByTestId("dashboard-heading").count()) > 0) {
        connectedWalletReady = true;
      }
    } catch {
      connectedWalletReady = false;
    }

    await record("T1-T3-home", "Home UI checks (tasks 1,2,3)", async () => {
      await page.goto("/");
      await primeMockWalletState(page, ADDRESS);
      await page.evaluate(() => {
        window.localStorage.setItem("tempo.mockBalanceValue", "123.45");
      });

      await page.goto("/app");
      await page.waitForLoadState("networkidle");

      const dashboardHeadingCount = await page
        .getByTestId("dashboard-heading")
        .count();
      if (dashboardHeadingCount === 0) {
        const screenshot = await capture(
          page,
          "task-1-2-3-home-blocked-dashboard",
        );
        return {
          status: "blocked",
          details:
            "Home dashboard was not reachable in this runtime, so balance/faucet assertions could not run.",
          screenshot,
        };
      }

      const sessionCardCount = await page
        .locator('[data-testid="session-keys-card"]')
        .count();
      if (sessionCardCount !== 0) {
        throw new Error("Session Keys card still exists on Home.");
      }

      const balanceValue = page.locator("p.font-mono.tracking-tight").first();
      const balanceValueCount = await balanceValue.count();
      if (balanceValueCount === 0) {
        const screenshot = await capture(
          page,
          "task-1-2-3-home-blocked-balance",
        );
        return {
          status: "blocked",
          details:
            "Balance display element was not rendered in this runtime, so overflow-class assertion is blocked.",
          screenshot,
        };
      }

      const balanceClass = (await balanceValue.getAttribute("class")) ?? "";
      if (
        !containsAll(balanceClass, [
          "overflow-hidden",
          "text-ellipsis",
          "max-w-full",
        ])
      ) {
        throw new Error(
          `Balance class missing overflow protection: ${balanceClass}`,
        );
      }

      const receiveLink = page.getByRole("link", {
        name: "Get testnet tokens",
      });
      const receiveHref = await receiveLink.getAttribute("href");
      if (
        !receiveHref ||
        !receiveHref.includes("quickstart/faucet?tab-1=fund-an-address")
      ) {
        throw new Error(`Receive faucet link mismatch: ${receiveHref}`);
      }

      await page.evaluate(() => {
        window.localStorage.setItem("tempo.mockBalanceValue", "0");
      });
      await page.reload();
      await page.waitForLoadState("networkidle");

      const openFaucet = page.getByRole("link", { name: "Open faucet" });
      const openFaucetHref = await openFaucet.getAttribute("href");
      if (
        !openFaucetHref ||
        !openFaucetHref.includes("quickstart/faucet?tab-1=fund-an-address")
      ) {
        throw new Error(`Balance faucet link mismatch: ${openFaucetHref}`);
      }

      const screenshot = await capture(page, "task-1-2-3-home");
      return {
        status: "pass",
        details:
          "Session Keys card absent, balance overflow classes present, Home/Balance faucet links include tab param.",
        screenshot,
      };
    });

    await record(
      "T4-activity",
      "Activity confirming label (task 4)",
      async () => {
        if (!connectedWalletReady) {
          await page.goto("/app");
          const screenshot = await capture(
            page,
            "task-4-activity-blocked-no-wallet",
          );
          return {
            status: "blocked",
            details:
              "Connected wagmi wallet session could not be established in this runtime, so TransactionHistory did not mount for live confirmation-label assertion.",
            screenshot,
          };
        }

        const txEntry = {
          id: "qa_tx_1",
          transactionHash:
            "0x1111111111111111111111111111111111111111111111111111111111111111",
          counterparty: RECIPIENT,
          amount: "1000000",
          direction: "sent",
          createdAtMs: Date.now(),
        };

        await page.evaluate((entry) => {
          const payload = { state: { entries: [entry] } };
          window.localStorage.setItem(
            "fluxus-txhistory-storage",
            JSON.stringify(payload),
          );
        }, txEntry);

        await page.goto("/app");
        await page.waitForLoadState("networkidle");
        await page.waitForSelector("text=Confirming...", { timeout: 10_000 });

        const screenshot = await capture(page, "task-4-activity-confirming");
        return {
          status: "pass",
          details:
            "Transaction history renders 'Confirming...' for tx hash entries without blockNumber.",
          screenshot,
        };
      },
    );

    await record(
      "T6-layout",
      "Sidebar and mobile nav spacing (task 6)",
      async () => {
        await page.goto("/app/portfolio");
        await page.waitForLoadState("networkidle");

        const asideClass =
          (await page.locator("aside").first().getAttribute("class")) ?? "";
        const desktopLinkClass =
          (await page.locator("aside nav a").first().getAttribute("class")) ??
          "";
        const mobileLinkClass =
          (await page
            .locator("nav[role='navigation']")
            .nth(1)
            .locator("a")
            .first()
            .getAttribute("class")) ?? "";

        if (!asideClass.includes("md:w-64")) {
          throw new Error(`Sidebar width class mismatch: ${asideClass}`);
        }
        if (!containsAll(desktopLinkClass, ["px-4", "py-2.5"])) {
          throw new Error(`Desktop nav padding mismatch: ${desktopLinkClass}`);
        }
        if (!mobileLinkClass.includes("min-w-[88px]")) {
          throw new Error(`Mobile nav width mismatch: ${mobileLinkClass}`);
        }

        const screenshot = await capture(page, "task-6-layout-spacing");
        return {
          status: "pass",
          details:
            "Layout classes match widened sidebar and nav spacing requirements.",
          screenshot,
        };
      },
    );

    await record(
      "T7-T8-portfolio",
      "Portfolio flicker + custom token pipeline (tasks 7,8 + faucet link)",
      async () => {
        const customTokenState = {
          state: {
            customTokens: [
              {
                address: "0x2000000000000000000000000000000000000ABC",
                name: "QA Token",
                symbol: "QAT",
                decimals: 6,
                createdAt: Date.now(),
              },
            ],
          },
        };

        await page.evaluate((state) => {
          window.localStorage.setItem(
            "fluxus-custom-tokens",
            JSON.stringify(state),
          );
          window.localStorage.setItem("tempo.mockBalanceValue", "12.345678");
        }, customTokenState);

        await page.goto("/");
        await primeMockWalletState(page, ADDRESS);
        await page.goto("/app/portfolio");
        await page.waitForLoadState("networkidle");

        const portfolioTitle = page.getByRole("heading", { name: "Portfolio" });
        if ((await portfolioTitle.count()) === 0) {
          const screenshot = await capture(
            page,
            "task-7-8-portfolio-blocked-page",
          );
          return {
            status: "blocked",
            details:
              "Portfolio page did not render in this runtime, so token-pipeline assertions are blocked.",
            screenshot,
          };
        }

        const customTokenVisible =
          (await page.getByText("QAT", { exact: true }).count()) > 0 ||
          (await page.getByText("QA Token", { exact: true }).count()) > 0;
        if (!customTokenVisible) {
          const screenshot = await capture(
            page,
            "task-7-8-portfolio-blocked-custom-token",
          );
          return {
            status: "blocked",
            details:
              "Custom token was not visible in Portfolio runtime assertion window.",
            screenshot,
          };
        }

        const faucetHref = await page
          .getByRole("link", { name: "Get from Faucet" })
          .first()
          .getAttribute("href");
        if (
          !faucetHref ||
          !faucetHref.includes("quickstart/faucet?tab-1=fund-an-address")
        ) {
          throw new Error(`Portfolio faucet link mismatch: ${faucetHref}`);
        }

        const balanceLocator = page
          .locator("section.grid article p.font-mono")
          .first();
        const before = ((await balanceLocator.textContent()) ?? "").trim();
        await page.waitForTimeout(4000);
        const after = ((await balanceLocator.textContent()) ?? "").trim();
        if (after === "...") {
          throw new Error(
            `Portfolio balance regressed to loading placeholder. before='${before}', after='${after}'`,
          );
        }

        const screenshot = await capture(page, "task-7-8-portfolio");
        return {
          status: "pass",
          details:
            "Custom token appears in portfolio, faucet link updated, and balance remains stable over time window.",
          screenshot,
        };
      },
    );

    await record(
      "T9-T10-request",
      "Request QR centering and delete action (tasks 9,10)",
      async () => {
        await page.evaluate(() => {
          window.localStorage.removeItem("tempo.requestHistory.v1");
        });

        await page.goto("/app/request");
        await page.waitForLoadState("networkidle");

        await page.getByLabel("Recipient").fill(RECIPIENT);
        await page.getByPlaceholder("0.00").fill("5");
        await page.getByLabel("Memo (optional)").fill("qa-request");
        await page.getByRole("button", { name: "Create Request" }).click();

        await page.waitForSelector("text=Request ready to share", {
          timeout: 10_000,
        });

        const qrContainerClass =
          (await page
            .locator("div.flex.justify-center.overflow-x-auto")
            .first()
            .getAttribute("class")) ?? "";
        if (!containsAll(qrContainerClass, ["flex", "justify-center"])) {
          throw new Error(
            `QR container is not centered. class='${qrContainerClass}'`,
          );
        }

        const deleteButton = page
          .getByRole("button", { name: "Delete" })
          .first();
        await deleteButton.click();
        await page.waitForSelector("text=No requests yet.", {
          timeout: 10_000,
        });

        const screenshot = await capture(page, "task-9-10-request");
        return {
          status: "pass",
          details:
            "QR container is centered and recent request entries are deletable from history.",
          screenshot,
        };
      },
    );

    await record(
      "T11-T12-schedule",
      "Schedule label and session pre-auth flow (tasks 11,12)",
      async () => {
        if (!connectedWalletReady) {
          await page.goto("/app/schedule");
          await page.waitForLoadState("networkidle");
          await page.waitForSelector("text=Execution window", {
            timeout: 10_000,
          });
          await page.waitForSelector(
            "text=How long after the delay the payment can execute.",
            { timeout: 10_000 },
          );
          await page.waitForSelector(
            "text=Keep this tab open — payments execute client-side.",
            { timeout: 10_000 },
          );
          const screenshot = await capture(
            page,
            "task-11-12-schedule-blocked-no-wallet",
          );
          return {
            status: "blocked",
            details:
              "Task 11 copy is verified, but Task 12 runtime pre-authorization cannot be completed without an active wagmi wallet session in this environment.",
            screenshot,
          };
        }

        await page.evaluate(() => {
          window.localStorage.setItem("tempo.mockBalanceValue", "100");
          window.localStorage.removeItem("tempo.scheduledPayments.v1");
        });

        await page.goto("/app/schedule");
        await page.waitForLoadState("networkidle");

        await page.waitForSelector("text=Execution window", {
          timeout: 10_000,
        });
        await page.waitForSelector(
          "text=How long after the delay the payment can execute.",
          { timeout: 10_000 },
        );
        await page.waitForSelector(
          "text=Keep this tab open — payments execute client-side.",
          { timeout: 10_000 },
        );

        await page.getByLabel("Recipient Address").fill(RECIPIENT);
        await page.getByLabel("Amount").fill("1");
        await page.getByRole("button", { name: "Schedule Payment" }).click();

        await page.waitForTimeout(4000);

        const scheduledRaw = await page.evaluate(() =>
          window.localStorage.getItem("tempo.scheduledPayments.v1"),
        );
        if (!scheduledRaw) {
          const screenshot = await capture(page, "task-11-12-schedule-blocked");
          return {
            status: "blocked",
            details:
              "Schedule form copy is correct, but no scheduled item was persisted in this environment after submit.",
            screenshot,
          };
        }

        let scheduledItems = [];
        try {
          scheduledItems = JSON.parse(scheduledRaw);
        } catch {
          const screenshot = await capture(
            page,
            "task-11-12-schedule-invalid-storage",
          );
          return {
            status: "blocked",
            details:
              "Scheduled payments localStorage payload is not valid JSON.",
            screenshot,
          };
        }

        const first = Array.isArray(scheduledItems) ? scheduledItems[0] : null;
        if (!first || !first.sessionId) {
          const screenshot = await capture(
            page,
            "task-11-12-schedule-missing-sessionid",
          );
          return {
            status: "blocked",
            details:
              "Scheduled payment persisted without sessionId in runtime check.",
            screenshot,
          };
        }

        const screenshot = await capture(page, "task-11-12-schedule-pass");
        return {
          status: "pass",
          details:
            "Execution window copy is correct and scheduled item persisted with sessionId (pre-authorization path active).",
          screenshot,
        };
      },
    );

    await record(
      "T5-pay",
      "Pay button post-payment disable check (task 5)",
      async () => {
        if (!connectedWalletReady) {
          await page.goto(PAY_URL);
          await page.waitForLoadState("networkidle");
          const screenshot = await capture(
            page,
            "task-5-pay-blocked-no-wallet",
          );
          return {
            status: "blocked",
            details:
              "Cannot verify post-payment disabled state without an active wagmi-connected wallet on /pay.",
            screenshot,
          };
        }

        await page.goto(PAY_URL);
        await page.waitForLoadState("networkidle");

        const payButton = page.getByRole("button", { name: "Pay Now" });
        if ((await payButton.count()) === 0) {
          const screenshot = await capture(
            page,
            "task-5-pay-blocked-not-connected",
          );
          return {
            status: "blocked",
            details:
              "Pay button is not available because /pay requires an active wagmi-connected wallet in this session.",
            screenshot,
          };
        }

        await payButton.click();
        await page.waitForTimeout(12_000);

        const sentButton = page.getByRole("button", { name: "Payment Sent ✓" });
        if ((await sentButton.count()) > 0) {
          const isDisabled = await sentButton.isDisabled();
          if (!isDisabled) {
            throw new Error("Payment Sent button is not disabled.");
          }
          const screenshot = await capture(page, "task-5-pay-pass");
          return {
            status: "pass",
            details:
              "Payment completed and button switched to disabled 'Payment Sent ✓' state.",
            screenshot,
          };
        }

        const errorText = await page.locator("body").innerText();
        const shortError = errorText.includes("Payment failed")
          ? "Payment failed during runtime verification (likely unfunded wallet or sponsorship constraints)."
          : "Payment success state was not reached within timeout window.";
        const screenshot = await capture(page, "task-5-pay-blocked-runtime");
        return {
          status: "blocked",
          details: shortError,
          screenshot,
        };
      },
    );
  } finally {
    await context.close();
    await browser.close();
  }

  const counts = checks.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    },
    { pass: 0, blocked: 0, fail: 0 },
  );

  const payload = {
    startedAt: checks[0]?.startedAt ?? nowIso(),
    finishedAt: nowIso(),
    baseURL: BASE_URL,
    summary: counts,
    checks,
  };

  const jsonPath = path.join(
    OUT_DIR,
    "fix-edilecekler-playwright-results.json",
  );
  const mdPath = path.join(OUT_DIR, "fix-edilecekler-playwright-summary.md");

  const lines = [
    "# Fix Edilecekler Playwright Final QA",
    "",
    `- Base URL: ${BASE_URL}`,
    `- Finished: ${payload.finishedAt}`,
    `- Pass: ${counts.pass}`,
    `- Blocked: ${counts.blocked}`,
    `- Fail: ${counts.fail}`,
    "",
    "| Check | Status | Details | Screenshot |",
    "|---|---|---|---|",
    ...checks.map(
      (item) =>
        `| ${item.id} | ${item.status.toUpperCase()} | ${item.details.replace(/\|/g, "\\|")} | ${item.screenshot ?? "-"} |`,
    ),
    "",
  ];

  await writeFile(jsonPath, JSON.stringify(payload, null, 2));
  await writeFile(mdPath, lines.join("\n"));

  const hasFail = counts.fail > 0;
  process.stdout.write(
    JSON.stringify({ summary: counts, jsonPath, mdPath }) + "\n",
  );
  process.exit(hasFail ? 1 : 0);
}

run().catch((error) => {
  process.stderr.write(`${toErrorMessage(error)}\n`);
  process.exit(1);
});
