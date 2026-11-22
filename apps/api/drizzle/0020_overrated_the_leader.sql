CREATE TABLE "passage_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"is_correct" boolean NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "passage_answers_user_question_unique" UNIQUE("user_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "passage_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"key" text NOT NULL,
	"position" integer NOT NULL,
	"text" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"trap_type" text,
	"explanation" text NOT NULL,
	CONSTRAINT "passage_options_question_id_id_unique" UNIQUE("question_id","id"),
	CONSTRAINT "passage_options_position_unique" UNIQUE("question_id","position"),
	CONSTRAINT "passage_options_key_unique" UNIQUE("question_id","key"),
	CONSTRAINT "passage_options_position_non_negative_check" CHECK ("passage_options"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "passage_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"passage_id" uuid NOT NULL,
	"key" text NOT NULL,
	"position" integer NOT NULL,
	"type" text NOT NULL,
	"prompt" text NOT NULL,
	CONSTRAINT "passage_questions_position_unique" UNIQUE("passage_id","position"),
	CONSTRAINT "passage_questions_key_unique" UNIQUE("passage_id","key"),
	CONSTRAINT "passage_questions_position_positive_check" CHECK ("passage_questions"."position" >= 1)
);
--> statement-breakpoint
CREATE TABLE "passage_word_spans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"passage_id" uuid NOT NULL,
	"paragraph_index" integer NOT NULL,
	"start" integer NOT NULL,
	"end" integer NOT NULL,
	"word_id" uuid NOT NULL,
	"surface" text NOT NULL,
	CONSTRAINT "passage_word_spans_start_unique" UNIQUE("passage_id","paragraph_index","start"),
	CONSTRAINT "passage_word_spans_range_check" CHECK ("passage_word_spans"."paragraph_index" >= 0 and "passage_word_spans"."start" >= 0 and "passage_word_spans"."end" > "passage_word_spans"."start")
);
--> statement-breakpoint
CREATE TABLE "passage_words" (
	"passage_id" uuid NOT NULL,
	"word_id" uuid NOT NULL,
	"context_sentence" text NOT NULL,
	CONSTRAINT "passage_words_passage_id_word_id_pk" PRIMARY KEY("passage_id","word_id")
);
--> statement-breakpoint
CREATE TABLE "passages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"level" text NOT NULL,
	"title" text NOT NULL,
	"topic" text NOT NULL,
	"paragraphs" text[] NOT NULL,
	"sort_order" integer NOT NULL,
	"is_free_sample" boolean DEFAULT false NOT NULL,
	"content_revision" integer DEFAULT 1 NOT NULL,
	"content_hash" text NOT NULL,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "passages_slug_unique" UNIQUE("slug"),
	CONSTRAINT "passages_level_check" CHECK ("passages"."level" in ('B1', 'B2', 'C1', 'C2')),
	CONSTRAINT "passages_paragraphs_not_empty_check" CHECK (cardinality("passages"."paragraphs") > 0)
);
--> statement-breakpoint
ALTER TABLE "passage_answers" ADD CONSTRAINT "passage_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passage_answers" ADD CONSTRAINT "passage_answers_question_option_fk" FOREIGN KEY ("question_id","option_id") REFERENCES "public"."passage_options"("question_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passage_options" ADD CONSTRAINT "passage_options_question_id_passage_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."passage_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passage_questions" ADD CONSTRAINT "passage_questions_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passage_word_spans" ADD CONSTRAINT "passage_word_spans_passage_word_fk" FOREIGN KEY ("passage_id","word_id") REFERENCES "public"."passage_words"("passage_id","word_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passage_words" ADD CONSTRAINT "passage_words_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passage_words" ADD CONSTRAINT "passage_words_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "passage_options_one_correct_per_question" ON "passage_options" USING btree ("question_id") WHERE "passage_options"."is_correct" = true;--> statement-breakpoint
CREATE INDEX "passages_level_sort_order_id_idx" ON "passages" USING btree ("level","sort_order","id");