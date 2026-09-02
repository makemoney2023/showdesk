import { test, expect, type Page } from "@playwright/test";
import path from "path";
import { writeFileSync, mkdtempSync } from "fs";
import os from "os";

async function installBrowserAudioMocks(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("sss-pwa-install-dismissed", String(Date.now()));

    const track = { label: "E2E microphone", stop() {} };
    const stream = {
      getTracks: () => [track],
      getAudioTracks: () => [track],
    } as unknown as MediaStream;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => stream,
      },
    });

    class MockAudioNode {
      connect() {
        return this;
      }
      disconnect() {}
    }

    class MockAnalyser extends MockAudioNode {
      fftSize = 256;
      frequencyBinCount = 32;
      getByteFrequencyData(data: Uint8Array) {
        data.fill(64);
      }
    }

    class MockAudioContext {
      state = "running";
      sampleRate = 48_000;
      destination = new MockAudioNode();
      createMediaStreamSource() {
        return new MockAudioNode();
      }
      createAnalyser() {
        return new MockAnalyser();
      }
      async resume() {}
      async close() {}
    }

    class MockMediaRecorder {
      static isTypeSupported() {
        return true;
      }

      state: RecordingState = "inactive";
      ondataavailable: ((event: BlobEvent) => void) | null = null;
      onstop: ((event: Event) => void) | null = null;

      constructor(
        _stream: MediaStream,
        _options?: MediaRecorderOptions,
      ) {}

      start() {
        this.state = "recording";
      }
      pause() {
        this.state = "paused";
      }
      resume() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.(
          new BlobEvent("dataavailable", {
            data: new Blob(["fake-audio"], { type: "audio/webm" }),
          }),
        );
        this.onstop?.(new Event("stop"));
      }
    }

    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: MockAudioContext,
    });
    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: MockMediaRecorder,
    });
  });
}

test.describe("happy path", () => {
  let createdShowId: string | null = null;

  test.afterEach(async ({ page }) => {
    if (!createdShowId) return;
    await page.request.post("/api/purge", {
      data: { show_id: createdShowId, confirm: "PURGE" },
    });
    createdShowId = null;
  });

  test("login → roster → ringside → review → reports → publish", async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);
    await installBrowserAudioMocks(page);
    await page.goto("/login");
    await page.getByLabel("Email").fill("secretary@demo.local");
    await page.getByLabel("Password").fill("demo1234");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/entries/);

    await page.getByRole("button", { name: "New show" }).click();
    await page.getByLabel("Show name").fill("E2E Sieger Show");
    await page.getByLabel("Date").fill("2026-09-05");
    await page.getByLabel("Venue").fill("Demo Ground");
    await page.getByLabel("Judge", { exact: true }).fill("Test Judge");
    await page.getByRole("button", { name: "Add judge" }).click();
    await page.locator("#show_judge-1").fill("Second Judge");
    await page.getByRole("button", { name: "Create show" }).click();
    await expect(page.getByText(/Show created/i)).toBeVisible();

    // Settings must keep a newly added blank judge row until it is filled.
    await page.goto("/admin/settings");
    await expect(page.locator("#settings_judge-0")).toHaveValue("Test Judge");
    await expect(page.locator("#settings_judge-1")).toHaveValue("Second Judge");
    await page.getByRole("button", { name: "Add judge" }).click();
    await expect(page.locator("#settings_judge-2")).toBeVisible();
    await page.locator("#settings_judge-2").fill("Third Judge");
    await page.getByRole("button", { name: "Save show settings" }).click();
    await expect(
      page.getByRole("main").getByText("Show settings saved"),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator("#settings_judge-2")).toHaveValue("Third Judge");

    await page.goto("/admin/entries");
    await page.getByRole("button", { name: "Import CSV" }).click();
    await expect(page.getByRole("heading", { name: "Import roster CSV" })).toBeVisible();
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "sss-e2e-"));
    const csvPath = path.join(tmpDir, `roster-${Date.now()}.csv`);
    writeFileSync(
      csvPath,
      [
        "armband,dog_name,zb_number,wt,owner,sex,class_id,email,event_kind,competition_day,catalog_class,dog_id",
        "101,Rex Happy Path,DE-1,2024-01-01,Max Mustermann,R,zwischenklasse,owner@example.com,conformation,2026-09-05,youth-i,dog-rex",
        "101,Rex Happy Path,DE-1,2024-01-01,Max Mustermann,R,zwischenklasse,owner@example.com,se,2026-09-04,standard-evaluation,dog-rex",
        "101,Rex Happy Path,DE-1,2024-01-01,Max Mustermann,R,zwischenklasse,owner@example.com,conformation,2026-09-06,youth-i,dog-rex",
        "102,Bella Division Test,DE-2,2024-02-01,Jane Example,H,zwischenklasse,bella@example.com,conformation,2026-09-05,youth-i,dog-bella",
      ].join("\n"),
    );
    await page.locator('input[type="file"]').setInputFiles(csvPath);
    await page.getByRole("button", { name: "Import file" }).click();
    await expect(
      page.getByRole("heading", { name: "Import roster CSV" }),
    ).toBeHidden();
    await expect(
      page.getByRole("cell", { name: "Rex Happy Path", exact: true }).first(),
    ).toBeVisible();

    const showRes = await page.request.get("/api/shows");
    const showData = (await showRes.json()) as {
      active_show_id: string;
    };
    createdShowId = showData.active_show_id;
    const entryRes = await page.request.get(
      `/api/entries?show_id=${showData.active_show_id}`,
    );
    const entryData = (await entryRes.json()) as {
      entries: {
        id: string;
        dog_name: string;
        event_kind?: "se" | "conformation";
        competition_day?: string;
      }[];
    };
    const entry = entryData.entries.find(
      (item) =>
        item.dog_name === "Rex Happy Path" &&
        item.event_kind === "conformation" &&
        item.competition_day === "2026-09-05",
    );
    const sundayEntry = entryData.entries.find(
      (item) =>
        item.dog_name === "Rex Happy Path" &&
        item.event_kind === "conformation" &&
        item.competition_day === "2026-09-06",
    );
    const seEntry = entryData.entries.find(
      (item) =>
        item.dog_name === "Rex Happy Path" && item.event_kind === "se",
    );
    expect(entry).toBeTruthy();
    expect(seEntry).toBeTruthy();
    expect(sundayEntry).toBeTruthy();

    await page.goto(`/ringside/se/${seEntry!.id}`);
    await expect(
      page.getByText("SE requires a health clearance PDF", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open Roster" }),
    ).toBeVisible();

    const documentRes = await page.request.post("/api/documents", {
      data: {
        show_id: showData.active_show_id,
        entry_id: seEntry!.id,
        file_base64: Buffer.from("%PDF-1.4\n%%EOF").toString("base64"),
        filename: "health-clearance.pdf",
        mime: "application/pdf",
      },
    });
    expect(documentRes.ok()).toBeTruthy();

    await page.goto("/ringside");
    await expect(page.getByRole("heading", { name: "Dogs" })).toBeVisible();
    await page.waitForFunction(async () => {
      const registration = await navigator.serviceWorker.getRegistration("/");
      return Boolean(registration?.active || navigator.serviceWorker.controller);
    });
    await expect
      .poll(async () =>
        page.evaluate(async () => {
          const cache = await caches.open("showdesk-ringside-v1");
          return Boolean(await cache.match("/ringside"));
        }),
      )
      .toBeTruthy();
    await page.context().setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Dogs" })).toBeVisible();
    await page.context().setOffline(false);

    await page.getByLabel("Judge").selectOption("Test Judge");
    await page
      .getByRole("button", { name: /Friday, September 4/ })
      .click();
    await expect(
      page.getByRole("link", { name: "Open SE form for Rex Happy Path" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Record critique for Rex Happy Path" }),
    ).toHaveCount(0);
    await page
      .getByRole("link", { name: "Open SE form for Rex Happy Path" })
      .click();
    await page.getByLabel("Comments").fill("Recovered ringside note");
    await page.waitForTimeout(500);
    await expect(page.getByText("Saved on this device")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Comments")).toHaveValue(
      "Recovered ringside note",
    );
    await expect(page.getByText(/Recovered unsaved changes/)).toBeVisible();

    await page.getByRole("link", { name: "Back to dogs" }).click();
    await page
      .getByRole("button", { name: /Saturday, September 5/ })
      .click();
    await expect(
      page.getByRole("link", { name: "Record critique for Rex Happy Path" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open SE form for Rex Happy Path" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", {
        name: "Record critique for Bella Division Test",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Youth I — Male/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Youth I — Female/ }),
    ).toBeVisible();
    await page.getByLabel("Search dogs").fill("does-not-match");
    await expect(page.getByText(/No dogs match/)).toBeVisible();
    await page.getByRole("button", { name: "Clear search" }).click();

    // Another steward already placed Sunday. Saving Saturday must not wipe it.
    const sundayPlaceRes = await page.request.put("/api/placements", {
      data: {
        show_id: showData.active_show_id,
        placements: [{ entry_id: sundayEntry!.id, placement: 2 }],
      },
    });
    expect(sundayPlaceRes.ok()).toBeTruthy();

    // Male and female dogs in the same age class have independent places.
    await page.goto("/ringside/placements");
    await expect(
      page.getByRole("heading", { name: "Youth I — Male (Rüde)" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Youth I — Female (Hündin)" }),
    ).toBeVisible();
    const saturdayPlacements = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Saturday, September 5" }) });
    await saturdayPlacements
      .getByRole("group", { name: "Placement for Rex Happy Path" })
      .getByRole("button", { name: "1", exact: true })
      .click();
    await saturdayPlacements
      .getByRole("group", { name: "Placement for Bella Division Test" })
      .getByRole("button", { name: "1", exact: true })
      .click();
    await page.getByRole("button", { name: "Save placements" }).click();
    await expect(
      page.getByRole("main").getByText("Placements saved"),
    ).toBeVisible();
    await page.reload();
    await expect(
      saturdayPlacements
        .getByRole("group", { name: "Placement for Rex Happy Path" })
        .getByRole("button", { name: "1", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      saturdayPlacements
        .getByRole("group", { name: "Placement for Bella Division Test" })
        .getByRole("button", { name: "1", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const placementsAfterSaturday = (await (
      await page.request.get(
        `/api/placements?show_id=${showData.active_show_id}`,
      )
    ).json()) as {
      placements: { entry_id: string; placement: number }[];
    };
    expect(
      placementsAfterSaturday.placements.find(
        (placement) => placement.entry_id === sundayEntry!.id,
      )?.placement,
    ).toBe(2);

    await page.goto(
      `/ringside/record/${entry!.id}?date=2026-09-05&pool=2026-09-05%3Ayouth-i%3AR`,
    );
    await page.getByRole("button", { name: "Start recording" }).click();
    await expect(
      page.getByRole("button", { name: "Stop & process" }),
    ).toBeVisible();
    const critiqueResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/critiques") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Stop & process" }).click();
    expect((await critiqueResponse).ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/ringside/);

    // Ring Wi-Fi drop: recording queues locally, the steward stays on the
    // page instead of navigating into an offline error, then sync drains it.
    const bella = entryData.entries.find(
      (item) =>
        item.dog_name === "Bella Division Test" &&
        item.event_kind === "conformation",
    );
    expect(bella).toBeTruthy();
    await page.goto(
      `/ringside/record/${bella!.id}?date=2026-09-05&pool=2026-09-05%3Ayouth-i%3AH`,
    );
    await page.getByRole("button", { name: "Start recording" }).click();
    await expect(
      page.getByRole("button", { name: "Stop & process" }),
    ).toBeVisible();
    await page.context().setOffline(true);
    await page.getByRole("button", { name: "Stop & process" }).click();
    await expect(
      page.getByText("Saved to offline queue — sync when back online"),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/ringside/record/${bella!.id}`));
    await expect(page.getByText("1 recording(s) waiting to sync")).toBeVisible();
    await page.context().setOffline(false);
    await page.getByRole("button", { name: "Sync queue" }).click();
    await expect(page.getByText("Synced 1 item")).toBeVisible({
      timeout: 15000,
    });

    await page.goto("/admin/review");
    await page.getByLabel("Search review queue").fill("does-not-match");
    await expect(page.getByText(/No review items match/)).toBeVisible();
    await page.getByRole("button", { name: "Clear search" }).click();
    await page.getByRole("button", { name: /Rex Happy Path/ }).click();
    await expect(page.getByLabel("Narrative (draft)")).toBeVisible();
    await page.getByRole("button", { name: "Approve & release" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText(/Approved/i)).toBeVisible({ timeout: 10000 });

    const critiquesRes = await page.request.get(
      `/api/critiques?show_id=${showData.active_show_id}`,
    );
    const critiquesData = (await critiquesRes.json()) as {
      critiques: { id: string; entry_id: string; status: string }[];
    };
    const approved = critiquesData.critiques.find(
      (critique) =>
        critique.entry_id === entry!.id && critique.status === "APPROVED",
    );
    expect(approved).toBeTruthy();
    const pdfRes = await page.request.get(
      `/api/pdf/tnrk?kind=critique&show_id=${showData.active_show_id}&critique_id=${approved!.id}`,
    );
    expect(pdfRes.ok()).toBeTruthy();
    expect(pdfRes.headers()["content-type"]).toContain("application/pdf");
    expect((await pdfRes.body()).subarray(0, 4).toString()).toBe("%PDF");

    await page.goto("/admin/reports");
    await page.getByLabel("Search reports").fill("does-not-match");
    await expect(page.getByText(/No dogs match/)).toBeVisible();
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(
      page.getByRole("heading", { name: /Rex Happy Path/ }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Youth I — Male (Rüde) · Place 1"),
    ).toBeVisible();
    await expect(
      page.getByText("Youth I — Female (Hündin) · Place 1"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Select all printable" }).click();
    await expect(
      page.getByRole("link", { name: "Print selected certificates" }),
    ).toBeVisible();
    await page
      .locator("details")
      .filter({ hasText: "Rex Happy Path" })
      .filter({ hasText: "Saturday, September 5" })
      .locator("summary")
      .click();
    await expect(
      page.getByRole("link", { name: "Print TNRK critique PDF" }),
    ).toBeVisible();

    await page.goto("/admin/settings");
    await page.getByRole("button", { name: "Publish results" }).click();
    await expect(
      page.getByRole("main").getByText("Results published"),
    ).toBeVisible();
    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();
    await publicPage.goto("/results/e2e-sieger-show-2026-09-05");
    await expect(
      publicPage.getByRole("heading", {
        name: /E2E Sieger Show results/,
      }),
    ).toBeVisible();
    await expect(
      publicPage.getByRole("link", { name: /Rex Happy Path/ }).first(),
    ).toBeVisible();
    await expect(
      publicPage.getByRole("link", { name: /Bella Division Test/ }),
    ).toBeVisible();
    await publicContext.close();
  });
});
