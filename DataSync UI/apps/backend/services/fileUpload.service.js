import multer from "multer";
import path from "path";
import fs from "fs";

// Configurar multer para uploads de CSV
const uploadDir = path.join(process.cwd(), "storage", "uploads", "csv");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const baseName = path.parse(originalName).name;
    const ext = path.parse(originalName).ext || ".csv";
    cb(null, `${baseName}_${timestamp}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    // Sin límite de tamaño
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      ext === ".csv" ||
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "text/plain"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

export { upload, uploadDir };
