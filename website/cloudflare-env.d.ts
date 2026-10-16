declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    STORE_SYNC_SECRET?: string;
  }
}
