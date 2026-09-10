// Image upload from the browser, proxied through our own /api/images/upload
// route (signed, server-side, via the Cloudinary SDK) so the Cloudinary API
// secret never reaches the browser. Progress is reported via XHR upload
// events since fetch() doesn't expose upload progress.

export function uploadImage(file: File, onProgress: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.open("POST", "/api/images/upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        // Cap client-visible progress at 99% for the upload leg — the last
        // tick to 100 happens once Cloudinary actually confirms the file,
        // which the response below reports.
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    };

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && response.url) {
          onProgress(100);
          resolve(response.url as string);
        } else {
          reject(new Error(response?.error || "Image upload failed"));
        }
      } catch {
        reject(new Error("Image upload failed — unexpected response"));
      }
    };

    xhr.onerror = () => reject(new Error("Image upload failed — network error"));
    xhr.send(formData);
  });
}
