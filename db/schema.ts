import { pgTable, serial, text, timestamp, integer, boolean, real, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum('role', ['patient', 'pharmacist']);
export const subscriptionEnum = pgEnum('subscription_type', ['monthly', 'yearly', 'premium']);
export const prescriptionStatusEnum = pgEnum('prescription_status', ['pending', 'assigned', 'fulfilled']);
export const pharmacyPrescriptionStatusEnum = pgEnum('pharmacy_prescription_status', ['pending', 'accepted', 'rejected', 'fulfilled', 'fulfillment_requested']);
export const availabilityResponseEnum = pgEnum('availability_response', ['not_available', 'same_medicine_available', 'same_salt_different_company']);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default('patient'),
  phone: text("phone"),
  address: text("address"),
  location: text("location"), // pharmacy store location for pharmacists
  subscriptionType: subscriptionEnum("subscription_type"),
  subscriptionStart: timestamp("subscription_start"),
  subscriptionEnd: timestamp("subscription_end"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pharmacies = pgTable("pharmacies", {
  id: serial("id").primaryKey(),
  pharmacistId: integer("pharmacist_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address").notNull(),
  location: text("location").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  supportsPrescriptionUpload: boolean("supports_prescription_upload").default(false),
  isUsingService: boolean("is_using_service").default(false),
  subscriptionType: subscriptionEnum("subscription_type"),
  rating: real("rating").default(0),
  reviewCount: integer("review_count").default(0),
  operatingHours: jsonb("operating_hours"), // json storing the days
  services: jsonb("services"), // array of strings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  patientName: text("patient_name").notNull(),
  patientEmail: text("patient_email").notNull(),
  patientPhone: text("patient_phone"),
  patientAddress: text("patient_address"),
  prescriptionImages: jsonb("prescription_images"), // Array of base64 images
  notes: text("notes"),
  status: prescriptionStatusEnum("status").default('pending'),
  location: text("location").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const prescriptionPharmacies = pgTable("prescription_pharmacies", {
  id: serial("id").primaryKey(),
  prescriptionId: integer("prescription_id").notNull().references(() => prescriptions.id, { onDelete: 'cascade' }),
  pharmacistId: integer("pharmacist_id").notNull().references(() => users.id),
  status: pharmacyPrescriptionStatusEnum("status").default('pending'),
  availabilityResponse: availabilityResponseEnum("availability_response"),
  pharmacistMessage: text("pharmacist_message").default(''),
  assignedAt: timestamp("assigned_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});