import { NextResponse } from "next/server";
import { scoreWithGemini } from "@/lib/gemini";
import { autoImproveResume, scoreResume } from "@/lib/resume";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { resume = {}, targetRole = "", jobDescription = "" } = await request.json();
    const cleanResume = autoImproveResume(resume, targetRole);
    try {
      const ats = await scoreWithGemini(cleanResume, targetRole, jobDescription);
      return NextResponse.json({ ok: true, ats, provider: "gemini" });
    } catch (error) {
      console.warn("Gemini scoring failed, using local score:", error.message);
      const ats = scoreResume(cleanResume);
      return NextResponse.json({ ok: true, ats, provider: "local" });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "ATS score check failed." },
      { status: 500 },
    );
  }
}
