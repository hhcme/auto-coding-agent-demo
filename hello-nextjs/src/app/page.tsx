import { Header } from "@/components/layout/Header";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Home() {
  const authAvailable = hasSupabaseConfig();
  let user: { email?: string } | null = null;

  if (authAvailable) {
    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    user = currentUser;
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <Header user={user} authAvailable={authAvailable} />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="max-w-2xl text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            故事转视频生成平台
          </h1>
          <p className="mb-8 text-lg text-zinc-600 dark:text-zinc-400">
            输入您的故事，AI 将自动为您生成精美的分镜图片和视频
          </p>

          {!authAvailable ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-left text-amber-950 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
                <h2 className="text-lg font-semibold">本地开发服务已启动</h2>
                <p className="mt-2 text-sm leading-6 text-amber-900/90 dark:text-amber-100/90">
                  当前缺少 Supabase 环境变量，因此首页可以访问，但登录、项目管理和完整生成流程还不能使用。
                </p>
                <p className="mt-3 text-sm leading-6 text-amber-900/90 dark:text-amber-100/90">
                  先在 <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/70">hello-nextjs/.env.local</code> 填写
                  <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/70">NEXT_PUBLIC_SUPABASE_URL</code>
                  和
                  <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/70">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
                  ，再重启 dev server。
                </p>
              </div>
              <div className="flex justify-center gap-4">
                <Link
                  href="/login"
                  className="flex h-12 items-center justify-center rounded-lg border border-zinc-300 bg-white px-6 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  查看登录页
                </Link>
                <Link
                  href="/register"
                  className="flex h-12 items-center justify-center rounded-lg border border-zinc-300 bg-white px-6 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  查看注册页
                </Link>
              </div>
            </div>
          ) : user ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-zinc-600 dark:text-zinc-400">
                欢迎回来，{user.email}
              </p>
              <div className="flex gap-4">
                <Link
                  href="/projects"
                  className="flex h-12 items-center justify-center rounded-lg bg-zinc-900 px-6 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  查看我的项目
                </Link>
                <Link
                  href="/create"
                  className="flex h-12 items-center justify-center rounded-lg border border-zinc-300 bg-white px-6 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  创建新项目
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex justify-center gap-4">
              <Link
                href="/login"
                className="flex h-12 items-center justify-center rounded-lg bg-zinc-900 px-6 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="flex h-12 items-center justify-center rounded-lg border border-zinc-300 bg-white px-6 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                注册
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
