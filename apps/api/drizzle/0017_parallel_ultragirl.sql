CREATE TABLE "deleted_accounts" (
	"uid_hash" text PRIMARY KEY NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL
);
