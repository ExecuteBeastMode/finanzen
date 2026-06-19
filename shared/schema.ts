import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

// ─── SAVINGS ACCOUNT ─────────────────────────────────────────────────────────
export const savingsEntries = sqliteTable("savings_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  amount: real("amount").notNull(),
  note: text("note"),
  date: text("date").notNull(),
});
export const insertSavingsEntrySchema = createInsertSchema(savingsEntries).omit({ id: true });
export type InsertSavingsEntry = z.infer<typeof insertSavingsEntrySchema>;
export type SavingsEntry = typeof savingsEntries.$inferSelect;

// ─── BUDGET / INCOME ──────────────────────────────────────────────────────────
export const budgetEntries = sqliteTable("budget_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  month: text("month").notNull(),
  income: real("income").notNull().default(0),
  remainingBudget: real("remaining_budget").notNull().default(0),
});
export const insertBudgetEntrySchema = createInsertSchema(budgetEntries).omit({ id: true });
export type InsertBudgetEntry = z.infer<typeof insertBudgetEntrySchema>;
export type BudgetEntry = typeof budgetEntries.$inferSelect;

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#4ade80"),
  icon: text("icon").notNull().default("tag"),
});
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// ─── MONTHLY FIXED COSTS ──────────────────────────────────────────────────────
export const monthlyFixedCosts = sqliteTable("monthly_fixed_costs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  categoryId: integer("category_id"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});
export const insertMonthlyFixedCostSchema = createInsertSchema(monthlyFixedCosts).omit({ id: true });
export type InsertMonthlyFixedCost = z.infer<typeof insertMonthlyFixedCostSchema>;
export type MonthlyFixedCost = typeof monthlyFixedCosts.$inferSelect;

export const monthlyFixedCostChecks = sqliteTable("monthly_fixed_cost_checks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  costId: integer("cost_id").notNull(),
  month: text("month").notNull(),
  checked: integer("checked", { mode: "boolean" }).notNull().default(false),
});
export const insertMonthlyFixedCostCheckSchema = createInsertSchema(monthlyFixedCostChecks).omit({ id: true });
export type InsertMonthlyFixedCostCheck = z.infer<typeof insertMonthlyFixedCostCheckSchema>;
export type MonthlyFixedCostCheck = typeof monthlyFixedCostChecks.$inferSelect;

// ─── ANNUAL FIXED COSTS ───────────────────────────────────────────────────────
export const annualFixedCosts = sqliteTable("annual_fixed_costs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  dueMonth: integer("due_month").notNull(),
  categoryId: integer("category_id"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});
export const insertAnnualFixedCostSchema = createInsertSchema(annualFixedCosts).omit({ id: true });
export type InsertAnnualFixedCost = z.infer<typeof insertAnnualFixedCostSchema>;
export type AnnualFixedCost = typeof annualFixedCosts.$inferSelect;

export const annualFixedCostChecks = sqliteTable("annual_fixed_cost_checks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  costId: integer("cost_id").notNull(),
  year: integer("year").notNull(),
  checked: integer("checked", { mode: "boolean" }).notNull().default(false),
});
export const insertAnnualFixedCostCheckSchema = createInsertSchema(annualFixedCostChecks).omit({ id: true });
export type InsertAnnualFixedCostCheck = z.infer<typeof insertAnnualFixedCostCheckSchema>;
export type AnnualFixedCostCheck = typeof annualFixedCostChecks.$inferSelect;

// ─── VARIABLE EXPENSES (new) ──────────────────────────────────────────────────
export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  category: text("category").notNull().default("sonstiges"),
  month: text("month").notNull(), // YYYY-MM
  date: text("date").notNull(),   // YYYY-MM-DD
  note: text("note"),
});
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

// ─── TIKTOK CONTENT PLANNER ───────────────────────────────────────────────────
export const tiktokPosts = sqliteTable("tiktok_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  hook: text("hook"),
  concept: text("concept"),
  status: text("status").notNull().default("idea"),
  scheduledDate: text("scheduled_date"),
  tags: text("tags").notNull().default("[]"),
  niche: text("niche").notNull().default("calisthenics"),
});
export const insertTiktokPostSchema = createInsertSchema(tiktokPosts).omit({ id: true });
export type InsertTiktokPost = z.infer<typeof insertTiktokPostSchema>;
export type TiktokPost = typeof tiktokPosts.$inferSelect;

// ─── CONTENT IDEAS (new) ──────────────────────────────────────────────────────
export const contentIdeas = sqliteTable("content_ideas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("video"), // video | reel | story | collab | trend
  platform: text("platform").notNull().default("tiktok"),
  priority: text("priority").notNull().default("medium"), // low | medium | high
  tags: text("tags").notNull().default("[]"),
  used: integer("used", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});
export const insertContentIdeaSchema = createInsertSchema(contentIdeas).omit({ id: true });
export type InsertContentIdea = z.infer<typeof insertContentIdeaSchema>;
export type ContentIdea = typeof contentIdeas.$inferSelect;

// ─── DATE IDEAS ───────────────────────────────────────────────────────────────
export const dateIdeas = sqliteTable("date_ideas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("activity"),
  season: text("season").notNull().default("all"),
  estimatedCost: real("estimated_cost").notNull().default(0), // NEW
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  doneDate: text("done_date"),
  rating: integer("rating"),
});
export const insertDateIdeaSchema = createInsertSchema(dateIdeas).omit({ id: true });
export type InsertDateIdea = z.infer<typeof insertDateIdeaSchema>;
export type DateIdea = typeof dateIdeas.$inferSelect;

// ─── REMINDERS / EVENTS ───────────────────────────────────────────────────────
export const reminders = sqliteTable("reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  date: text("date").notNull(),
  type: text("type").notNull().default("reminder"),
  recurring: integer("recurring", { mode: "boolean" }).notNull().default(false),
  note: text("note"),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
});
export const insertReminderSchema = createInsertSchema(reminders).omit({ id: true });
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;

// ─── NOTES / NOTIZBUCH ────────────────────────────────────────────────────────
export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull().default("Neue Notiz"),
  content: text("content").notNull().default(""),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  color: text("color").notNull().default("default"), // default | green | yellow | red | blue
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true });
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

// ─── HAUSHALTSAUFGABEN ────────────────────────────────────────────────────────
export const chores = sqliteTable("chores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  category: text("category").notNull().default("allgemein"), // allgemein | küche | bad | wohnzimmer | draußen | wäsche | einkauf
  frequency: text("frequency").notNull().default("weekly"),  // daily | weekly | biweekly | monthly | asNeeded
  lastDone: text("last_done"),   // YYYY-MM-DD
  nextDue: text("next_due"),     // YYYY-MM-DD
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  note: text("note"),
  priority: text("priority").notNull().default("medium"), // low | medium | high
});
export const insertChoreSchema = createInsertSchema(chores).omit({ id: true });
export type InsertChore = z.infer<typeof insertChoreSchema>;
export type Chore = typeof chores.$inferSelect;

// ─── TRAINING PRs ─────────────────────────────────────────────────────────────
export const trainingPRs = sqliteTable("training_prs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  exercise: text("exercise").notNull(),           // e.g. "Klimmzüge"
  category: text("category").notNull().default("upper"), // upper | lower | core | full
  value: real("value").notNull(),                 // weight in kg OR reps
  unit: text("unit").notNull().default("kg"),     // kg | reps | sek
  note: text("note"),
  date: text("date").notNull(),                   // YYYY-MM-DD
});
export const insertTrainingPRSchema = createInsertSchema(trainingPRs).omit({ id: true });
export type InsertTrainingPR = z.infer<typeof insertTrainingPRSchema>;
export type TrainingPR = typeof trainingPRs.$inferSelect;

// ─── EINKAUFSLISTE ────────────────────────────────────────────────────────────
export const shoppingItems = sqliteTable("shopping_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  quantity: text("quantity"),               // "2x", "500g", etc.
  category: text("category").notNull().default("sonstiges"), // obst | gemüse | milch | fleisch | getränke | haushalt | sonstiges
  checked: integer("checked", { mode: "boolean" }).notNull().default(false),
  note: text("note"),
  addedAt: text("added_at"),
});
export const insertShoppingItemSchema = createInsertSchema(shoppingItems).omit({ id: true, addedAt: true });
export type InsertShoppingItem = z.infer<typeof insertShoppingItemSchema>;
export type ShoppingItem = typeof shoppingItems.$inferSelect;

// ─── COUNTDOWNS ───────────────────────────────────────────────────────────────
export const countdowns = sqliteTable("countdowns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  date: text("date").notNull(),             // YYYY-MM-DD
  emoji: text("emoji").notNull().default("🎯"),
  color: text("color").notNull().default("green"), // green | blue | red | purple | orange
  note: text("note"),
});
export const insertCountdownSchema = createInsertSchema(countdowns).omit({ id: true });
export type InsertCountdown = z.infer<typeof insertCountdownSchema>;
export type Countdown = typeof countdowns.$inferSelect;

// ─── SCHULUNGSWOCHEN ──────────────────────────────────────────────────────────
export const trainingWeeks = sqliteTable("training_weeks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  year: integer("year").notNull(),
  week: integer("week").notNull(),       // ISO week number 1–53
  label: text("label"),                  // optional label e.g. "React Kurs"
  note: text("note"),
});
export const insertTrainingWeekSchema = createInsertSchema(trainingWeeks).omit({ id: true });
export type InsertTrainingWeek = z.infer<typeof insertTrainingWeekSchema>;
export type TrainingWeek = typeof trainingWeeks.$inferSelect;

// ─── URLAUBSTAGE ──────────────────────────────────────────────────────────────
export const vacationDays = sqliteTable("vacation_days", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  year: integer("year").notNull(),
  date: text("date").notNull(),          // YYYY-MM-DD
  note: text("note"),
});
export const vacationConfig = sqliteTable("vacation_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  year: integer("year").notNull().unique(),
  totalDays: integer("total_days").notNull().default(28),
});
export const insertVacationDaySchema = createInsertSchema(vacationDays).omit({ id: true });
export type InsertVacationDay = z.infer<typeof insertVacationDaySchema>;
export type VacationDay = typeof vacationDays.$inferSelect;
export type VacationConfig = typeof vacationConfig.$inferSelect;
