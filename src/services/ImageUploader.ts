import { supabase } from "../db/SupabaseClient";
import imageCompression from "browser-image-compression";



const supabaseStorageName = 'ritation_upload';
const baseStorageUrl = `https://fylkjewedppsariokvvl.supabase.co/storage/v1/object/public/${supabaseStorageName}`;
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
    console.log(response.status);
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


export { uploadImage, checkImageUrl, getFileFromUrl, baseStorageUrl }