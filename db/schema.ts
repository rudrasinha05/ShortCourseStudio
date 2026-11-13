import {sqliteTable,text,integer,uniqueIndex,primaryKey} from "drizzle-orm/sqlite-core";
export const settings = sqliteTable("course_settings",{
 slug:text().primaryKey(), title:text(), blurb:text(), outcome:text(), days:text(), schedule:text().notNull().default(""), mode:text().notNull().default(""), batch:text().notNull().default("batch-1"), status:text().notNull().default("soon")
});
export const applications = sqliteTable("applications",{
 id:text().primaryKey(), tokenHash:text("token_hash").notNull(), slug:text().notNull(), batch:text().notNull(),
 name:text().notNull(), email:text().notNull(), college:text().notNull(),
 createdAt:text("created_at").notNull(), amount:integer().notNull(), orderId:text("order_id").unique(), paymentId:text("payment_id").unique(),
 classAccess:integer("class_access").notNull().default(0),
 reviewState:text("review_state").notNull().default("submitted"),
 paymentState:text("payment_state").notNull().default("unpaid"),
},t=>[uniqueIndex("applications_course_batch_email").on(t.slug,t.batch,t.email)]);

export const classSessions = sqliteTable("class_sessions",{
 slug:text().notNull(),batch:text().notNull(),day:integer().notNull(),
 startsAt:text("starts_at").notNull().default(""),endsAt:text("ends_at").notNull().default(""),
 liveUrl:text("live_url").notNull().default(""),replayUrl:text("replay_url").notNull().default(""),
},t=>[primaryKey({columns:[t.slug,t.batch,t.day]})]);

export const courseBanners = sqliteTable("course_banners",{
 slug:text().notNull(),batch:text().notNull(),faculty:text().notNull().default(""),
 qualification:text().notNull().default(""),profile:text().notNull().default(""),
 photo:text().notNull().default(""),startsAt:text("starts_at").notNull().default(""),
 timing:text().notNull().default(""),visible:integer().notNull().default(1)
},t=>[primaryKey({columns:[t.slug,t.batch]})]);
