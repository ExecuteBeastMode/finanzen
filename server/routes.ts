import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import https from "https";
import http from "http" ;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export function registerRoutes(httpServer: Server, app: Express) {
  // ─── SETTINGS ────────────────────────────────────────────────────────────────
  app.get("/api/settings/:key", (req, res) => {
    res.json({ key: req.params.key, value: storage.getSetting(req.params.key) });
  });
  app.post("/api/settings/:key", (req, res) => {
    storage.setSetting(req.params.key, String(req.body.value));
    res.json({ ok: true });
  });

  // ─── SAVINGS ─────────────────────────────────────────────────────────────────
  app.get("/api/savings", (_req, res) => res.json(storage.getSavingsEntries()));
  app.post("/api/savings", (req, res) => res.json(storage.addSavingsEntry(req.body)));
  app.delete("/api/savings/:id", (req, res) => { storage.deleteSavingsEntry(Number(req.params.id)); res.json({ ok: true }); });

  // ─── BUDGET ──────────────────────────────────────────────────────────────────
  app.get("/api/budget/:month", (req, res) => {
    res.json(storage.getBudgetEntry(req.params.month) ?? { month: req.params.month, income: 0, remainingBudget: 0 });
  });
  app.post("/api/budget", (req, res) => res.json(storage.upsertBudgetEntry(req.body)));

  // ─── CATEGORIES ──────────────────────────────────────────────────────────────
  app.get("/api/categories", (_req, res) => res.json(storage.getCategories()));
  app.post("/api/categories", (req, res) => res.json(storage.addCategory(req.body)));
  app.delete("/api/categories/:id", (req, res) => { storage.deleteCategory(Number(req.params.id)); res.json({ ok: true }); });

  // ─── MONTHLY FIXED COSTS ─────────────────────────────────────────────────────
  app.get("/api/monthly-costs", (_req, res) => res.json(storage.getMonthlyFixedCosts()));
  app.post("/api/monthly-costs", (req, res) => res.json(storage.addMonthlyFixedCost(req.body)));
  app.patch("/api/monthly-costs/:id", (req, res) => res.json(storage.updateMonthlyFixedCost(Number(req.params.id), req.body)));
  app.delete("/api/monthly-costs/:id", (req, res) => { storage.deleteMonthlyFixedCost(Number(req.params.id)); res.json({ ok: true }); });
  app.get("/api/monthly-costs/checks/:month", (req, res) => res.json(storage.getMonthlyFixedCostChecks(req.params.month)));
  app.post("/api/monthly-costs/checks/toggle", (req, res) => {
    const { costId, month, checked } = req.body;
    res.json(storage.toggleMonthlyFixedCostCheck(Number(costId), month, Boolean(checked)));
  });

  // ─── ANNUAL FIXED COSTS ──────────────────────────────────────────────────────
  app.get("/api/annual-costs", (_req, res) => res.json(storage.getAnnualFixedCosts()));
  app.post("/api/annual-costs", (req, res) => res.json(storage.addAnnualFixedCost(req.body)));
  app.patch("/api/annual-costs/:id", (req, res) => res.json(storage.updateAnnualFixedCost(Number(req.params.id), req.body)));
  app.delete("/api/annual-costs/:id", (req, res) => { storage.deleteAnnualFixedCost(Number(req.params.id)); res.json({ ok: true }); });
  app.get("/api/annual-costs/checks/:year", (req, res) => res.json(storage.getAnnualFixedCostChecks(Number(req.params.year))));
  app.post("/api/annual-costs/checks/toggle", (req, res) => {
    const { costId, year, checked } = req.body;
    res.json(storage.toggleAnnualFixedCostCheck(Number(costId), Number(year), Boolean(checked)));
  });

  // ─── VARIABLE EXPENSES ───────────────────────────────────────────────────────
  app.get("/api/expenses/:month", (req, res) => res.json(storage.getExpenses(req.params.month)));
  app.post("/api/expenses", (req, res) => res.json(storage.addExpense(req.body)));
  app.delete("/api/expenses/:id", (req, res) => { storage.deleteExpense(Number(req.params.id)); res.json({ ok: true }); });

  // ─── TIKTOK POSTS ────────────────────────────────────────────────────────────
  app.get("/api/tiktok", (_req, res) => res.json(storage.getTiktokPosts()));
  app.post("/api/tiktok", (req, res) => res.json(storage.addTiktokPost(req.body)));
  app.patch("/api/tiktok/:id", (req, res) => res.json(storage.updateTiktokPost(Number(req.params.id), req.body)));
  app.delete("/api/tiktok/:id", (req, res) => { storage.deleteTiktokPost(Number(req.params.id)); res.json({ ok: true }); });

  // ─── CONTENT IDEAS ───────────────────────────────────────────────────────────
  app.get("/api/content-ideas", (_req, res) => res.json(storage.getContentIdeas()));
  app.post("/api/content-ideas", (req, res) => res.json(storage.addContentIdea(req.body)));
  app.patch("/api/content-ideas/:id", (req, res) => res.json(storage.updateContentIdea(Number(req.params.id), req.body)));
  app.delete("/api/content-ideas/:id", (req, res) => { storage.deleteContentIdea(Number(req.params.id)); res.json({ ok: true }); });

  // ─── DATE IDEAS ──────────────────────────────────────────────────────────────
  app.get("/api/date-ideas", (_req, res) => res.json(storage.getDateIdeas()));
  app.post("/api/date-ideas", (req, res) => res.json(storage.addDateIdea(req.body)));
  app.patch("/api/date-ideas/:id", (req, res) => res.json(storage.updateDateIdea(Number(req.params.id), req.body)));
  app.delete("/api/date-ideas/:id", (req, res) => { storage.deleteDateIdea(Number(req.params.id)); res.json({ ok: true }); });

  // ─── REMINDERS ───────────────────────────────────────────────────────────────
  app.get("/api/reminders", (_req, res) => res.json(storage.getReminders()));
  app.post("/api/reminders", (req, res) => res.json(storage.addReminder(req.body)));
  app.patch("/api/reminders/:id", (req, res) => res.json(storage.updateReminder(Number(req.params.id), req.body)));
  app.delete("/api/reminders/:id", (req, res) => { storage.deleteReminder(Number(req.params.id)); res.json({ ok: true }); });

  // ─── NOTES ───────────────────────────────────────────────────────────────────
  app.get("/api/notes", (_req, res) => res.json(storage.getNotes()));
  app.post("/api/notes", (req, res) => {
    const now = new Date().toISOString();
    res.json(storage.addNote({ ...req.body, createdAt: now, updatedAt: now }));
  });
  app.patch("/api/notes/:id", (req, res) => {
    res.json(storage.updateNote(Number(req.params.id), { ...req.body, updatedAt: new Date().toISOString() }));
  });
  app.delete("/api/notes/:id", (req, res) => { storage.deleteNote(Number(req.params.id)); res.json({ ok: true }); });

  // ─── CHORES ──────────────────────────────────────────────────────────────────
  app.get("/api/chores", (_req, res) => res.json(storage.getChores()));
  app.post("/api/chores", (req, res) => res.json(storage.addChore(req.body)));
  app.patch("/api/chores/:id", (req, res) => res.json(storage.updateChore(Number(req.params.id), req.body)));
  app.delete("/api/chores/:id", (req, res) => { storage.deleteChore(Number(req.params.id)); res.json({ ok: true }); });

  // ─── TRAINING PRs ─────────────────────────────────────────────────────────────
  app.get("/api/prs", (_req, res) => res.json(storage.getPRs()));
  app.post("/api/prs", (req, res) => res.json(storage.addPR(req.body)));
  app.patch("/api/prs/:id", (req, res) => res.json(storage.updatePR(Number(req.params.id), req.body)));
  app.delete("/api/prs/:id", (req, res) => { storage.deletePR(Number(req.params.id)); res.json({ ok: true }); });

  // ─── EINKAUFSLISTE ────────────────────────────────────────────────────────────
  app.get("/api/shopping", (_req, res) => res.json(storage.getShoppingItems()));
  app.post("/api/shopping", (req, res) => {
    try {
      const { name, quantity, category, note } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: "Name required" });
      const item = storage.addShoppingItem({ name: name.trim(), quantity: quantity || null, category: category || "sonstiges", note: note || null });
      res.json(item);
    } catch(e: any) {
      console.error("Shopping POST error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app.patch("/api/shopping/:id", (req, res) => res.json(storage.updateShoppingItem(Number(req.params.id), req.body)));
  app.delete("/api/shopping/:id", (req, res) => { storage.deleteShoppingItem(Number(req.params.id)); res.json({ ok: true }); });
  app.post("/api/shopping/clear-checked", (_req, res) => { storage.clearCheckedItems(); res.json({ ok: true }); });

  // ─── COUNTDOWNS ───────────────────────────────────────────────────────────────
  app.get("/api/countdowns", (_req, res) => res.json(storage.getCountdowns()));
  app.post("/api/countdowns", (req, res) => res.json(storage.addCountdown(req.body)));
  app.patch("/api/countdowns/:id", (req, res) => res.json(storage.updateCountdown(Number(req.params.id), req.body)));
  app.delete("/api/countdowns/:id", (req, res) => { storage.deleteCountdown(Number(req.params.id)); res.json({ ok: true }); });

  // ─── SCHULUNGSWOCHEN ──────────────────────────────────────────────────────────
  app.get("/api/training-weeks/:year", (req, res) => res.json(storage.getTrainingWeeks(Number(req.params.year))));
  app.post("/api/training-weeks", (req, res) => res.json(storage.addTrainingWeek(req.body)));
  app.patch("/api/training-weeks/:id", (req, res) => res.json(storage.updateTrainingWeek(Number(req.params.id), req.body)));
  app.delete("/api/training-weeks/:id", (req, res) => { storage.deleteTrainingWeek(Number(req.params.id)); res.json({ ok: true }); });

  // ─── URLAUBSTAGE ───────────────────────────────────────────────────────────────
  app.get("/api/vacation/:year", (req, res) => res.json(storage.getVacationDays(Number(req.params.year))));
  app.post("/api/vacation", (req, res) => res.json(storage.addVacationDay(req.body)));
  // specific route BEFORE the generic :id route
  app.delete("/api/vacation/date/:year/:date", (req, res) => { storage.deleteVacationDayByDate(Number(req.params.year), req.params.date); res.json({ ok: true }); });
  app.delete("/api/vacation/:id", (req, res) => { storage.deleteVacationDay(Number(req.params.id)); res.json({ ok: true }); });
  app.get("/api/vacation-config/:year", (req, res) => res.json(storage.getVacationConfig(Number(req.params.year))));
  app.post("/api/vacation-config", (req, res) => res.json(storage.setVacationConfig(req.body.year, req.body.totalDays)));

  // ── EXPORT / IMPORT ───────────────────────────────────────────────────────────────
  app.get("/api/export", (_req, res) => {
    try {
      const data = storage.exportAll();
      const json = JSON.stringify(data, null, 2);
      const date = new Date().toISOString().slice(0, 10);
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="lifeos-backup-${date}.json"`);
      res.send(json);
    } catch (e: any) {
      res.status(500).json({ error: String(e.message) });
    }
  });

  app.post("/api/import", upload.single("file"), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Keine Datei hochgeladen" });
      const raw = JSON.parse(req.file.buffer.toString("utf8"));
      if (!raw._version) return res.status(400).json({ error: "Ungültiges Backup-Format" });
      storage.importAll(raw);
      res.json({ ok: true, imported: new Date().toISOString() });
    } catch (e: any) {
      res.status(400).json({ error: String(e.message) });
    }
  });

  // ── NEWS RSS PROXY ──────────────────────────────────────────────────────
  const RSS_FEEDS: Record<string, { url: string; source: string }[]> = {
    tagesschau: [{ url: "https://www.tagesschau.de/infoservices/alle-meldungen-100~rss2.xml", source: "tagesschau" }],
    spiegel:    [{ url: "https://www.spiegel.de/schlagzeilen/tops/index.rss", source: "spiegel" }],
    all:        [
      { url: "https://www.tagesschau.de/infoservices/alle-meldungen-100~rss2.xml", source: "tagesschau" },
      { url: "https://www.spiegel.de/schlagzeilen/tops/index.rss", source: "spiegel" },
    ],
  };

  function fetchUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith("https") ? https : http;
      const req = mod.get(url, { headers: { "User-Agent": "Mozilla/5.0 LifeOS/1.0" } }, (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => data += chunk.toString());
        res.on("end", () => resolve(data));
      });
      req.on("error", reject);
      req.setTimeout(8000, () => { req.destroy(); reject(new Error("timeout")); });
    });
  }

  function parseRSS(xml: string, source: string): any[] {
    const items: any[] = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const match of itemMatches) {
      const block = match[1];
      const get = (tag: string) => {
        const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tag}>|<${tag}[^>]*>([^<]*)<\/${tag}>`));
        return m ? (m[1] ?? m[2] ?? "").trim() : "";
      };
      const imgM = block.match(/<enclosure[^>]+url="([^"]+)"|<img[^>]+src="([^"]+)"/);
      const image = imgM ? (imgM[1] ?? imgM[2] ?? "") : "";
      const desc = get("description").replace(/<[^>]+>/g, "").replace(/\[.*?\]/g, "").trim().slice(0, 200);
      items.push({
        title: get("title"),
        link: get("link") || (block.match(/<link>\s*([^<]+)/) ? block.match(/<link>\s*([^<]+)/)?.[1]?.trim() ?? "" : ""),
        description: desc,
        pubDate: get("pubDate"),
        category: get("category"),
        image,
        source,
      });
    }
    return items;
  }

  app.get("/api/news", async (req, res) => {
    const src = (req.query.source as string) ?? "all";
    const feeds = RSS_FEEDS[src] ?? RSS_FEEDS.all;
    try {
      const results = await Promise.allSettled(feeds.map(f => fetchUrl(f.url).then(xml => parseRSS(xml, f.source))));
      const allItems: any[] = [];
      for (const r of results) {
        if (r.status === "fulfilled") allItems.push(...r.value);
      }
      // Sort by pubDate desc, limit 40
      allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      res.json({ items: allItems.slice(0, 40), fetchedAt: new Date().toISOString() });
    } catch (e: any) {
      res.status(500).json({ error: String(e.message) });
    }
  });

  // ── TOTAL RESET ────────────────────────────────────────────────────────────
  app.delete("/api/reset", (req, res) => {
    try {
      storage.resetAll();
      res.json({ ok: true, reset: new Date().toISOString() });
    } catch (e: any) {
      res.status(500).json({ error: String(e.message) });
    }
  });
}
