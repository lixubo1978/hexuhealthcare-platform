import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";

export const leads = sqliteTable("cooperation_leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  provinceCode: text("province_code").notNull(),
  province: text("province").notNull(),
  cityCode: text("city_code").notNull(),
  city: text("city").notNull(),
  countyCode: text("county_code").notNull(),
  county: text("county").notNull(),
  status: text("status").notNull().default("new"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  contactedAt: text("contacted_at"),
});

export const disputes = sqliteTable("service_disputes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderRef: text("order_ref").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  role: text("role").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("new"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  contactedAt: text("contacted_at"),
});

export const guideApplications = sqliteTable("guide_applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), phone: text("phone").notNull(),
  applicantType: text("applicant_type").notNull(), otherType: text("other_type").notNull().default(""),
  province: text("province").notNull(), city: text("city").notNull(), county: text("county").notNull(),
  interests: text("interests").notNull(), message: text("message").notNull(),
  status: text("status").notNull().default("new"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, t => [index("idx_guide_applications_phone_created").on(t.phone,t.createdAt),index("idx_guide_applications_status").on(t.status)]);
export const guideMedia = sqliteTable("guide_media", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(), kind: text("kind").notNull(),
  title: text("title").notNull(), url: text("url").notNull(),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const guideTemplates = sqliteTable("guide_templates", {
  id: text("id").primaryKey(), category: text("category").notNull(), title: text("title").notNull(),
  filename: text("filename").notNull(), mime: text("mime").notNull(), objectKey: text("object_key").notNull(),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const guideGrants = sqliteTable("guide_grants", {
  id: text("id").primaryKey(), templateId: text("template_id").notNull(), email: text("email").notNull(),
  grantedBy: text("granted_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, t => [index("idx_guide_grants_email_template").on(t.email,t.templateId)]);

export const storefronts = sqliteTable("storefronts", {
  id: text("id").primaryKey(), name: text("name").notNull(),
  region: text("region").notNull(), description: text("description").notNull(),
  coverUrl: text("cover_url").notNull(), interiorUrls: text("interior_urls").notNull(),
  projects: text("projects").notNull(), featuredRank: integer("featured_rank").notNull().default(0),
  published: integer("published").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, t => [index("idx_storefronts_published_rank").on(t.published,t.featuredRank)]);

export const showcaseContent = sqliteTable("showcase_content", {
 id: text("id").primaryKey(), kind: text("kind").notNull(),
 title: text("title").notNull(), city: text("city").notNull().default(""),
 description: text("description").notNull(), image: text("image").notNull().default(""),
 link: text("link").notNull().default(""), qr: text("qr").notNull().default(""),
 tags: text("tags").notNull().default(""), sop: text("sop").notNull().default(""),
 published: integer("published").notNull().default(0),
 updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, t=>[index("idx_showcase_published_kind_city").on(t.published,t.kind,t.city)]);
