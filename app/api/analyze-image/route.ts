import { NextRequest, NextResponse } from 'next/server';

const COMPUTER_VISION_ENDPOINT = process.env.COMPUTER_VISION_API_ENDPOINT;
const COMPUTER_VISION_KEY = process.env.COMPUTER_VISION_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const response = await fetch(`${COMPUTER_VISION_ENDPOINT}/vision/v3.2/analyze?visualFeatures=Tags,Description`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Ocp-Apim-Subscription-Key': COMPUTER_VISION_KEY!,
      },
      body: buffer,
    });

    if (!response.ok) {
      throw new Error(`Computer Vision API responded with status ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in analyze-image API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

