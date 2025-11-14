import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const clientFormData = await req.formData();
    const audioFile = clientFormData.get("file") as Blob | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file found in the request." },
        { status: 400 }
      );
    }

    // 将从客户端收到的文件添加到新的 FormData 中
    const formData = new FormData();
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    formData.append("file", new Blob([audioBuffer], { type: audioFile.type }), 'audio.webm');
    formData.append("model", "alibaba/SenseVoiceSmall");
    formData.append("response_format", "json");
    // 你可以根据需要添加其他 SiliconFlow 支持的参数，例如 language
    // formData.append("language", "zh");

    const response = await fetch("https://api.siliconflow.cn/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.SILICONFLOW_API_KEY}`,
        // Content-Type 会由 fetch 根据 FormData 自动设置，不需要手动指定
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SiliconFlow API Error:", errorText);
      return NextResponse.json(
        { error: `SiliconFlow API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    const transcription = result.text;

    return NextResponse.json({ transcription });
  } catch (error) {
    console.error("ASR proxy error:", error);
    return NextResponse.json(
      { error: "Failed to process the audio file." },
      { status: 500 }
    );
  }
}