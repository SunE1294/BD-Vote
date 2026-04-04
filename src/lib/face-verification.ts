import * as faceapi from 'face-api.js';

export interface FaceVerificationResult {
  matched: boolean;
  confidence: number;
  distance: number;
  threshold: number;
  error?: string;
}

export interface FaceDetectionResult {
  detected: boolean;
  descriptor: Float32Array | null;
  landmarks: faceapi.FaceLandmarks68 | null;
  expression: string;
  box: faceapi.Box | null;
  error?: string;
}

const MODEL_URL = '/models';
let modelsLoaded = false;

// Load all required face-api.js models
export const loadFaceModels = async (): Promise<boolean> => {
  if (modelsLoaded) return true;

  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log('[FaceVerification] All models loaded successfully');
    return true;
  } catch (error) {
    console.error('[FaceVerification] Failed to load models:', error);
    return false;
  }
};

// Detect face from an image/video element and extract descriptor
export const detectFace = async (
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<FaceDetectionResult> => {
  try {
    if (!modelsLoaded) {
      await loadFaceModels();
    }

    const detection = await faceapi
      .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor()
      .withFaceExpressions();

    if (!detection) {
      return {
        detected: false,
        descriptor: null,
        landmarks: null,
        expression: '',
        box: null,
        error: 'No face detected. Please ensure your face is clearly visible.',
      };
    }

    // Get dominant expression
    const expressions = detection.expressions;
    const dominantExpression = Object.entries(expressions)
      .sort(([, a], [, b]) => (b as number) - (a as number))[0][0];

    return {
      detected: true,
      descriptor: detection.descriptor,
      landmarks: detection.landmarks,
      expression: dominantExpression,
      box: detection.detection.box,
    };
  } catch (error) {
    return {
      detected: false,
      descriptor: null,
      landmarks: null,
      expression: '',
      box: null,
      error: error instanceof Error ? error.message : 'Face detection failed',
    };
  }
};

// Extract face descriptor from NID card photo
export const extractNIDFaceDescriptor = async (
  nidImageSrc: string
): Promise<Float32Array | null> => {
  try {
    const img = await faceapi.fetchImage(nidImageSrc);
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      console.warn('[FaceVerification] No face found in NID image');
      return null;
    }

    return detection.descriptor;
  } catch (error) {
    console.error('[FaceVerification] NID face extraction failed:', error);
    return null;
  }
};

// Compare two face descriptors (Euclidean distance)
export const compareFaces = (
  descriptor1: Float32Array,
  descriptor2: Float32Array,
  threshold: number = 0.6
): FaceVerificationResult => {
  const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
  const confidence = Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));
  const matched = distance < threshold;

  return {
    matched,
    confidence,
    distance: Math.round(distance * 1000) / 1000,
    threshold,
  };
};

// Full verification flow: compare live camera face with NID photo
export const verifyFaceWithNID = async (
  liveInput: HTMLVideoElement | HTMLCanvasElement,
  nidImageSrc: string,
  threshold: number = 0.6
): Promise<FaceVerificationResult> => {
  try {
    if (!modelsLoaded) {
      await loadFaceModels();
    }

    // Detect live face
    const liveDetection = await detectFace(liveInput);
    if (!liveDetection.detected || !liveDetection.descriptor) {
      return {
        matched: false,
        confidence: 0,
        distance: 1,
        threshold,
        error: 'No live face detected. Please look directly at the camera.',
      };
    }

    // Extract NID face
    const nidDescriptor = await extractNIDFaceDescriptor(nidImageSrc);
    if (!nidDescriptor) {
      return {
        matched: false,
        confidence: 0,
        distance: 1,
        threshold,
        error: 'No face detected in NID photo. Please upload a clearer image.',
      };
    }

    // Compare
    return compareFaces(liveDetection.descriptor, nidDescriptor, threshold);
  } catch (error) {
    return {
      matched: false,
      confidence: 0,
      distance: 1,
      threshold,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
};

// Draw face detection overlay on canvas
export const drawFaceOverlay = (
  canvas: HTMLCanvasElement,
  detection: FaceDetectionResult,
  matched?: boolean
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx || !detection.box) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const { x, y, width, height } = detection.box;
  const color = matched === undefined ? '#3b82f6' : matched ? '#22c55e' : '#ef4444';

  // Draw bounding box
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);

  // Draw corner accents
  const cornerLength = 20;
  ctx.lineWidth = 4;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(x, y + cornerLength);
  ctx.lineTo(x, y);
  ctx.lineTo(x + cornerLength, y);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(x + width - cornerLength, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + cornerLength);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(x, y + height - cornerLength);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x + cornerLength, y + height);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(x + width - cornerLength, y + height);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x + width, y + height - cornerLength);
  ctx.stroke();

  // Draw landmarks if available
  if (detection.landmarks) {
    const points = detection.landmarks.positions;
    ctx.fillStyle = color;
    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1.5, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
};
