import { NextRequest, NextResponse } from "next/server";

const SILICONFLOW_API_URL = "https://api.siliconflow.cn/v1/images/generations";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.SILICONFLOW_API_KEY;
    if (!apiKey) {
      console.error("SiliconFlow API key is not configured in .env.local");
      return NextResponse.json(
        { error: "SiliconFlow API key is not configured." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const prompt = formData.get("prompt") as string;
    const imageFile = formData.get("image") as File | null;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required." },
        { status: 400 }
      );
    }

    const baseHeaders = {
      "Authorization": `Bearer ${apiKey}`,
    };

    let response;

    if (imageFile) {
      // 图生图
      const imageToImageFormData = new FormData();
      imageToImageFormData.append("image", imageFile);
      imageToImageFormData.append("prompt", prompt);
      imageToImageFormData.append("model", "Kwai-Kolors/Kolors");
      imageToImageFormData.append("n", "1");
      imageToImageFormData.append("size", "1024x1024");
      imageToImageFormData.append("response_format", "url");
      
      response = await fetch(SILICONFLOW_API_URL, {
        method: "POST",
        headers: baseHeaders, // Let fetch set Content-Type for FormData
        body: imageToImageFormData,
      });
    } else {
      // 文生图
      const textToImageHeaders = {
        ...baseHeaders,
        "Content-Type": "application/json",
      };
      const requestBody = JSON.stringify({
        model: "Kwai-Kolors/Kolors",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        response_format: "url",
      });

      response = await fetch(SILICONFLOW_API_URL, {
        method: "POST",
        headers: textToImageHeaders,
        body: requestBody,
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SiliconFlow Image API Error:", errorText);
      return NextResponse.json(
        { error: `SiliconFlow API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    const imageUrl = result.data?.[0]?.url;

    if (!imageUrl) {
      console.error("Image URL not found in SiliconFlow response:", result);
      return NextResponse.json(
        { error: "Image URL not found in response." },
        { status: 500 }
      );
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Image generation internal error:", error);
    return NextResponse.json(
      {
        error: "An internal error occurred during image generation.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}