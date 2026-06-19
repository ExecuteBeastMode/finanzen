import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and } from "drizzle-orm";
import * as schema from "@shared/schema";
import {
  settings,
  savingsEntries, type InsertSavingsEntry, type SavingsEntry,
  budgetEntries, type InsertBudgetEntry, type BudgetEntry,
  categories, type InsertCategory, type Category,
  monthlyFixedCosts, type InsertMonthlyFixedCost, type MonthlyFixedCost,
  monthlyFixedCostChecks, type InsertMonthlyFixedCostCheck, type MonthlyFixedCostCheck,
  annualFixedCosts, type InsertAnnualFixedCost, type AnnualFixedCost,
  annualFixedCostChecks, type InsertAnnualFixedCostCheck, type AnnualFixedCostCheck,
  expenses, type InsertExpense, type Expense,
  tiktokPosts, type InsertTiktokPost, type TiktokPost,
  contentIdeas, type InsertContentIdea, type ContentIdea,
  dateIdeas, type InsertDateIdea, type DateIdea,
  reminders, type InsertReminder, type Reminder,
  notes, type InsertNote, type Note,
  chores, type InsertChore, type Chore,
  trainingPRs, type InsertTrainingPR, type TrainingPR,
  shoppingItems, type InsertShoppingItem, type ShoppingItem,
  countdowns, type InsertCountdown, type Countdown,
  trainingWeeks, type InsertTrainingWeek, type TrainingWeek,
  vacationDays, type InsertVacationDay, type VacationDay,
  vacationConfig, type VacationConfig,
} from "@shared/schema";

const sqlite = new Database("data.db");
const db = drizzle(sqlite, { schema });

// Create tables (IF NOT EXISTS — safe to run on every start)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS savings_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, amount REAL NOT NULL, note TEXT, date TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS budget_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, month TEXT NOT NULL, income REAL NOT NULL DEFAULT 0, remaining_budget REAL NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#4ade80', icon TEXT NOT NULL DEFAULT 'tag');
  CREATE TABLE IF NOT EXISTS monthly_fixed_costs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, amount REAL NOT NULL, category_id INTEGER, is_active INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE IF NOT EXISTS monthly_fixed_cost_checks (id INTEGER PRIMARY KEY AUTOINCREMENT, cost_id INTEGER NOT NULL, month TEXT NOT NULL, checked INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS annual_fixed_costs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, amount REAL NOT NULL, due_month INTEGER NOT NULL, category_id INTEGER, is_active INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE IF NOT EXISTS annual_fixed_cost_checks (id INTEGER PRIMARY KEY AUTOINCREMENT, cost_id INTEGER NOT NULL, year INTEGER NOT NULL, checked INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, amount REAL NOT NULL, category TEXT NOT NULL DEFAULT 'sonstiges', month TEXT NOT NULL, date TEXT NOT NULL, note TEXT);
  CREATE TABLE IF NOT EXISTS tiktok_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, hook TEXT, concept TEXT, status TEXT NOT NULL DEFAULT 'idea', scheduled_date TEXT, tags TEXT NOT NULL DEFAULT '[]', niche TEXT NOT NULL DEFAULT 'calisthenics');
  CREATE TABLE IF NOT EXISTS content_ideas (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, type TEXT NOT NULL DEFAULT 'video', platform TEXT NOT NULL DEFAULT 'tiktok', priority TEXT NOT NULL DEFAULT 'medium', tags TEXT NOT NULL DEFAULT '[]', used INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS date_ideas (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, category TEXT NOT NULL DEFAULT 'activity', season TEXT NOT NULL DEFAULT 'all', estimated_cost REAL NOT NULL DEFAULT 0, done INTEGER NOT NULL DEFAULT 0, done_date TEXT, rating INTEGER);
  CREATE TABLE IF NOT EXISTS reminders (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, date TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'reminder', recurring INTEGER NOT NULL DEFAULT 0, note TEXT, done INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL DEFAULT 'Neue Notiz', content TEXT NOT NULL DEFAULT '', pinned INTEGER NOT NULL DEFAULT 0, color TEXT NOT NULL DEFAULT 'default', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS chores (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'allgemein', frequency TEXT NOT NULL DEFAULT 'weekly', last_done TEXT, next_due TEXT, done INTEGER NOT NULL DEFAULT 0, note TEXT, priority TEXT NOT NULL DEFAULT 'medium');
  CREATE TABLE IF NOT EXISTS training_prs (id INTEGER PRIMARY KEY AUTOINCREMENT, exercise TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Oberkörper', reps INTEGER, weight REAL, note TEXT, date TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS shopping_items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, quantity TEXT, checked INTEGER NOT NULL DEFAULT 0, category TEXT NOT NULL DEFAULT 'sonstiges', note TEXT, added_at TEXT);
  CREATE TABLE IF NOT EXISTS countdowns (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, date TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#4ade80', note TEXT);
  CREATE TABLE IF NOT EXISTS training_weeks (id INTEGER PRIMARY KEY AUTOINCREMENT, year INTEGER NOT NULL, week INTEGER NOT NULL, trained INTEGER NOT NULL DEFAULT 0, note TEXT);
  CREATE TABLE IF NOT EXISTS vacation_days (id INTEGER PRIMARY KEY AUTOINCREMENT, year INTEGER NOT NULL, date TEXT NOT NULL, note TEXT);
  CREATE TABLE IF NOT EXISTS vacation_config (id INTEGER PRIMARY KEY AUTOINCREMENT, year INTEGER NOT NULL UNIQUE, total_days INTEGER NOT NULL DEFAULT 28);
`);

// Migrate: add estimated_cost column to date_ideas if missing
try { sqlite.exec(`ALTER TABLE date_ideas ADD COLUMN estimated_cost REAL NOT NULL DEFAULT 0`); } catch {}

// Migrate: fix shopping_items table
try { sqlite.exec(`ALTER TABLE shopping_items ADD COLUMN added_at TEXT`); } catch {}
try { sqlite.exec(`ALTER TABLE shopping_items ADD COLUMN note TEXT`); } catch {}
try { sqlite.exec(`UPDATE shopping_items SET added_at = COALESCE(added_at, created_at, datetime('now')) WHERE added_at IS NULL`); } catch {}
// Fix: old DB has created_at NOT NULL — recreate table without it
try {
  const cols = (sqlite.prepare(`PRAGMA table_info(shopping_items)`).all() as any[]).map((c: any) => c.name);
  if (cols.includes('created_at')) {
    // Step 1: add added_at if not present (nullable)
    if (!cols.includes('added_at')) {
      sqlite.exec(`ALTER TABLE shopping_items ADD COLUMN added_at TEXT`);
    }
    // Step 2: backfill
    sqlite.exec(`UPDATE shopping_items SET added_at = COALESCE(added_at, created_at, datetime('now')) WHERE added_at IS NULL`);
    // Step 3: copy to new table without created_at
    sqlite.exec(`
      CREATE TABLE shopping_items_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        quantity TEXT,
        checked INTEGER NOT NULL DEFAULT 0,
        category TEXT NOT NULL DEFAULT 'sonstiges',
        note TEXT,
        added_at TEXT
      );
      INSERT INTO shopping_items_new (id, name, quantity, checked, category, note, added_at)
        SELECT id, name, quantity, checked, category, note, added_at FROM shopping_items;
      DROP TABLE shopping_items;
      ALTER TABLE shopping_items_new RENAME TO shopping_items;
    `);
  }
} catch (e) { console.error('shopping migration error:', e); }

// Seed default categories
const existingCats = db.select().from(categories).all();
if (existingCats.length === 0) {
  db.insert(categories).values([
    { name: "Wohnen", color: "#4ade80", icon: "home" },
    { name: "Versicherung", color: "#fb923c", icon: "shield" },
    { name: "Transport", color: "#a78bfa", icon: "car" },
    { name: "Unterhaltung", color: "#38bdf8", icon: "play" },
    { name: "Sonstiges", color: "#94a3b8", icon: "more-horizontal" },
  ]).run();
}

export interface IStorage {
  getSetting(key: string): string | null;
  setSetting(key: string, value: string): void;

  getSavingsEntries(): SavingsEntry[];
  addSavingsEntry(entry: InsertSavingsEntry): SavingsEntry;
  deleteSavingsEntry(id: number): void;

  getBudgetEntry(month: string): BudgetEntry | undefined;
  upsertBudgetEntry(entry: InsertBudgetEntry): BudgetEntry;

  getCategories(): Category[];
  addCategory(cat: InsertCategory): Category;
  deleteCategory(id: number): void;

  getMonthlyFixedCosts(): MonthlyFixedCost[];
  addMonthlyFixedCost(cost: InsertMonthlyFixedCost): MonthlyFixedCost;
  updateMonthlyFixedCost(id: number, cost: Partial<InsertMonthlyFixedCost>): MonthlyFixedCost;
  deleteMonthlyFixedCost(id: number): void;
  getMonthlyFixedCostChecks(month: string): MonthlyFixedCostCheck[];
  toggleMonthlyFixedCostCheck(costId: number, month: string, checked: boolean): MonthlyFixedCostCheck;

  getAnnualFixedCosts(): AnnualFixedCost[];
  addAnnualFixedCost(cost: InsertAnnualFixedCost): AnnualFixedCost;
  updateAnnualFixedCost(id: number, cost: Partial<InsertAnnualFixedCost>): AnnualFixedCost;
  deleteAnnualFixedCost(id: number): void;
  getAnnualFixedCostChecks(year: number): AnnualFixedCostCheck[];
  toggleAnnualFixedCostCheck(costId: number, year: number, checked: boolean): AnnualFixedCostCheck;

  getExpenses(month: string): Expense[];
  addExpense(expense: InsertExpense): Expense;
  deleteExpense(id: number): void;

  getTiktokPosts(): TiktokPost[];
  addTiktokPost(post: InsertTiktokPost): TiktokPost;
  updateTiktokPost(id: number, post: Partial<InsertTiktokPost>): TiktokPost;
  deleteTiktokPost(id: number): void;

  getContentIdeas(): ContentIdea[];
  addContentIdea(idea: InsertContentIdea): ContentIdea;
  updateContentIdea(id: number, idea: Partial<InsertContentIdea>): ContentIdea;
  deleteContentIdea(id: number): void;

  getDateIdeas(): DateIdea[];
  addDateIdea(idea: InsertDateIdea): DateIdea;
  updateDateIdea(id: number, idea: Partial<InsertDateIdea>): DateIdea;
  deleteDateIdea(id: number): void;

  getReminders(): Reminder[];
  addReminder(reminder: InsertReminder): Reminder;
  updateReminder(id: number, reminder: Partial<InsertReminder>): Reminder;
  deleteReminder(id: number): void;

  getNotes(): Note[];
  addNote(note: InsertNote): Note;
  updateNote(id: number, note: Partial<InsertNote>): Note;
  deleteNote(id: number): void;

  getChores(): Chore[];
  addChore(chore: InsertChore): Chore;
  updateChore(id: number, chore: Partial<InsertChore>): Chore;
  deleteChore(id: number): void;
}

export const storage: IStorage = {
  getSetting(key) {
    return db.select().from(settings).where(eq(settings.key, key)).get()?.value ?? null;
  },
  setSetting(key, value) {
    const existing = db.select().from(settings).where(eq(settings.key, key)).get();
    if (existing) { db.update(settings).set({ value }).where(eq(settings.key, key)).run(); }
    else { db.insert(settings).values({ key, value }).run(); }
  },

  getSavingsEntries() { return db.select().from(savingsEntries).all(); },
  addSavingsEntry(entry) { return db.insert(savingsEntries).values(entry).returning().get(); },
  deleteSavingsEntry(id) { db.delete(savingsEntries).where(eq(savingsEntries.id, id)).run(); },

  getBudgetEntry(month) { return db.select().from(budgetEntries).where(eq(budgetEntries.month, month)).get(); },
  upsertBudgetEntry(entry) {
    const existing = db.select().from(budgetEntries).where(eq(budgetEntries.month, entry.month)).get();
    if (existing) {
      db.update(budgetEntries).set(entry).where(eq(budgetEntries.month, entry.month)).run();
      return db.select().from(budgetEntries).where(eq(budgetEntries.month, entry.month)).get()!;
    }
    return db.insert(budgetEntries).values(entry).returning().get();
  },

  getCategories() { return db.select().from(categories).all(); },
  addCategory(cat) { return db.insert(categories).values(cat).returning().get(); },
  deleteCategory(id) { db.delete(categories).where(eq(categories.id, id)).run(); },

  getMonthlyFixedCosts() { return db.select().from(monthlyFixedCosts).all(); },
  addMonthlyFixedCost(cost) { return db.insert(monthlyFixedCosts).values(cost).returning().get(); },
  updateMonthlyFixedCost(id, cost) {
    db.update(monthlyFixedCosts).set(cost).where(eq(monthlyFixedCosts.id, id)).run();
    return db.select().from(monthlyFixedCosts).where(eq(monthlyFixedCosts.id, id)).get()!;
  },
  deleteMonthlyFixedCost(id) {
    db.delete(monthlyFixedCosts).where(eq(monthlyFixedCosts.id, id)).run();
    db.delete(monthlyFixedCostChecks).where(eq(monthlyFixedCostChecks.costId, id)).run();
  },
  getMonthlyFixedCostChecks(month) { return db.select().from(monthlyFixedCostChecks).where(eq(monthlyFixedCostChecks.month, month)).all(); },
  toggleMonthlyFixedCostCheck(costId, month, checked) {
    const existing = db.select().from(monthlyFixedCostChecks)
      .where(and(eq(monthlyFixedCostChecks.costId, costId), eq(monthlyFixedCostChecks.month, month))).get();
    if (existing) {
      db.update(monthlyFixedCostChecks).set({ checked }).where(eq(monthlyFixedCostChecks.id, existing.id)).run();
      return db.select().from(monthlyFixedCostChecks).where(eq(monthlyFixedCostChecks.id, existing.id)).get()!;
    }
    return db.insert(monthlyFixedCostChecks).values({ costId, month, checked }).returning().get();
  },

  getAnnualFixedCosts() { return db.select().from(annualFixedCosts).all(); },
  addAnnualFixedCost(cost) { return db.insert(annualFixedCosts).values(cost).returning().get(); },
  updateAnnualFixedCost(id, cost) {
    db.update(annualFixedCosts).set(cost).where(eq(annualFixedCosts.id, id)).run();
    return db.select().from(annualFixedCosts).where(eq(annualFixedCosts.id, id)).get()!;
  },
  deleteAnnualFixedCost(id) {
    db.delete(annualFixedCosts).where(eq(annualFixedCosts.id, id)).run();
    db.delete(annualFixedCostChecks).where(eq(annualFixedCostChecks.costId, id)).run();
  },
  getAnnualFixedCostChecks(year) { return db.select().from(annualFixedCostChecks).where(eq(annualFixedCostChecks.year, year)).all(); },
  toggleAnnualFixedCostCheck(costId, year, checked) {
    const existing = db.select().from(annualFixedCostChecks)
      .where(and(eq(annualFixedCostChecks.costId, costId), eq(annualFixedCostChecks.year, year))).get();
    if (existing) {
      db.update(annualFixedCostChecks).set({ checked }).where(eq(annualFixedCostChecks.id, existing.id)).run();
      return db.select().from(annualFixedCostChecks).where(eq(annualFixedCostChecks.id, existing.id)).get()!;
    }
    return db.insert(annualFixedCostChecks).values({ costId, year, checked }).returning().get();
  },

  getExpenses(month) { return db.select().from(expenses).where(eq(expenses.month, month)).all(); },
  addExpense(expense) { return db.insert(expenses).values(expense).returning().get(); },
  deleteExpense(id) { db.delete(expenses).where(eq(expenses.id, id)).run(); },

  getTiktokPosts() { return db.select().from(tiktokPosts).all(); },
  addTiktokPost(post) { return db.insert(tiktokPosts).values(post).returning().get(); },
  updateTiktokPost(id, post) {
    db.update(tiktokPosts).set(post).where(eq(tiktokPosts.id, id)).run();
    return db.select().from(tiktokPosts).where(eq(tiktokPosts.id, id)).get()!;
  },
  deleteTiktokPost(id) { db.delete(tiktokPosts).where(eq(tiktokPosts.id, id)).run(); },

  getContentIdeas() { return db.select().from(contentIdeas).all(); },
  addContentIdea(idea) { return db.insert(contentIdeas).values(idea).returning().get(); },
  updateContentIdea(id, idea) {
    db.update(contentIdeas).set(idea).where(eq(contentIdeas.id, id)).run();
    return db.select().from(contentIdeas).where(eq(contentIdeas.id, id)).get()!;
  },
  deleteContentIdea(id) { db.delete(contentIdeas).where(eq(contentIdeas.id, id)).run(); },

  getDateIdeas() { return db.select().from(dateIdeas).all(); },
  addDateIdea(idea) { return db.insert(dateIdeas).values(idea).returning().get(); },
  updateDateIdea(id, idea) {
    db.update(dateIdeas).set(idea).where(eq(dateIdeas.id, id)).run();
    return db.select().from(dateIdeas).where(eq(dateIdeas.id, id)).get()!;
  },
  deleteDateIdea(id) { db.delete(dateIdeas).where(eq(dateIdeas.id, id)).run(); },

  getReminders() { return db.select().from(reminders).all(); },
  addReminder(reminder) { return db.insert(reminders).values(reminder).returning().get(); },
  updateReminder(id, reminder) {
    db.update(reminders).set(reminder).where(eq(reminders.id, id)).run();
    return db.select().from(reminders).where(eq(reminders.id, id)).get()!;
  },
  deleteReminder(id) { db.delete(reminders).where(eq(reminders.id, id)).run(); },

  getNotes() { return db.select().from(notes).all(); },
  addNote(note) { return db.insert(notes).values(note).returning().get(); },
  updateNote(id, note) {
    db.update(notes).set(note).where(eq(notes.id, id)).run();
    return db.select().from(notes).where(eq(notes.id, id)).get()!;
  },
  deleteNote(id) { db.delete(notes).where(eq(notes.id, id)).run(); },

  getChores() { return db.select().from(chores).all(); },
  addChore(chore) { return db.insert(chores).values(chore).returning().get(); },
  updateChore(id, chore) {
    db.update(chores).set(chore).where(eq(chores.id, id)).run();
    return db.select().from(chores).where(eq(chores.id, id)).get()!;
  },
  deleteChore(id) { db.delete(chores).where(eq(chores.id, id)).run(); },

  getPRs() { return db.select().from(trainingPRs).all(); },
  addPR(pr: InsertTrainingPR) { return db.insert(trainingPRs).values(pr).returning().get(); },
  updatePR(id: number, pr: Partial<InsertTrainingPR>) {
    db.update(trainingPRs).set(pr).where(eq(trainingPRs.id, id)).run();
    return db.select().from(trainingPRs).where(eq(trainingPRs.id, id)).get()!;
  },
  deletePR(id: number) { db.delete(trainingPRs).where(eq(trainingPRs.id, id)).run(); },

  getShoppingItems() { return db.select().from(shoppingItems).all(); },
  addShoppingItem(item: InsertShoppingItem) { return db.insert(shoppingItems).values({ ...item, addedAt: new Date().toISOString() } as any).returning().get(); },
  updateShoppingItem(id: number, item: Partial<InsertShoppingItem>) {
    db.update(shoppingItems).set(item).where(eq(shoppingItems.id, id)).run();
    return db.select().from(shoppingItems).where(eq(shoppingItems.id, id)).get()!;
  },
  deleteShoppingItem(id: number) { db.delete(shoppingItems).where(eq(shoppingItems.id, id)).run(); },
  clearCheckedItems() { db.delete(shoppingItems).where(eq(shoppingItems.checked, true)).run(); },

  getCountdowns() { return db.select().from(countdowns).all(); },
  addCountdown(c: InsertCountdown) { return db.insert(countdowns).values(c).returning().get(); },
  updateCountdown(id: number, c: Partial<InsertCountdown>) {
    db.update(countdowns).set(c).where(eq(countdowns.id, id)).run();
    return db.select().from(countdowns).where(eq(countdowns.id, id)).get()!;
  },
  deleteCountdown(id: number) { db.delete(countdowns).where(eq(countdowns.id, id)).run(); },

  // ── Schulungswochen ────────────────────────────────────────────────────────
  getTrainingWeeks(year: number) { return db.select().from(trainingWeeks).where(eq(trainingWeeks.year, year)).all(); },
  addTrainingWeek(tw: InsertTrainingWeek) { return db.insert(trainingWeeks).values(tw).returning().get(); },
  updateTrainingWeek(id: number, tw: Partial<InsertTrainingWeek>) {
    db.update(trainingWeeks).set(tw).where(eq(trainingWeeks.id, id)).run();
    return db.select().from(trainingWeeks).where(eq(trainingWeeks.id, id)).get()!;
  },
  deleteTrainingWeek(id: number) { db.delete(trainingWeeks).where(eq(trainingWeeks.id, id)).run(); },

  // ── Urlaubstage ────────────────────────────────────────────────────────────
  getVacationDays(year: number) { return db.select().from(vacationDays).where(eq(vacationDays.year, year)).all(); },
  addVacationDay(vd: InsertVacationDay) { return db.insert(vacationDays).values(vd).returning().get(); },
  deleteVacationDay(id: number) { db.delete(vacationDays).where(eq(vacationDays.id, id)).run(); },
  deleteVacationDayByDate(year: number, date: string) {
    db.delete(vacationDays).where(and(eq(vacationDays.year, year), eq(vacationDays.date, date))).run();
  },
  getVacationConfig(year: number) { return db.select().from(vacationConfig).where(eq(vacationConfig.year, year)).get() ?? null; },
  setVacationConfig(year: number, totalDays: number) {
    const existing = db.select().from(vacationConfig).where(eq(vacationConfig.year, year)).get();
    if (existing) {
      db.update(vacationConfig).set({ totalDays }).where(eq(vacationConfig.year, year)).run();
    } else {
      db.insert(vacationConfig).values({ year, totalDays }).run();
    }
    return db.select().from(vacationConfig).where(eq(vacationConfig.year, year)).get()!;
  },

  // ── Export / Import ────────────────────────────────────────────────────────
  exportAll() {
    return {
      _version: 1,
      _exported: new Date().toISOString(),
      settings: db.select().from(settings).all(),
      savingsEntries: db.select().from(savingsEntries).all(),
      budgetEntries: db.select().from(budgetEntries).all(),
      categories: db.select().from(categories).all(),
      monthlyFixedCosts: db.select().from(monthlyFixedCosts).all(),
      monthlyFixedCostChecks: db.select().from(monthlyFixedCostChecks).all(),
      annualFixedCosts: db.select().from(annualFixedCosts).all(),
      annualFixedCostChecks: db.select().from(annualFixedCostChecks).all(),
      expenses: db.select().from(expenses).all(),
      tiktokPosts: db.select().from(tiktokPosts).all(),
      contentIdeas: db.select().from(contentIdeas).all(),
      dateIdeas: db.select().from(dateIdeas).all(),
      reminders: db.select().from(reminders).all(),
      notes: db.select().from(notes).all(),
      chores: db.select().from(chores).all(),
      trainingPRs: db.select().from(trainingPRs).all(),
      shoppingItems: db.select().from(shoppingItems).all(),
      countdowns: db.select().from(countdowns).all(),
      trainingWeeks: db.select().from(trainingWeeks).all(),
      vacationDays: db.select().from(vacationDays).all(),
      vacationConfig: db.select().from(vacationConfig).all(),
    };
  },

  resetAll() {
    const tables = [
      settings, savingsEntries, budgetEntries, categories,
      monthlyFixedCosts, monthlyFixedCostChecks,
      annualFixedCosts, annualFixedCostChecks,
      expenses, tiktokPosts, contentIdeas, dateIdeas,
      reminders, notes, chores, trainingPRs,
      shoppingItems, countdowns, trainingWeeks, vacationDays, vacationConfig,
    ] as any[];
    const run = sqlite.transaction(() => { for (const tbl of tables) db.delete(tbl).run(); });
    run();
  },

  importAll(data: ReturnType<typeof storage.exportAll>) {
    // Wipe all tables and re-insert
    const tables = [
      { tbl: settings,                rows: data.settings },
      { tbl: savingsEntries,          rows: data.savingsEntries },
      { tbl: budgetEntries,           rows: data.budgetEntries },
      { tbl: categories,              rows: data.categories },
      { tbl: monthlyFixedCosts,       rows: data.monthlyFixedCosts },
      { tbl: monthlyFixedCostChecks,  rows: data.monthlyFixedCostChecks },
      { tbl: annualFixedCosts,        rows: data.annualFixedCosts },
      { tbl: annualFixedCostChecks,   rows: data.annualFixedCostChecks },
      { tbl: expenses,                rows: data.expenses },
      { tbl: tiktokPosts,             rows: data.tiktokPosts },
      { tbl: contentIdeas,            rows: data.contentIdeas },
      { tbl: dateIdeas,               rows: data.dateIdeas },
      { tbl: reminders,               rows: data.reminders },
      { tbl: notes,                   rows: data.notes },
      { tbl: chores,                  rows: data.chores },
      { tbl: trainingPRs,             rows: data.trainingPRs },
      { tbl: shoppingItems,           rows: data.shoppingItems },
      { tbl: countdowns,              rows: data.countdowns },
      { tbl: trainingWeeks,           rows: data.trainingWeeks },
      { tbl: vacationDays,            rows: data.vacationDays },
      { tbl: vacationConfig,          rows: data.vacationConfig },
    ] as { tbl: any; rows: any[] }[];

    const runImport = sqlite.transaction(() => {
      for (const { tbl, rows } of tables) {
        db.delete(tbl).run();
        if (rows && rows.length > 0) {
          db.insert(tbl).values(rows).run();
        }
      }
    });
    runImport();
  },
};
