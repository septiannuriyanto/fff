import toast from "react-hot-toast";
import { supabase } from "../db/SupabaseClient";
import imageCompression from "browser-image-compression";


const bucketUrl = `https://fylkjewedppsariokvvl.supabase.co/storage/v1/object/public`;
const supabaseStorageName = 'ritation_upload';
const baseStorageUrl = `https://fylkjewedppsariokvvl.supabase.co/storage/v1/object/public/${supabaseStorageName}`;
const profileImageBaseUrl = 'https://fylkjewedppsariokvvl.supabase.co/storage/v1/object/public/images/profile';
 const uploadImage = async (
  file: File,
  fileTitle: string,
  folderName: string,
  onProgress: (progress: number) => void // Added parameter
): Promise<{ imageUrl: string | null; error: string | null }> => {
  let imageUrl: string | null = null;
  let error: string | null = null;

  if (!file) {
    return { imageUrl, error: "No file selected." };
  }

  let fileToUpload = file;

  if (file.size > 100 * 1024) {
    const options = {
      maxSizeMB: 0.15,
      maxWidthOrHeight: 800,
      useWebWorker: true,
    };

    try {
      fileToUpload = await imageCompression(file, options);
      if (fileToUpload.size > 150 * 1024) {
        return { imageUrl, error: "Compressed file size exceeds 150KB limit." };
      }
    } catch (err) {
      console.error("Image compression failed:", err);
      return { imageUrl, error: "Image compression failed." };
    }
  }

  const fileName = `${new Date().getFullYear()}/${folderName}/${fileTitle}`;

  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(supabaseStorageName)
      .upload(fileName, fileToUpload, {
        cacheControl: '3600', // optional, set cache control if needed
        upsert: true // Enable overwriting existing file
      });

    if (uploadError) {
      return { imageUrl, error: `Upload failed: ${uploadError.message}` };
    }

    const { data } = supabase.storage.from(supabaseStorageName).getPublicUrl(fileName);
    if (!data.publicUrl) {
      return { imageUrl, error: "Failed to get public URL." };
    }

    imageUrl = data.publicUrl;
    return { imageUrl, error };
  } catch (err) {
    return { imageUrl, error: `Upload failed: ${err.message}` };
  }
};


const checkImageUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' }); // Use HEAD to get the headers without downloading the image
    return response.ok; // Returns true if the response status is in the range 200-299
  } catch (error) {
    console.error("Error fetching image:", error);
    return false; // Return false if there's an error during the fetch
  }
};

const getFileFromUrl = async (url: any) => {
  try {
    const response = await fetch(url);
    if(response.status==400){
      return null;
    }
    
    const blob = await response.blob(); // Get the blob from the response
    const fileName = url.split('/').pop(); // Extract the filename from the URL
    const file = new File([blob], fileName, { type: blob.type }); // Create a File object
    return file;
  } catch (error) {
    console.error('Error fetching the file:', error);
    return null;
  }
};


const uploadImageGeneral = async (file: File, bucketName: string, fullPath: string) => {
  const { data, error } = await supabase.storage.from(bucketName).upload(fullPath, file,  {
    cacheControl: '3600', // optional, set cache control if needed
    upsert: true // Enable overwriting existing file
  });

  if (error) {
    toast.error(`Error uploading file: ${error.message}`)
    return null
  }
  console.log('Upload successful:', data);
  return file;
};


const uploadImageGeneralGetUrl = async (file: File, bucketName: string, fullPath: string): Promise<string | null> => {
  // Upload the file to the Supabase storage bucket
  const { data, error } = await supabase.storage.from(bucketName).upload(fullPath, file, {
    cacheControl: '3600', // optional, set cache control if needed
    upsert: true // Enable overwriting existing file
  });

  // Handle any error that occurred during the upload
  if (error) {
    toast.error(`Error uploading file: ${error.message}`);
    return null;
  }

  // Generate the public URL for the uploaded image
  const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(fullPath);

  // Check if publicUrl exists in the response
  if (!publicData || !publicData.publicUrl) {
    toast.error('Error generating file URL');
    return null;
  }

  console.log('Upload successful:', data);

  // Return the URL of the uploaded image
  return publicData.publicUrl;
};




export { uploadImage, checkImageUrl, getFileFromUrl, baseStorageUrl,profileImageBaseUrl, uploadImageGeneral, uploadImageGeneralGetUrl , bucketUrl }