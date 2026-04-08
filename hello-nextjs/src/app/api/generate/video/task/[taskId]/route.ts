/**
 * Video task status API.
 * GET /api/generate/video/task/[taskId] - Query video task status
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getVideoTaskStatus,
  isVolcVideoConfigured,
  VolcVideoApiError,
  downloadVideo,
} from "@/lib/ai/volc-video";
import {
  getVideoTaskContext,
  updateCompletedVideo,
  uploadFile,
} from "@/lib/db/media";
import { updateSceneVideoStatus } from "@/lib/db/scenes";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

/**
 * GET /api/generate/video/task/[taskId] - Query video task status
 * Query params: sceneId, projectId, videoId
 * Returns: { success: boolean, status: string, videoUrl?: string }
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Volc Video API is configured
    if (!isVolcVideoConfigured()) {
      return NextResponse.json(
        { error: "Video generation service is not configured. Please set VOLC_API_KEY." },
        { status: 503 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const requestedSceneId = searchParams.get("sceneId");
    const requestedProjectId = searchParams.get("projectId");
    const requestedVideoId = searchParams.get("videoId");

    // Resolve task ownership from the database instead of trusting query params.
    const taskContext = await getVideoTaskContext(taskId);
    const sceneId = taskContext.video.scene_id;
    const projectId = taskContext.projectId;
    const videoId = taskContext.video.id;

    if (
      (requestedSceneId && requestedSceneId !== sceneId) ||
      (requestedProjectId && requestedProjectId !== projectId) ||
      (requestedVideoId && requestedVideoId !== videoId)
    ) {
      return NextResponse.json(
        { error: "Task context does not match the requested resource" },
        { status: 400 },
      );
    }

    // Query task status
    const status = await getVideoTaskStatus(taskId);

    // If completed and we have all required info, download and save the video
    if (status.status === "completed" && status.videoUrl) {
      try {
        // Download video
        const videoBuffer = await downloadVideo(status.videoUrl);

        // Upload to storage
        const timestamp = Date.now();
        const fileName = `video-${taskId}-${timestamp}.mp4`;
        const { path, url } = await uploadFile(
          user.id,
          projectId,
          fileName,
          videoBuffer,
          { contentType: "video/mp4" }
        );

        // Update existing video record with completed data
        await updateCompletedVideo(videoId, path, url, {
          duration: 5,
        });

        // Update scene video status to completed
        await updateSceneVideoStatus(sceneId, "completed");

        return NextResponse.json({
          success: true,
          status: "completed",
          videoUrl: url,
          videoId,
          message: "Video generated and saved successfully",
        });
      } catch (saveError) {
        console.error("Error saving video:", saveError);
        // Still return success but with a warning
        return NextResponse.json({
          success: true,
          status: "completed",
          videoUrl: status.videoUrl,
          warning: "Video generated but failed to save to storage",
        });
      }
    }

    // If failed, update scene status
    if (status.status === "failed") {
      await updateSceneVideoStatus(sceneId, "failed");
    }

    return NextResponse.json({
      success: true,
      status: status.status,
      videoUrl: status.videoUrl,
      errorMessage: status.errorMessage,
    });
  } catch (error) {
    console.error("Error querying video task status:", error);

    if (error instanceof VolcVideoApiError) {
      return NextResponse.json(
        { error: `Video status query error: ${error.message}` },
        { status: 502 }
      );
    }

    if (error instanceof Error && error.message.includes("Video task not found")) {
      return NextResponse.json({ error: "Video task not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to query video task status" },
      { status: 500 }
    );
  }
}
