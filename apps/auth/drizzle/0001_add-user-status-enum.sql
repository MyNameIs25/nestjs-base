CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."user_status";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DATA TYPE "public"."user_status" USING "status"::"public"."user_status";--> statement-breakpoint
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_user_auth_methods_updated_at
  BEFORE UPDATE ON "user_auth_methods"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();