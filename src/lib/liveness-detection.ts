import * as faceapi from 'face-api.js';

export type LivenessChallenge = 'blink' | 'turn_left' | 'turn_right' | 'smile' | 'nod';

export interface LivenessState {
  isLive: boolean;
  currentChallenge: LivenessChallenge;
  challengesPassed: LivenessChallenge[];
  challengesRequired: LivenessChallenge[];
  score: number;
  message: string;
}

export interface LivenessFrame {
  leftEyeOpenness: number;
  rightEyeOpenness: number;
  headYaw: number;
  headPitch: number;
  smileScore: number;
  timestamp: number;
}

const BLINK_THRESHOLD = 0.25;
const TURN_THRESHOLD = 15;
const SMILE_THRESHOLD = 0.7;
const NOD_THRESHOLD = 10;
const FRAMES_FOR_BLINK = 3;

// Calculate eye aspect ratio (EAR) for blink detection
const calculateEyeOpenness = (landmarks: faceapi.FaceLandmarks68, eye: 'left' | 'right'): number => {
  const points = landmarks.positions;

  // Left eye: points 36-41, Right eye: points 42-47
  const offset = eye === 'left' ? 36 : 42;

  const p1 = points[offset];     // outer corner
  const p2 = points[offset + 1]; // upper-outer
  const p3 = points[offset + 2]; // upper-inner
  const p4 = points[offset + 3]; // inner corner
  const p5 = points[offset + 4]; // lower-inner
  const p6 = points[offset + 5]; // lower-outer

  // Vertical distances
  const v1 = Math.sqrt(Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2));
  const v2 = Math.sqrt(Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2));

  // Horizontal distance
  const h = Math.sqrt(Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2));

  // Eye aspect ratio
  return h > 0 ? (v1 + v2) / (2.0 * h) : 0;
};

// Estimate head rotation from landmarks
const estimateHeadPose = (landmarks: faceapi.FaceLandmarks68): { yaw: number; pitch: number } => {
  const points = landmarks.positions;

  // Nose tip (point 30), left face edge (point 0), right face edge (point 16)
  const noseTip = points[30];
  const leftEdge = points[0];
  const rightEdge = points[16];

  // Yaw: how much face is turned left/right
  const faceWidth = rightEdge.x - leftEdge.x;
  const noseOffset = noseTip.x - (leftEdge.x + faceWidth / 2);
  const yaw = faceWidth > 0 ? (noseOffset / (faceWidth / 2)) * 45 : 0;

  // Pitch: how much face is tilted up/down
  const noseBridge = points[27]; // top of nose bridge
  const chin = points[8];        // chin point
  const faceHeight = chin.y - noseBridge.y;
  const noseVerticalOffset = noseTip.y - (noseBridge.y + faceHeight * 0.4);
  const pitch = faceHeight > 0 ? (noseVerticalOffset / faceHeight) * 30 : 0;

  return { yaw, pitch };
};

export class LivenessDetector {
  private frameHistory: LivenessFrame[] = [];
  private state: LivenessState;
  private blinkCount = 0;
  private wasEyeClosed = false;
  private closedFrameCount = 0;

  constructor(challenges?: LivenessChallenge[]) {
    const defaultChallenges: LivenessChallenge[] = ['blink', 'turn_left', 'smile'];
    this.state = {
      isLive: false,
      currentChallenge: (challenges || defaultChallenges)[0],
      challengesPassed: [],
      challengesRequired: challenges || defaultChallenges,
      score: 0,
      message: 'Please blink your eyes',
    };
  }

  // Get current state
  getState(): LivenessState {
    return { ...this.state };
  }

  // Reset detector
  reset(): void {
    this.frameHistory = [];
    this.blinkCount = 0;
    this.wasEyeClosed = false;
    this.closedFrameCount = 0;
    this.state.isLive = false;
    this.state.challengesPassed = [];
    this.state.currentChallenge = this.state.challengesRequired[0];
    this.state.score = 0;
    this.state.message = this.getChallengeMessage(this.state.currentChallenge);
  }

  // Process a video frame
  async processFrame(
    detection: faceapi.WithFaceExpressions<
      faceapi.WithFaceDescriptor<
        faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>
      >
    >
  ): Promise<LivenessState> {
    const landmarks = detection.landmarks;
    const expressions = detection.expressions;

    // Calculate frame metrics
    const leftEyeOpenness = calculateEyeOpenness(landmarks, 'left');
    const rightEyeOpenness = calculateEyeOpenness(landmarks, 'right');
    const { yaw, pitch } = estimateHeadPose(landmarks);
    const smileScore = expressions.happy || 0;

    const frame: LivenessFrame = {
      leftEyeOpenness,
      rightEyeOpenness,
      headYaw: yaw,
      headPitch: pitch,
      smileScore,
      timestamp: Date.now(),
    };

    this.frameHistory.push(frame);

    // Keep only last 60 frames (~2 seconds at 30fps)
    if (this.frameHistory.length > 60) {
      this.frameHistory.shift();
    }

    // Check current challenge
    const passed = this.checkChallenge(this.state.currentChallenge, frame);

    if (passed) {
      this.state.challengesPassed.push(this.state.currentChallenge);
      this.state.score = Math.round(
        (this.state.challengesPassed.length / this.state.challengesRequired.length) * 100
      );

      // Move to next challenge or complete
      const nextIndex = this.state.challengesPassed.length;
      if (nextIndex < this.state.challengesRequired.length) {
        this.state.currentChallenge = this.state.challengesRequired[nextIndex];
        this.state.message = this.getChallengeMessage(this.state.currentChallenge);
      } else {
        this.state.isLive = true;
        this.state.message = 'Liveness verified successfully!';
      }
    }

    return this.getState();
  }

  // Check if current challenge is completed
  private checkChallenge(challenge: LivenessChallenge, frame: LivenessFrame): boolean {
    switch (challenge) {
      case 'blink':
        return this.checkBlink(frame);
      case 'turn_left':
        return frame.headYaw < -TURN_THRESHOLD;
      case 'turn_right':
        return frame.headYaw > TURN_THRESHOLD;
      case 'smile':
        return frame.smileScore > SMILE_THRESHOLD;
      case 'nod':
        return this.checkNod();
      default:
        return false;
    }
  }

  // Blink detection: eyes must close then open
  private checkBlink(frame: LivenessFrame): boolean {
    const avgOpenness = (frame.leftEyeOpenness + frame.rightEyeOpenness) / 2;
    const isClosed = avgOpenness < BLINK_THRESHOLD;

    if (isClosed) {
      this.closedFrameCount++;
    }

    if (this.wasEyeClosed && !isClosed && this.closedFrameCount >= FRAMES_FOR_BLINK) {
      this.blinkCount++;
      this.closedFrameCount = 0;
      this.wasEyeClosed = false;
      return this.blinkCount >= 1;
    }

    this.wasEyeClosed = isClosed;
    return false;
  }

  // Nod detection: head must go down then up
  private checkNod(): boolean {
    if (this.frameHistory.length < 15) return false;
    const recent = this.frameHistory.slice(-15);
    const pitches = recent.map((f) => f.headPitch);
    const maxPitch = Math.max(...pitches);
    const minPitch = Math.min(...pitches);
    return maxPitch - minPitch > NOD_THRESHOLD;
  }

  // Get user-friendly message for each challenge
  private getChallengeMessage(challenge: LivenessChallenge): string {
    const messages: Record<LivenessChallenge, string> = {
      blink: 'Please blink your eyes',
      turn_left: 'Please turn your head to the left',
      turn_right: 'Please turn your head to the right',
      smile: 'Please smile',
      nod: 'Please nod your head',
    };
    return messages[challenge];
  }
}

// Quick liveness check (texture analysis for anti-spoofing)
export const analyzeTextureForSpoofing = (canvas: HTMLCanvasElement): { isReal: boolean; score: number } => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { isReal: false, score: 0 };

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Calculate Laplacian variance (measures image sharpness/texture)
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const idx = (y * canvas.width + x) * 4;
      const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

      // Laplacian kernel
      const top = 0.299 * data[((y - 1) * canvas.width + x) * 4] +
                  0.587 * data[((y - 1) * canvas.width + x) * 4 + 1] +
                  0.114 * data[((y - 1) * canvas.width + x) * 4 + 2];
      const bottom = 0.299 * data[((y + 1) * canvas.width + x) * 4] +
                     0.587 * data[((y + 1) * canvas.width + x) * 4 + 1] +
                     0.114 * data[((y + 1) * canvas.width + x) * 4 + 2];
      const left = 0.299 * data[(y * canvas.width + (x - 1)) * 4] +
                   0.587 * data[(y * canvas.width + (x - 1)) * 4 + 1] +
                   0.114 * data[(y * canvas.width + (x - 1)) * 4 + 2];
      const right = 0.299 * data[(y * canvas.width + (x + 1)) * 4] +
                    0.587 * data[(y * canvas.width + (x + 1)) * 4 + 1] +
                    0.114 * data[(y * canvas.width + (x + 1)) * 4 + 2];

      const laplacian = -4 * gray + top + bottom + left + right;
      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }

  const mean = sum / count;
  const variance = sumSq / count - mean * mean;

  // Real faces have higher texture variance than printed photos or screens
  const SPOOF_THRESHOLD = 100;
  const score = Math.min(100, Math.round(variance / 10));

  return {
    isReal: variance > SPOOF_THRESHOLD,
    score,
  };
};
