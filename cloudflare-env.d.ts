declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_PASSWORD?: string;
    SCS_INITIAL_C_BATCH_OPEN?: string;
    SITE_ADMIN_EMAIL?: string;
    RAZORPAY_KEY_ID?: string;
    RAZORPAY_KEY_SECRET?: string;
    RAZORPAY_WEBHOOK_SECRET?: string;
    PAYMENTS_MODE?: string;
    RESEND_API_KEY?: string;
    REMINDER_EMAIL_FROM?: string;
    WHATSAPP_ACCESS_TOKEN?: string;
    WHATSAPP_PHONE_NUMBER_ID?: string;
    WHATSAPP_API_VERSION?: string;
    WHATSAPP_TEMPLATE_NAME?: string;
    WHATSAPP_TEMPLATE_LANGUAGE?: string;
    REMINDER_JOB_SECRET?: string;
  }
}
