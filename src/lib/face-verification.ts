import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let modelsLoading = false;
let loadingPromise: Promise<void> | null = null;

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

export type ModelLoadProgress = {
  current: number;
  total: number;
  modelName: string;
};

export async function loadFaceModels(
  onProgress?: (progress: ModelLoadProgress) => void
): Promise<void> {
  if (modelsLoaded) return;

  if (modelsLoading && loadingPromise) {
    return loadingPromise;
  }

  modelsLoading = true;

  loadingPromise = (async () => {
    try {
      const models = [
        { name: 'tinyFaceDetector', loader: () => faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL) },
        { name: 'faceLandmark68TinyNet', loader: () => faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL) },
        { name: 'faceRecognitionNet', loader: () => faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL) },
      ];

      for (let i = 0; i < models.length; i++) {
        onProgress?.({ current: i, total: models.length, modelName: models[i].name });
        await models[i].loader();
      }

      onProgress?.({ current: models.length, total: models.length, modelName: 'complete' });
      modelsLoaded = true;
      console.log('Face-api models loaded successfully');
    } catch (error) {
      console.error('Error loading face-api models:', error);
      modelsLoading = false;
      loadingPromise = null;
      throw new Error('ফেস মডেল লোড করতে ব্যর্থ হয়েছে');
    }
  })();

  return loadingPromise;
}

export function preloadFaceModels(): void {
  if (!modelsLoaded && !modelsLoading) {
    loadFaceModels().catch(err => {
      console.warn('Background model preload failed:', err);
    });
  }
}

export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

export function getModelLoadingState(): { loaded: boolean; loading: boolean } {
  return { loaded: modelsLoaded, loading: modelsLoading };
}

export async function detectFace(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>> | null> {
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
    .withFaceLandmarks(true)
    .withFaceDescriptor();

  return detection || null;
}

export async function getFaceDescriptor(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<Float32Array | null> {
  const detection = await detectFace(input);
  return detection?.descriptor || null;
}

export function compareFaces(descriptor1: Float32Array, descriptor2: Float32Array): number {
  const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
  const similarity = Math.max(0, Math.min(100, (1 - distance) * 100));
  return similarity;
}

export function isFaceMatch(descriptor1: Float32Array, descriptor2: Float32Array, threshold: number = 60): boolean {
  const similarity = compareFaces(descriptor1, descriptor2);
  return similarity >= threshold;
}

export async function extractFaceFromImage(imageUrl: string): Promise<Float32Array | null> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      try {
        const descriptor = await getFaceDescriptor(img);
        resolve(descriptor);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}

export async function captureFrameFromVideo(video: HTMLVideoElement): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(video, 0, 0);
  return canvas;
}

export interface FaceVerificationResult {
  success: boolean;
  similarity: number;
  message: string;
}

export async function verifyFaceAgainstImage(
  liveVideoElement: HTMLVideoElement,
  referenceImageUrl: string,
  threshold: number = 55
): Promise<FaceVerificationResult> {
  try {
    if (!modelsLoaded) {
      await loadFaceModels();
    }

    const referenceDescriptor = await extractFaceFromImage(referenceImageUrl);
    if (!referenceDescriptor) {
      return {
        success: false,
        similarity: 0,
        message: 'আইডি কার্ডে চেহারা খুঁজে পাওয়া যায়নি',
      };
    }

    const canvas = await captureFrameFromVideo(liveVideoElement);

    const liveDescriptor = await getFaceDescriptor(canvas);
    if (!liveDescriptor) {
      return {
        success: false,
        similarity: 0,
        message: 'লাইভ ভিডিওতে চেহারা খুঁজে পাওয়া যায়নি',
      };
    }

    const similarity = compareFaces(referenceDescriptor, liveDescriptor);
    const isMatch = similarity >= threshold;

    const message = isMatch
      ? `চেহারা মিলেছে (${Math.round(similarity)}% সাদৃশ্য)`
      : `চেহারা মেলেনি (${Math.round(similarity)}% সাদৃশ্য)`;

    return {
      success: isMatch,
      similarity: Math.round(similarity),
      message,
    };
  } catch (error) {
    console.error('Face verification error:', error);
    return {
      success: false,
      similarity: 0,
      message: error instanceof Error ? error.message : 'যাচাই করতে সমস্যা হয়েছে',
    };
  }
}
