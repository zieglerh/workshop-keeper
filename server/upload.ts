import multer from 'multer';
import path from 'path';
import { nanoid } from 'nanoid';
import fs from 'fs';

// Ensure upload directories exist
const uploadDirs = ['uploads/users', 'uploads/inventory'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    // Determine upload path based on the route
    if (req.path.includes('/users/')) {
      uploadPath += 'users/';
    } else if (req.path.includes('/inventory/')) {
      uploadPath += 'inventory/';
    } else {
      uploadPath += 'general/';
    }
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const ext = path.extname(file.originalname);
    const filename = `${nanoid(12)}${ext}`;
    cb(null, filename);
  }
});

// File filter to only allow images
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Helper function to delete old uploaded files
export const deleteUploadedFile = (filePath: string) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }
};