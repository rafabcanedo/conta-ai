CREATE TABLE "credit_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"card_limit" integer DEFAULT 0 NOT NULL,
	"closing_day" integer NOT NULL,
	"due_day" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "credit_cards_closing_day_check" CHECK ("credit_cards"."closing_day" BETWEEN 1 AND 31),
	CONSTRAINT "credit_cards_due_day_check" CHECK ("credit_cards"."due_day" BETWEEN 1 AND 31)
);
--> statement-breakpoint
CREATE TABLE "recurring_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" varchar(255) NOT NULL,
	"amount" integer NOT NULL,
	"category" varchar(50) NOT NULL,
	"type" varchar(20) NOT NULL,
	"account_type" varchar(20) NOT NULL,
	"day_of_month" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_rules_category_check" CHECK ("recurring_rules"."category" IN ('house', 'food', 'transport', 'health', 'payment', 'receive')),
	CONSTRAINT "recurring_rules_type_check" CHECK ("recurring_rules"."type" IN ('income', 'expense')),
	CONSTRAINT "recurring_rules_account_type_check" CHECK ("recurring_rules"."account_type" IN ('wallet', 'credit_card')),
	CONSTRAINT "recurring_rules_day_of_month_check" CHECK ("recurring_rules"."day_of_month" BETWEEN 1 AND 31)
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"last_recurring_check" varchar(7) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" varchar(255) NOT NULL,
	"amount" integer NOT NULL,
	"category" varchar(50) NOT NULL,
	"type" varchar(20) NOT NULL,
	"status" varchar(20) NOT NULL,
	"account_type" varchar(20) NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"transaction_date" date NOT NULL,
	"recurring_rule_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_category_check" CHECK ("transactions"."category" IN ('house', 'food', 'transport', 'health', 'payment', 'receive')),
	CONSTRAINT "transactions_type_check" CHECK ("transactions"."type" IN ('income', 'expense')),
	CONSTRAINT "transactions_status_check" CHECK ("transactions"."status" IN ('pending', 'completed')),
	CONSTRAINT "transactions_account_type_check" CHECK ("transactions"."account_type" IN ('wallet', 'credit_card'))
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_rule_id_recurring_rules_id_fk" FOREIGN KEY ("recurring_rule_id") REFERENCES "public"."recurring_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transactions_type_idx" ON "transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "transactions_account_type_idx" ON "transactions" USING btree ("account_type");--> statement-breakpoint
CREATE INDEX "transactions_date_idx" ON "transactions" USING btree ("transaction_date");