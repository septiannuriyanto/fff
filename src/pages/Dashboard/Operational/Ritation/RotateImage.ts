import { supabase } from "../../../../db/SupabaseClient";

// Type definition for Supabase upload response
interface SupabaseUploadResponse {
    data: any; // Replace with a more specific type if available
    error: Error | null;
  }
  
  // Function to upload the rotated image to Supabase
  const uploadRotatedImage = async (imageData: Blob, yourImageName: string): Promise<void> => {
    const { data, error }: SupabaseUploadResponse = await supabase
      .storage
      .from('your-bucket-name') // Change this to your actual bucket name
      .upload(`images/${yourImageName}.png`, imageData, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true, // Overwrite if the file already exists
      });
  
    if (error) {
      console.error('Error uploading image:', error);
    } else {
      console.log('Image uploaded successfully:', data);
    }
  };
  
  // Function to get rotated image data from the image source
  const getRotatedImageData = (imageSrc: string, rotation: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = imageSrc;
  
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
  
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;
  
          // Move the origin to the center of the image
          ctx.translate(canvas.width / 2, canvas.height / 2);
          // Rotate the canvas
          ctx.rotate((rotation * Math.PI) / 180);
          // Draw the image
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
  
          // Convert the canvas to Blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              throw new Error('Failed to convert canvas to Blob.');
            }
          }, 'image/png');
        }
      };
    });
  };
  

  export { uploadRotatedImage, getRotatedImageData }