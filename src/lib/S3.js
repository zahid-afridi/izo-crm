import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

// Setup Digital Ocean Spaces (AWS S3 compatible)
const s3 = new AWS.S3({
  accessKeyId: process.env.DITGITALOCEAN_ACCESS_KEY?.trim() || '',
  secretAccessKey: process.env.DITGITALOCEAN_SECRET_KEY?.trim() || '',
  // endpoint: "https://fra1.digitaloceanspaces.com", // ONLY THIS
  endpoint: process.env.DITGITALOCEAN_ENDPOINT, // ONLY THIS
  region: "us-east-1",
  signatureVersion: "v4",
});



const BUCKET_NAME = process.env.DITGITALOCEAN_BUCKET || "izogrup-ontop";



// Helper function to convert base64 to buffer
const base64ToBuffer = (base64String) => {
  const base64Data = base64String.replace(/^data:[^;]+;base64,/, "");
  return Buffer.from(base64Data, "base64");
};

// Helper function to get MIME type from base64
const getMimeType = (base64String) => {
  const match = base64String.match(/^data:([^;]+);base64,/);
  return match ? match[1] : "image/jpeg";
};

// Upload single file
export const uploadFile = async (fileData, folder = "izo/files") => {
  try {
    const buffer = base64ToBuffer(fileData);
    const mimeType = getMimeType(fileData);
    const filename = `${folder}/${uuidv4()}.jpg`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: mimeType,
      ACL: "public-read",
    };

    const result = await s3.upload(params).promise();

    return {
      url: result.Location,
      key: filename,
    };
  } catch (error) {
    console.error("Digital Ocean Spaces upload error:", error);
    throw new Error("File upload failed");
  }
};

// Upload multiple files
export const uploadMultipleFiles = async (filesArray, folder = "izo/files") => {
  try {
    const uploadPromises = filesArray.map((fileData) =>
      uploadFile(fileData, folder)
    );
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error("Digital Ocean Spaces multiple upload error:", error);
    throw new Error("Multiple files upload failed");
  }
};

// Delete single file
export const deleteFile = async (fileKey) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
    };

    const result = await s3.deleteObject(params).promise();
    return result;
  } catch (error) {
    console.error("Digital Ocean Spaces delete error:", error);
    throw new Error("File delete failed");
  }
};

// Delete multiple files
export const deleteMultipleFiles = async (fileKeysArray) => {
  try {
    const deletePromises = fileKeysArray.map((key) => deleteFile(key));
    const results = await Promise.all(deletePromises);
    return results;
  } catch (error) {
    console.error("Digital Ocean Spaces multiple delete error:", error);
    throw new Error("Multiple files delete failed");
  }
};

export default s3;
