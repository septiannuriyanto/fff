export const analyzeImageBrightness = (
    imageUrl: string
): Promise<'light' | 'dark'> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imageUrl;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve('light'); // Default
                return;
            }

            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            let r, g, b, avg;
            let colorSum = 0;

            // Iterate over every 4th pixel (step by 4 * 10 for performance if large image, or just 4)
            // data layout: [r, g, b, a, r, g, b, a, ...]
            const step = 4 * 10;
            let count = 0;

            for (let x = 0; x < data.length; x += step) {
                r = data[x];
                g = data[x + 1];
                b = data[x + 2];

                avg = Math.floor((r + g + b) / 3);
                colorSum += avg;
                count++;
            }

            const brightness = Math.floor(colorSum / count);

            // Threshold can be adjusted. < 128 is dark, > 128 is light.
            resolve(brightness < 128 ? 'dark' : 'light');
        };

        img.onerror = () => {
            resolve('light'); // Default on error
        };
    });
};
