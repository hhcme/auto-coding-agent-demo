"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { VIDEO_STYLE_OPTIONS, getVideoStyleName } from "@/lib/video-style-options";
import type { VideoStyle } from "@/types/ai";

interface ProjectDetailActionsProps {
  projectId: string;
  title: string;
  story: string | null;
  style: string | null;
}

function getInitialStyle(style: string | null): VideoStyle {
  const matched = VIDEO_STYLE_OPTIONS.find((option) => option.id === style);
  return matched?.id ?? "realistic";
}

export function ProjectDetailActions({
  projectId,
  title,
  story,
  style,
}: ProjectDetailActionsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formTitle, setFormTitle] = useState(title);
  const [formStory, setFormStory] = useState(story ?? "");
  const [formStyle, setFormStyle] = useState<VideoStyle>(getInitialStyle(style));
  const [error, setError] = useState<string | null>(null);

  const currentStyleName = getVideoStyleName(style);
  const hasChanges = useMemo(
    () =>
      formTitle.trim() !== title ||
      formStory.trim() !== (story ?? "") ||
      formStyle !== getInitialStyle(style),
    [formStyle, formStory, formTitle, story, style, title],
  );

  const resetForm = () => {
    setFormTitle(title);
    setFormStory(story ?? "");
    setFormStyle(getInitialStyle(style));
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    setIsEditing(false);
  };

  const handleSave = async () => {
    setError(null);

    if (!formTitle.trim()) {
      setError("请输入项目标题");
      return;
    }

    if (!formStory.trim()) {
      setError("请输入故事内容");
      return;
    }

    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formTitle.trim(),
          story: formStory.trim(),
          style: formStyle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "更新项目失败");
      }

      showToast("项目已更新", "success");
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "更新项目失败";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `确定要删除项目“${title}”吗？该项目的分镜、图片和视频也会一起删除。`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "删除项目失败");
      }

      showToast("项目已删除", "success");
      router.push("/projects");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "删除项目失败";
      showToast(message, "error");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setIsEditing(true)}
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          编辑项目
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          {isDeleting ? "删除中..." : "删除项目"}
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 px-4 py-10 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  编辑项目
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  当前风格：{currentStyleName ?? "未设置"}
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isSaving}
                className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="关闭编辑面板"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              <div>
                <label
                  htmlFor="edit-title"
                  className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  项目标题
                </label>
                <input
                  id="edit-title"
                  type="text"
                  value={formTitle}
                  onChange={(event) => setFormTitle(event.target.value)}
                  disabled={isSaving}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-story"
                  className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  故事内容
                </label>
                <textarea
                  id="edit-story"
                  value={formStory}
                  onChange={(event) => setFormStory(event.target.value)}
                  rows={6}
                  disabled={isSaving}
                  className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  视频风格
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {VIDEO_STYLE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFormStyle(option.id)}
                      disabled={isSaving}
                      className={`flex flex-col rounded-lg border-2 p-3 text-left transition-all ${
                        formStyle === option.id
                          ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
                      }`}
                    >
                      <span
                        className={`text-sm font-medium ${
                          formStyle === option.id
                            ? "text-zinc-900 dark:text-zinc-100"
                            : "text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {option.name}
                      </span>
                      <span className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {option.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-6 py-5 dark:border-zinc-800">
              <button
                onClick={handleClose}
                disabled={isSaving}
                className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {isSaving ? "保存中..." : "保存修改"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
