export const handleShare = (information:any) => {
    // Custom logic to share info with another app
    console.log("Sharing information with another app...");
    // For example, you can use the Web Share API if supported:
    if (navigator.share) {
      navigator.share(information)
      .then(() => console.log('Share successful'))
      .catch((error) => console.error('Error sharing:', error));
    } else {
      alert('Sharing is not supported in this browser.');
    }
  };