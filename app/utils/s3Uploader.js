const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const CLOUD_FRONT_DOMAIN = "https://cdn.mybizsolutions.us";

const toSnakeCase = (str) =>
    str.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESSED_KEY_ID,
    secretAccessKey: process.env.AWS_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

let uploadCountMap = {}; 

const s3Storage = multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { fieldname: file.fieldname });
    },
    key: (req, file, cb) => {
        const bizName = req.query.bizName || "BizSolutions";
        const safeBizName = toSnakeCase(bizName);
        const ext = path.extname(file.originalname);
        const uuid = uuidv4();
      
        const routePath = req.path || req.originalUrl || "";
      
        let folder = "others/";
        let fileName = `${safeBizName}_${uuid}${ext}`;
      
        if (routePath.includes("biz-icon")) {
          folder = "biz/icons/";
          const uuid = uuidv4();
          fileName = `${safeBizName}_icon_${uuid}${ext}`;
        } else if (routePath.includes("biz-gallery")) {
          folder = "biz/images/";
    
          if (!uploadCountMap[req.ip]) uploadCountMap[req.ip] = 1;
          else uploadCountMap[req.ip]++;
    
          const index = uploadCountMap[req.ip];
          fileName = `${safeBizName}_gallery_${index}${ext}`;
        } else if (routePath.includes("upload-new-icon")) {
          folder   = "users/profile/";

          fileName = `${uuid}${ext}`;
        } else if (routePath.endsWith("/images")) {
          // Matches the review-images upload route (/:bizId/images) — like the
          // other branches above, this checks the path relative to this
          // route's own router, since Express strips the mount prefix
          // (e.g. "/reviews") before handlers on that sub-router see req.path.
          folder = "reviews/images/";
          fileName = `${uuid}${ext}`;
        }
      
        cb(null, `${folder}${fileName}`);
    }
  });

const transformS3UrlToCDN = (url) => {
    const s3BaseUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
    return url.replace(s3BaseUrl, `${CLOUD_FRONT_DOMAIN}/`);
  };

const uploadSingle = multer({ storage: s3Storage }).single("image");
const uploadMultiple = multer({ storage: s3Storage }).array("images", 50);
const uploadReviewImages = multer({ storage: s3Storage }).array("images", 3);

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadReviewImages,
  transformS3UrlToCDN,
};