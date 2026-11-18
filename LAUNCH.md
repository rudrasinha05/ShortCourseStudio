# GL Bajaj CSAI short-term course launch

- Regular tracks have five separate course cards each, with a five-day plan, individual instructor, batch and application per card. Exclusive courses condense all five modules into one 15-hour course (three hours per day for five days) taught by one instructor, with one application and one fee.
- In /admin, enter a batch schedule and delivery mode, then choose **Announce batch and open applications**. Courses marked **Batch announcement soon** or **Applications closed** do not render an application form or accept new submissions. Existing applications and tracking remain intact. Use a new batch identifier for each new cohort. For an exclusive course without a default instructor, save an instructor in its banner settings before opening applications.
- The admin can filter student applications by course, review them and download the displayed page as CSV. An acceptance records the admin's decision. It does not collect a fee or send an email.
- A submitted form gives the student a reference and private tracking code. The student can use both on /apply to recover the status page on another device. Do not share the tracking code.
- Homepage banners are managed in /admin for the crash course and each regular batch. Use an approved HTTPS portrait URL and real faculty details. Set a start time in IST or use the first scheduled class. Scheduled future batches sort by start time, past batches disappear, and the featured banner sits above At a Glance.
- Class scheduling is independent of the video platform. In /admin, set Day 1–5 times in IST, then add the chosen provider's live and replay links for the current batch. Accept an application and grant class access explicitly. Declining or moving it out of Accepted clears access. Closing applications does not remove access for enrolled students.
- Students use their existing private application tracking credentials to open My batch. Configure video links as restricted to the student's email on the provider itself. Hiding a link on this site does not make a public link private. The site tracks replay availability, not viewing duration or completion.
- This Site remains private until its owner changes the audience. Review the organiser's contact and refund information before opening paid enrollment to outside students.
- Razorpay is optional. Do not put credentials in source or chat. When ready, configure RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET and PAYMENTS_MODE=test or live as server settings. Use matching test keys first and configure payment.captured at /api/payments/webhook. Check which methods are enabled in the merchant dashboard. Checkout is separate from application submission and a captured payment must be verified on the server. For C Programming, one verified live capture confirms enrollment and grants access to the full batch. Test payments do not grant access. Use a separate test environment for provider checkout rehearsal.
- SITE_ADMIN_EMAIL identifies the site's registered owner for the admin interface. D1 stores courses and applications. Native links and forms handle the catalog, applications, tracking, admin editing, review and CSV export.

## Role portals

- /student shows linked applications, enrolled courses, class access, related and recommended courses, and a six-track course carousel. A signed-in application links to the account automatically. To link an older application, use the reference and tracking code with the same sign-in email.
- /faculty opens for active faculty registered by the administrator. Faculty submit a five-day course plan and may attach a syllabus PDF up to 2 MB or link to an HTTPS document. Uploaded PDFs are accessible only to the submitting active faculty member and the administrator. Faculty mark assigned sessions complete and see earnings, paid amounts and balances recorded by the administrator.
- /admin lets the administrator add or disable faculty, review proposals, assign batches and record earnings. Approving publishes the syllabus in the catalogue without opening enrollment. Set the schedule and delivery mode and open the batch separately. Adding a faculty profile does not change the hosting audience or invite a visitor.

## Enrollment controls

- Open Admin Portal → Enrollment and site controls. Select a course and current batch, set its schedule and delivery mode, then open, close or return it to draft without editing the syllabus.
- Website controls pause or resume new applications globally and set an optional notice on the homepage and application page. This does not remove existing student access or change the hosted site's audience.
- The one-time C batch launch uses SCS_INITIAL_C_BATCH_OPEN=1 in the hosted environment. It only creates the opening record if no settings exist for that course. Subsequent admin changes take precedence. Opening applications does not enable online payments or confirm seats.

## Homepage countdown and class reminders

- A published banner for an open batch shows a live countdown to the first scheduled class in IST. Set an exact start time under **Class schedule & recordings**. If no class time is saved, the banner start time is used. Pausing or closing applications hides the countdown at the next page load. This is not an application deadline.
- The delivery job looks for classes starting within 24 hours. Recipients are students with accepted enrollment and class access, and active faculty assigned to the exact batch. C Programming also requires verified payment. Students can opt in to WhatsApp when applying. Students and faculty can manage WhatsApp preferences in their portals.
- Configure email sender `REMINDER_EMAIL_FROM` (verified sender/domain) and secret `RESEND_API_KEY`. Configure WhatsApp Business settings `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANGUAGE`, and secret `WHATSAPP_ACCESS_TOKEN`. The approved utility template body must take exactly three text parameters in order: course/batch/day, start time in IST, and the portal URL.
- Set a separate random `REMINDER_JOB_SECRET` of at least 32 characters. Set up a trusted scheduler to POST `/jobs/class-reminders` every 15 minutes with the secret in the Authorization Bearer header. While the Site is access-gated, the caller also needs a valid Sites service access key in `OAI-Sites-Authorization`. Keep both values in the scheduler’s secret store. Test using controlled recipients before enabling a real schedule.
- In Admin Portal → Classes → Timetable & recordings, the batch shows sender configuration and attempt counts. “Accepted by provider” does not guarantee delivery to a recipient. Attempts are deduplicated by batch, session date, recipient, role and channel. Ambiguous or failed attempts are retained for investigation and not automatically repeated. Changing a class time makes it a new reminder event.

### Billing and payment

New web applications go to Billing address, then Course payment. Existing applicants can resume from their application status. The billing form is currently for Indian addresses. The checkout offers UPI, debit or credit cards, net banking and wallets, subject to the options enabled by the merchant and the buyer’s device. The fee is taken from the application record. Do not put billing records or merchant credentials in Git. The public source repository is separate from private site hosting and runtime data.

## Production payment handoff

1. Keep the site restricted for the provider test. In the Site's server settings, configure the Razorpay Test key ID, Test key secret and webhook signing secret, together with `PAYMENTS_MODE=test`. Never commit them. Test success, failure and delayed capture with a test applicant.
2. Confirm webhook reachability from Razorpay itself. An owner-only Site blocks anonymous callbacks at the hosting layer even if the app's webhook handler accepts valid signatures. Before student launch, choose a student-accessible audience and verify the signed webhook from the dashboard, or use a separately deployed signed relay. The in-app **Check payment status** action recovers a capture from Razorpay without relying on inbound webhooks, but it runs only when the applicant asks for a status check.
3. Verify the organiser support contact and approved cancellation/refund terms. Confirm the C course schedule, class links and how payment or enrollment works for the other courses. C confirms enrollment after verified live capture. Other courses retain administrator review and class-access controls.
4. Use a separate staging deployment and data for provider test transactions. Test and live orders are not interchangeable. Unpaid orders from before the mode-tracking migration need merchant reconciliation before retrying. Real refunds are handled through Razorpay Dashboard and must be reconciled with class access. Do not switch production to live credentials until the provider rehearsal and these checks pass.
5. In **Admin → Reports & access → Launch readiness**, review configuration, then sign in as a non-owner and confirm the student journey before sharing the site.

### Faculty account sign-in

Faculty credentials are scoped to teaching. Verified faculty credentials can also be used in the Staff Portal only if an active Staff role has been assigned to the verified email. A faculty account must have a verified email that matches an active faculty profile in Admin → Faculty Directory. Creating an account does not create or activate a faculty profile.

Set these production bindings only in the host's secret/configuration controls, not in source:

- `FACULTY_GOOGLE_CLIENT_ID` and `FACULTY_GOOGLE_CLIENT_SECRET` for Google OAuth.
- `FACULTY_GITHUB_CLIENT_ID` and `FACULTY_GITHUB_CLIENT_SECRET` for GitHub OAuth.
- `RESEND_API_KEY` and `FACULTY_EMAIL_FROM` for verification of password accounts and non-authoritative Google addresses. Use a verified sender, test actual inbox delivery, and reopen the confirmation link while signed in as the requesting faculty account.

Use `https://short-course-studio-rs.rudrasinha05.chatgpt.site/faculty/auth/google/callback` and `https://short-course-studio-rs.rudrasinha05.chatgpt.site/faculty/auth/github/callback` as the provider callback URLs. Do not use the platform-owned `/callback` route. Existing accounts do not auto-link across different sign-in methods. Run `node tests/faculty-auth.mjs` after a production build, then rehearse each configured provider and email confirmation with an invited faculty test account.

### Role-by-role rehearsal

The homepage always opens in browse mode. Enter the Student, Faculty or Admin Portal explicitly. If ChatGPT already recognises the account, the site displays an account confirmation button before it opens a workspace. Confirming a workspace starts an eight-hour session and replaces the prior workspace in that browser. **Sign out** ends the site session and returns to the homepage without reopening the login prompt.

Use separate browser profiles to test three distinct accounts. Do not turn a test student into the live owner.

1. **Student:** Open a course, apply with a test profile, check the application listing and billing, then run the Razorpay rehearsal in test mode. Check that an unpaid or test-paid application does not get real class access.
2. **Faculty:** Use the email of an enabled faculty profile. Check assigned batches, course proposals, class progress and recorded payouts. Native password sign-in needs a verified email before opening teaching tools.
3. **Admin:** Confirm the configured owner account, then check application review, faculty assignment, batch dates and class links. Check that a separate non-owner account cannot open the Admin workspace.
4. On all three paths, sign out and confirm the homepage opens without a modal and the role's private workspace no longer opens without signing in. Browser-tab or profile changes do not create or grant new roles.

### Admin account sign-in

Public Admin sign-in is at `/admin/login`. The existing site owner can open the Admin Portal using their recognised owner account and choose **Admin security** to set a password. Use the configured owner email for the password form. No public Admin registration is available. The existing provider entry remains available to the owner for recovery at `/login?return_to=%2Fadmin`; it is not linked from the public Admin login page.

To activate Google sign-in, configure the production settings `ADMIN_GOOGLE_CLIENT_ID` and `ADMIN_GOOGLE_CLIENT_SECRET`. Register `https://short-course-studio-rs.rudrasinha05.chatgpt.site/admin/auth/google/callback` as the exact redirect URI. Use the site's configured owner Google address. The server validates Google's signed response, checks that Google is authoritative for the verified owner email, and pins the Google account identifier on first successful sign-in.


### Native Student and Staff access

Students choose a username and password. Their contact email is not verification of identity or a grant of another role. Existing applications are linked individually using the original contact email, reference and private tracking code. Previous wishlists do not transfer automatically. Password reset by email is not configured. Faculty teaching access still requires verified email and an active Faculty Directory entry.

A verified faculty account may use the Staff sign-in form if the administrator has assigned an active staff role to that same verified email. Admin sign-in remains separate. The verified site owner can set an owner password via the owner-only setup button if no admin password exists. After setup, this entry is no longer available. For day-to-day access use the owner password or configured Google sign-in.

## Student Google sign-in

Use a Google OAuth **Web application** client and register
`https://short-course-studio-rs.rudrasinha05.chatgpt.site/student/auth/google/callback`
as an exact authorized redirect URI. Set `STUDENT_GOOGLE_CLIENT_ID` and
`STUDENT_GOOGLE_CLIENT_SECRET` in the site's production environment. Grant the
intended students access in the OAuth consent configuration. Do not commit
the client secret. Google sign-in remains unavailable until both settings are present.

New Google users receive a student-only account. Existing username/password
students should sign in normally and link Google from My profile to keep the
same application and wishlist history. Matching email alone never links an account.
