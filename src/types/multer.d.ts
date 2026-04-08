import multer from 'multer';

declare global {
  namespace Express {
    namespace Multer {
      type File = multer.File;
    }
  }
}
