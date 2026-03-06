# Fix Edilecekler Playwright Final QA

- Base URL: http://localhost:3100
- Finished: 2026-03-01T22:41:45.952Z
- Pass: 2
- Blocked: 5
- Fail: 0

| Check            | Status  | Details                                                                                                                                             | Screenshot                                                              |
| ---------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| T1-T3-home       | BLOCKED | Home dashboard was not reachable in this runtime, so balance/faucet assertions could not run.                                                       | .sisyphus/evidence/final-qa/task-1-2-3-home-blocked-dashboard.png       |
| T4-activity      | BLOCKED | Connected wagmi wallet session could not be established in this runtime, so TransactionHistory did not mount for live confirmation-label assertion. | .sisyphus/evidence/final-qa/task-4-activity-blocked-no-wallet.png       |
| T6-layout        | PASS    | Layout classes match widened sidebar and nav spacing requirements.                                                                                  | .sisyphus/evidence/final-qa/task-6-layout-spacing.png                   |
| T7-T8-portfolio  | BLOCKED | Custom token was not visible in Portfolio runtime assertion window.                                                                                 | .sisyphus/evidence/final-qa/task-7-8-portfolio-blocked-custom-token.png |
| T9-T10-request   | PASS    | QR container is centered and recent request entries are deletable from history.                                                                     | .sisyphus/evidence/final-qa/task-9-10-request.png                       |
| T11-T12-schedule | BLOCKED | Task 11 copy is verified, but Task 12 runtime pre-authorization cannot be completed without an active wagmi wallet session in this environment.     | .sisyphus/evidence/final-qa/task-11-12-schedule-blocked-no-wallet.png   |
| T5-pay           | BLOCKED | Cannot verify post-payment disabled state without an active wagmi-connected wallet on /pay.                                                         | .sisyphus/evidence/final-qa/task-5-pay-blocked-no-wallet.png            |
