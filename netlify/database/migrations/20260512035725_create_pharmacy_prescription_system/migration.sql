CREATE TYPE "availability_response" AS ENUM('not_available', 'same_medicine_available', 'same_salt_different_company');--> statement-breakpoint
CREATE TYPE "pharmacy_prescription_status" AS ENUM('pending', 'accepted', 'rejected', 'fulfilled', 'fulfillment_requested');--> statement-breakpoint
CREATE TYPE "prescription_status" AS ENUM('pending', 'assigned', 'fulfilled');--> statement-breakpoint
CREATE TYPE "role" AS ENUM('patient', 'pharmacist');--> statement-breakpoint
CREATE TYPE "subscription_type" AS ENUM('monthly', 'yearly', 'premium');--> statement-breakpoint
CREATE TABLE "pharmacies" (
	"id" serial PRIMARY KEY,
	"pharmacist_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"address" text NOT NULL,
	"location" text NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"supports_prescription_upload" boolean DEFAULT false,
	"is_using_service" boolean DEFAULT false,
	"subscription_type" "subscription_type",
	"rating" real DEFAULT 0,
	"review_count" integer DEFAULT 0,
	"operating_hours" jsonb,
	"services" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prescription_pharmacies" (
	"id" serial PRIMARY KEY,
	"prescription_id" integer NOT NULL,
	"pharmacist_id" integer NOT NULL,
	"status" "pharmacy_prescription_status" DEFAULT 'pending'::"pharmacy_prescription_status",
	"availability_response" "availability_response",
	"pharmacist_message" text DEFAULT '',
	"assigned_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" serial PRIMARY KEY,
	"patient_name" text NOT NULL,
	"patient_email" text NOT NULL,
	"patient_phone" text,
	"patient_address" text,
	"prescription_images" jsonb,
	"notes" text,
	"status" "prescription_status" DEFAULT 'pending'::"prescription_status",
	"location" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"password" text NOT NULL,
	"role" "role" DEFAULT 'patient'::"role" NOT NULL,
	"phone" text,
	"address" text,
	"location" text,
	"subscription_type" "subscription_type",
	"subscription_start" timestamp,
	"subscription_end" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "pharmacies" ADD CONSTRAINT "pharmacies_pharmacist_id_users_id_fkey" FOREIGN KEY ("pharmacist_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "prescription_pharmacies" ADD CONSTRAINT "prescription_pharmacies_prescription_id_prescriptions_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "prescription_pharmacies" ADD CONSTRAINT "prescription_pharmacies_pharmacist_id_users_id_fkey" FOREIGN KEY ("pharmacist_id") REFERENCES "users"("id");