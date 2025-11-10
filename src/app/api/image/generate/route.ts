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
    const prompt = String(formData.get("prompt") ?? "");
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
      // 图生图：为保证服务器端 fetch 的兼容性，将 Next.js 提供的 File 转为 Blob 并带上文件名
      const arrayBuffer = await imageFile.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: imageFile.type || "application/octet-stream" });
      const filename = (imageFile as any).name ?? "image.png";

      const imageToImageFormData = new FormData();
      imageToImageFormData.append("image", blob, filename);
      imageToImageFormData.append("prompt", prompt);
      imageToImageFormData.append("model", "Kwai-Kolors/Kolors");
      imageToImageFormData.append("n", "1");
      imageToImageFormData.append("size", "1024x1024");
      imageToImageFormData.append("response_format", "url");

      response = await fetch(SILICONFLOW_API_URL, {
        method: "POST",
        headers: baseHeaders, // 让 fetch 为 FormData 设置 Content-Type
        body: imageToImageFormData as any, // HACK: Bypass FormData type issue in Next.js
      });
    } else {
      // 文生图
      const textToImageHeaders = {
        ...baseHeaders,
        "Content-Type": "application/json",
      };
      response = await fetch(SILICONFLOW_API_URL, {
        method: "POST",
        headers: textToImageHeaders,
        body: JSON.stringify({
          prompt: prompt,
          model: "Kwai-Kolors/Kolors",
          n: 1,
          size: "1024x1024",
          response_format: "url",
        }),
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
    // 支持两种返回：直接 url 或 base64 字符串（b64_json）
    let imageUrl = result.data?.[0]?.url;
    if (!imageUrl && result.data?.[0]?.b64_json) {
      const b64 = result.data[0].b64_json;
      const contentType = result.data[0].mime_type ?? "image/png";
      imageUrl = `data:${contentType};base64,${b64}`;
    }

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