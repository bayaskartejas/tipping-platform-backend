const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
require('dotenv').config();
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, 
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
})

async function getObjectURL(key){
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key
  });
  const url = await getSignedUrl(s3Client, command);
  return url;
  
}

async function putObject (filename, contentType, folder) {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `${folder}/${filename}`,
    ContentType: contentType
  })
  const url = await getSignedUrl(s3Client, command);
  return url;
}

// async function init() {
//   console.log(
//     "URL",
//     await putObject(`image-${Date.now()}.jpg`, "image/jpg")
//   );
// }
// init()


module.exports = { s3Client, getObjectURL, putObject };