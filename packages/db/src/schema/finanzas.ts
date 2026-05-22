import { date, integer, numeric, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from './_shared';
import {
  budgetLineTypeEnum,
  budgetMethodologyEnum,
  budgetStatusEnum,
  expenseStatusEnum,
  monedaEnum,
  reminderRecurrenceEnum,
  reminderStatusEnum,
} from './enums';

export const budgets = pgTable('budgets', {
  id: id(),
  year: integer('year').notNull().unique(),
  status: budgetStatusEnum('status').notNull().default('Borrador'),
  methodology: budgetMethodologyEnum('methodology').notNull().default('Top-Down'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const budgetLines = pgTable('budget_lines', {
  id: id(),
  budgetId: uuid('budget_id')
    .notNull()
    .references(() => budgets.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  itemName: text('item_name').notNull(),
  type: budgetLineTypeEnum('type').notNull(),
  // 12 meses como numeric[]
  monthlyAmounts: numeric('monthly_amounts', { precision: 14, scale: 2 }).array().notNull(),
  totalAnnual: numeric('total_annual', { precision: 14, scale: 2 }).notNull().default('0'),
  responsible: text('responsible'),
});

export const incomeProjections = pgTable(
  'income_projections',
  {
    id: id(),
    year: integer('year').notNull(),
    growthRate: numeric('growth_rate', { precision: 6, scale: 2 }).notNull().default('15'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({ yearUnique: uniqueIndex('income_projections_year_unique').on(t.year) }),
);

export const incomeMonths = pgTable(
  'income_months',
  {
    id: id(),
    projectionId: uuid('projection_id')
      .notNull()
      .references(() => incomeProjections.id, { onDelete: 'cascade' }),
    month: integer('month').notNull(), // 1-12
    projection: numeric('projection', { precision: 14, scale: 2 }).notNull().default('0'),
    reality: numeric('reality', { precision: 14, scale: 2 }).notNull().default('0'),
  },
  (t) => ({
    projectionMonthUnique: uniqueIndex('income_months_proj_month_unique').on(
      t.projectionId,
      t.month,
    ),
  }),
);

export const expenses = pgTable('expenses', {
  id: id(),
  date: date('date').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: monedaEnum('currency').notNull().default('USD'),
  tasaBcv: numeric('tasa_bcv', { precision: 14, scale: 6 }).notNull().default('1'),
  category: text('category').notNull(),
  businessLine: text('business_line').notNull(),
  description: text('description'),
  status: expenseStatusEnum('status').notNull().default('Programado'),
  comprobanteUrl: text('comprobante_url'),
  responsible: text('responsible'),
  createdAt: createdAt(),
});

export const paymentReminders = pgTable('payment_reminders', {
  id: id(),
  title: text('title').notNull(),
  dueDate: date('due_date').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: monedaEnum('currency').notNull().default('USD'),
  responsible: text('responsible').notNull(),
  recurrence: reminderRecurrenceEnum('recurrence').notNull().default('Unica'),
  status: reminderStatusEnum('status').notNull().default('Programado'),
  leadDays: integer('lead_days').array().notNull().default([7, 3, 0]),
  notes: text('notes'),
  createdAt: createdAt(),
});

export type Budget = typeof budgets.$inferSelect;
export type BudgetLine = typeof budgetLines.$inferSelect;
export type IncomeProjection = typeof incomeProjections.$inferSelect;
export type IncomeMonth = typeof incomeMonths.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type PaymentReminder = typeof paymentReminders.$inferSelect;
