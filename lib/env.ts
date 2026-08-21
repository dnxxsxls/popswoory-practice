import path from "node:path";

/** 로컬 데이터 저장 위치. v1 은 DB 없이 이 폴더만 쓴다. */
export const DATA_DIR = path.join(process.cwd(), ".data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const DB_FILE = path.join(DATA_DIR, "db.json");
export const SECRET_FILE = path.join(DATA_DIR, "session-secret");
