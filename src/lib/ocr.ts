import Tesseract from 'tesseract.js';

export interface NIDData {
  name: string;
  nameEn: string;
  nameBn: string;
  nidNumber: string;
  dateOfBirth: string;
  fatherName: string;
  motherName: string;
  address: string;
  rawText: string;
  confidence: number;
}

export interface OCRResult {
  success: boolean;
  data: NIDData | null;
  error?: string;
  processingTime: number;
}

// Preprocess image for better OCR accuracy
const preprocessImage = async (imageSource: string | File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Scale up for better OCR
      const scale = Math.max(1, 1500 / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      // Draw and apply grayscale + contrast enhancement
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Apply contrast enhancement
        const contrast = 1.5;
        const adjusted = ((gray / 255 - 0.5) * contrast + 0.5) * 255;
        const final = Math.max(0, Math.min(255, adjusted));
        // Apply threshold for binarization
        const binary = final > 128 ? 255 : 0;
        data[i] = binary;
        data[i + 1] = binary;
        data[i + 2] = binary;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => reject(new Error('Failed to load image'));

    if (imageSource instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target?.result as string; };
      reader.readAsDataURL(imageSource);
    } else {
      img.src = imageSource;
    }
  });
};

// Parse Bangladesh NID card text
const parseNIDText = (text: string): Partial<NIDData> => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const result: Partial<NIDData> = { rawText: text };

  // NID Number pattern: 10 or 13 or 17 digits
  const nidMatch = text.match(/\b(\d{10}|\d{13}|\d{17})\b/);
  if (nidMatch) {
    result.nidNumber = nidMatch[1];
  }

  // Date of Birth pattern: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dobMatch = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dobMatch) {
    result.dateOfBirth = `${dobMatch[1].padStart(2, '0')}/${dobMatch[2].padStart(2, '0')}/${dobMatch[3]}`;
  }

  // Name extraction - look for "Name" label in English
  const nameEnMatch = text.match(/Name\s*[:\-]?\s*([A-Za-z\s\.]+)/i);
  if (nameEnMatch) {
    result.nameEn = nameEnMatch[1].trim();
    result.name = result.nameEn;
  }

  // Bengali name - detect Bengali unicode range
  const bnNameMatch = text.match(/([\u0980-\u09FF\s]+)/);
  if (bnNameMatch && bnNameMatch[1].trim().length > 3) {
    result.nameBn = bnNameMatch[1].trim();
    if (!result.name) result.name = result.nameBn;
  }

  // Father's name
  const fatherMatch = text.match(/Father\s*[:\-]?\s*([A-Za-z\s\.]+)/i);
  if (fatherMatch) {
    result.fatherName = fatherMatch[1].trim();
  }

  // Mother's name
  const motherMatch = text.match(/Mother\s*[:\-]?\s*([A-Za-z\s\.]+)/i);
  if (motherMatch) {
    result.motherName = motherMatch[1].trim();
  }

  return result;
};

// Main OCR function
export const scanNIDCard = async (
  imageSource: string | File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> => {
  const startTime = Date.now();

  try {
    // Preprocess image
    const processedImage = await preprocessImage(imageSource);

    // Run Tesseract OCR with Bengali + English
    const result = await Tesseract.recognize(processedImage, 'eng+ben', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });

    const confidence = result.data.confidence;
    const parsedData = parseNIDText(result.data.text);

    // Validate minimum required fields
    if (!parsedData.nidNumber && !parsedData.name) {
      return {
        success: false,
        data: null,
        error: 'Could not extract NID information. Please ensure the image is clear and well-lit.',
        processingTime: Date.now() - startTime,
      };
    }

    return {
      success: true,
      data: {
        name: parsedData.name || 'Unknown',
        nameEn: parsedData.nameEn || '',
        nameBn: parsedData.nameBn || '',
        nidNumber: parsedData.nidNumber || '',
        dateOfBirth: parsedData.dateOfBirth || '',
        fatherName: parsedData.fatherName || '',
        motherName: parsedData.motherName || '',
        address: parsedData.address || '',
        rawText: parsedData.rawText || '',
        confidence,
      },
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'OCR processing failed',
      processingTime: Date.now() - startTime,
    };
  }
};

// Validate NID number format
export const isValidNID = (nid: string): boolean => {
  const cleaned = nid.replace(/\s/g, '');
  return /^(\d{10}|\d{13}|\d{17})$/.test(cleaned);
};

// Calculate age from DOB string
export const calculateAge = (dob: string): number => {
  const parts = dob.split('/');
  if (parts.length !== 3) return 0;
  const birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};
