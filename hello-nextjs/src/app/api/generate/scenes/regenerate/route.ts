/**
 * Scene regeneration API route.
 * POST /api/generate/scenes/regenerate - Regenerate scenes with optional feedback
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProjectById, updateProjectStage } from "@/lib/db/projects";
import {
  createScenes,
  deleteScenesByProjectId,
  getScenesByProjectId,
} from "@/lib/db/scenes";
import {
  getSceneTextConfigHint,
  isSceneTextConfigured,
  SceneTextApiError,
  regenerateScenes,
} from "@/lib/ai/scene-text";

/**
 * POST /api/generate/scenes/regenerate - Regenerate scenes with optional feedback
 * Body: { projectId: string, feedback?: string }
 * Returns: { success: boolean, scenes: Scene[], message: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSceneTextConfigured()) {
      return NextResponse.json(
        { error: `AI service is not configured. ${getSceneTextConfigHint()}` },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { projectId, feedback } = body;

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Get the project and verify ownership
    const project = await getProjectById(projectId, user.id);

    if (!project.story) {
      return NextResponse.json(
        { error: "Project has no story content. Please add a story first." },
        { status: 400 }
      );
    }

    // Get existing scenes for reference (before deletion)
    const existingScenes = await getScenesByProjectId(projectId);
    const previousSceneDescriptions = existingScenes.map((scene) => ({
      order_index: scene.order_index,
      description: scene.description,
    }));

    // Regenerate scenes using the configured text provider with previous context
    const sceneDescriptions = await regenerateScenes(
      project.story,
      project.style ?? undefined,
      previousSceneDescriptions.length > 0 ? previousSceneDescriptions : undefined,
      feedback
    );

    if (sceneDescriptions.length === 0) {
      return NextResponse.json(
        { error: "Failed to regenerate scenes. Please try again." },
        { status: 500 }
      );
    }

    // Delete existing scenes
    await deleteScenesByProjectId(projectId);

    // Create new scenes in the database
    const newScenes = await createScenes(projectId, sceneDescriptions);

    // Ensure project stage is 'scenes'
    await updateProjectStage(projectId, user.id, "scenes");

    return NextResponse.json({
      success: true,
      scenes: newScenes,
      message: `Successfully regenerated ${newScenes.length} scenes`,
    });
  } catch (error) {
    console.error("Error regenerating scenes:", error);

    // Handle specific errors
    if (error instanceof SceneTextApiError) {
      return NextResponse.json(
        { error: `AI service error: ${error.message}` },
        { status: 502 }
      );
    }

    // Handle project not found error
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to regenerate scenes" },
      { status: 500 }
    );
  }
}
