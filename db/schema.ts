import {sqliteTable,text,integer,uniqueIndex,primaryKey,index} from "drizzle-orm/sqlite-core";
export const settings = sqliteTable("course_settings",{
 slug:text().primaryKey(), title:text(), blurb:text(), outcome:text(), days:text(), schedule:text().notNull().default(""), mode:text().notNull().default(""), batch:text().notNull().default("batch-1"), status:text().notNull().default("soon")
});
export const applications = sqliteTable("applications",{
 id:text().primaryKey(), tokenHash:text("token_hash").notNull(), slug:text().notNull(), batch:text().notNull(),
 name:text().notNull(), email:text().notNull(), college:text().notNull(),
 createdAt:text("created_at").notNull(), amount:integer().notNull(), orderId:text("order_id").unique(), paymentId:text("payment_id").unique(),
 studentUserId:text("student_user_id"),
 submittedByUserId:text("submitted_by_user_id"),
 classAccess:integer("class_access").notNull().default(0),
 reviewState:text("review_state").notNull().default("submitted"),
 paymentOrderMode:text("payment_order_mode"),
 paymentState:text("payment_state").notNull().default("unpaid"),
 formAnswers:text("form_answers").notNull().default("{}"),
},t=>[uniqueIndex("applications_course_batch_email").on(t.slug,t.batch,t.email),index("applications_student_user").on(t.studentUserId)]);

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

export const facultyProfiles = sqliteTable("faculty_profiles",{
 id:text().primaryKey(), email:text().notNull().unique(), name:text().notNull(),
 department:text().notNull(), designation:text().notNull(), qualification:text().notNull().default(""), bio:text().notNull().default(""),
 active:integer().notNull().default(1), createdAt:text("created_at").notNull(),
});
export const facultyProposals = sqliteTable("faculty_proposals",{
 id:text().primaryKey(), facultyId:text("faculty_id").notNull().references(()=>facultyProfiles.id),
 title:text().notNull(), track:text().notNull(), format:text().notNull(),
 summary:text().notNull(), outcome:text().notNull(), level:text().notNull(), tools:text().notNull(),
 syllabusUrl:text("syllabus_url").notNull().default(""), days:text().notNull(),
 status:text().notNull().default("submitted"), createdAt:text("created_at").notNull(),
},t=>[index("faculty_proposals_owner").on(t.facultyId)]);
export const facultyAssignments = sqliteTable("faculty_assignments",{
 slug:text().notNull(), batch:text().notNull(), facultyId:text("faculty_id").notNull().references(()=>facultyProfiles.id),
 earned:integer().notNull().default(0), paid:integer().notNull().default(0),
},t=>[primaryKey({columns:[t.slug,t.batch]}),index("faculty_assignments_owner").on(t.facultyId)]);
export const facultyProgress = sqliteTable("faculty_progress",{
 slug:text().notNull(), batch:text().notNull(), day:integer().notNull(), completedAt:text("completed_at").notNull(),
},t=>[primaryKey({columns:[t.slug,t.batch,t.day]})]);

export const siteControls = sqliteTable("site_controls",{
 id:integer().primaryKey(),
 intakePaused:integer("intake_paused").notNull().default(0),
 announcement:text().notNull().default(""),
});

export const adminSettings = sqliteTable("admin_settings",{
 key:text().primaryKey(),value:text().notNull(),updatedAt:text("updated_at").notNull(),
});

export const adminAudit = sqliteTable("admin_audit",{
 id:integer().primaryKey({autoIncrement:true}),actor:text().notNull(),action:text().notNull(),
 target:text().notNull(),createdAt:text("created_at").notNull(),
 previous:text(),next:text(),
});

export const applicantNotes = sqliteTable("applicant_notes",{
 id:integer().primaryKey({autoIncrement:true}),applicationId:text("application_id").notNull().references(()=>applications.id,{onDelete:"cascade"}),
 note:text().notNull(),actor:text().notNull(),createdAt:text("created_at").notNull(),
},t=>[index("applicant_notes_application").on(t.applicationId)]);

export const batchRules = sqliteTable("batch_rules",{
 slug:text().notNull(),batch:text().notNull(),applicationLimit:integer("application_limit").notNull().default(0),
 closesAt:text("closes_at").notNull().default(""),paymentPaused:integer("payment_paused").notNull().default(0),
 feePaise:integer("fee_paise"),formFields:text("form_fields").notNull().default("[]"),formVersion:integer("form_version").notNull().default(0),
},t=>[primaryKey({columns:[t.slug,t.batch]})]);

export const learningRecords = sqliteTable("learning_records",{
 applicationId:text("application_id").primaryKey().references(()=>applications.id,{onDelete:"cascade"}),
 attendance:text().notNull().default("[]"),score:integer(),result:text().notNull().default("pending"),
 certificateId:text("certificate_id").unique(),issuedAt:text("issued_at"),issuedName:text("issued_name"),issuedCourse:text("issued_course"),
});

export const courseCatalogue = sqliteTable("course_catalogue",{
 slug:text().primaryKey(),visibility:text().notNull().default("published"),
 definition:text(),
});
export const batchArchive = sqliteTable("batch_archive",{
 slug:text().notNull(),batch:text().notNull(),schedule:text().notNull(),mode:text().notNull(),status:text().notNull(),
},t=>[primaryKey({columns:[t.slug,t.batch]})]);

export const facultyPayoutLog = sqliteTable("faculty_payout_log",{
 id:integer().primaryKey({autoIncrement:true}),slug:text().notNull(),batch:text().notNull(),
 facultyId:text("faculty_id").notNull().references(()=>facultyProfiles.id),actor:text().notNull(),createdAt:text("created_at").notNull(),
 earnedBefore:integer("earned_before").notNull(),earnedAfter:integer("earned_after").notNull(),
 paidBefore:integer("paid_before").notNull(),paidAfter:integer("paid_after").notNull(),
});
export const facultyProposalReview = sqliteTable("faculty_proposal_review",{
 proposalId:text("proposal_id").primaryKey().references(()=>facultyProposals.id),note:text().notNull(),updatedAt:text("updated_at").notNull(),
});

export const batchLearningMaterial = sqliteTable("batch_learning_material",{
 slug:text().notNull(),batch:text().notNull(),day:integer().notNull(),
 resourceTitle:text("resource_title").notNull().default(""),resourceUrl:text("resource_url").notNull().default(""),
 assignmentTitle:text("assignment_title").notNull().default(""),assignmentUrl:text("assignment_url").notNull().default(""),
},t=>[primaryKey({columns:[t.slug,t.batch,t.day]})]);

export const adminStaff = sqliteTable("admin_staff",{
 email:text().primaryKey(),role:text().notNull(),active:integer().notNull().default(1),updatedAt:text("updated_at").notNull(),
});
export const applicantSupport = sqliteTable("applicant_support",{
 id:text().primaryKey(),applicationId:text("application_id").notNull().references(()=>applications.id,{onDelete:"cascade"}),
 type:text().notNull(),message:text().notNull(),status:text().notNull().default("open"),
 response:text().notNull().default(""),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull(),
},t=>[index("applicant_support_application").on(t.applicationId)]);

export const studentLearningProfiles = sqliteTable("student_learning_profiles",{
 userId:text("user_id").primaryKey(),preferences:text().notNull(),updatedAt:text("updated_at").notNull(),
});

export const reminderContacts = sqliteTable("reminder_contacts",{
 userId:text("user_id").primaryKey(),whatsapp:text().notNull().default(""),enabled:integer().notNull().default(0),
});
export const classReminderDispatch = sqliteTable("class_reminder_dispatch",{
 eventKey:text("event_key").primaryKey(),slug:text().notNull(),batch:text().notNull(),channel:text().notNull(),
 status:text().notNull(),updatedAt:text("updated_at").notNull(),
});

export const applicationBilling = sqliteTable("application_billing",{
 applicationId:text("application_id").primaryKey().notNull().references(()=>applications.id,{onDelete:"cascade"}),
 name:text().notNull(),addressLine:text("address_line").notNull(),addressExtra:text("address_extra").notNull().default(""),
 city:text().notNull(),state:text().notNull(),pin:text().notNull(),updatedAt:text("updated_at").notNull(),
});

export const facultyAccounts=sqliteTable("faculty_accounts",{
 id:text().primaryKey(),username:text().notNull().unique(),email:text().notNull().unique(),
 firstName:text("first_name").notNull(),lastName:text("last_name").notNull(),phone:text().notNull().default(""),
 password:text(),verifiedAt:integer("verified_at"),provider:text(),subject:text(),createdAt:integer("created_at").notNull(),
},t=>[uniqueIndex("faculty_oauth_identity").on(t.provider,t.subject)]);
export const facultySessions=sqliteTable("faculty_auth_sessions",{
 key:text().primaryKey(),accountId:text("account_id").notNull().references(()=>facultyAccounts.id,{onDelete:"cascade"}),expiresAt:integer("expires_at").notNull(),
},t=>[index("faculty_session_expiry").on(t.expiresAt)]);
export const facultyVerifications=sqliteTable("faculty_email_verifications",{
 key:text().primaryKey(),accountId:text("account_id").notNull().unique().references(()=>facultyAccounts.id,{onDelete:"cascade"}),expiresAt:integer("expires_at").notNull(),
},t=>[index("faculty_verification_expiry").on(t.expiresAt)]);
export const facultyOAuthAttempts=sqliteTable("faculty_oauth_attempts",{
 key:text().primaryKey(),provider:text().notNull(),verifier:text().notNull(),returnView:text("return_view").notNull(),expiresAt:integer("expires_at").notNull(),
},t=>[index("faculty_oauth_attempt_expiry").on(t.expiresAt)]);
export const facultyRate=sqliteTable("faculty_auth_rate",{
 key:text().primaryKey(),window:integer().notNull(),hits:integer().notNull(),
},t=>[index("faculty_rate_window").on(t.window)]);

export const portalSessions=sqliteTable("portal_sessions",{
 key:text().primaryKey(),role:text().notNull(),account:text().notNull(),expiresAt:integer("expires_at").notNull(),
},t=>[index("portal_session_expiry").on(t.expiresAt)]);

export const ownerAdminCredentials=sqliteTable("owner_admin_credentials",{
 email:text().primaryKey(),password:text(),googleSubject:text("google_subject"),updatedAt:integer("updated_at").notNull(),
});
export const ownerAdminGoogleAttempts=sqliteTable("owner_admin_google_attempts",{
 key:text().primaryKey(),verifier:text().notNull(),nonce:text().notNull(),expiresAt:integer("expires_at").notNull(),
},t=>[index("owner_admin_google_attempt_expiry").on(t.expiresAt)]);

export const studentWishlist=sqliteTable("student_wishlist",{
 studentId:text("student_id").notNull(),slug:text().notNull(),createdAt:integer("created_at").notNull(),
},t=>[primaryKey({columns:[t.studentId,t.slug]})]);

export const studentAccounts = sqliteTable("student_accounts",{
 id:text().primaryKey(),username:text().notNull().unique(),email:text().notNull(),fullName:text("full_name").notNull(),
 password:text().notNull(),createdAt:integer("created_at").notNull(),
});

export const studentGoogleIdentities = sqliteTable("student_google_identities",{
 subject:text().primaryKey(),studentId:text("student_id").notNull().unique().references(()=>studentAccounts.id,{onDelete:"cascade"}),
 createdAt:integer("created_at").notNull(),
});
export const studentGoogleAttempts = sqliteTable("student_google_attempts",{
 key:text().primaryKey(),verifier:text().notNull(),nonce:text().notNull(),returnTo:text("return_to").notNull(),
 linkStudentId:text("link_student_id"),linkSession:text("link_session"),expiresAt:integer("expires_at").notNull(),
},t=>[index("student_google_expiry").on(t.expiresAt)]);
