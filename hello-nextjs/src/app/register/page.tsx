import { RegisterForm } from "@/components/auth/RegisterForm";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export default function RegisterPage() {
  const authAvailable = hasSupabaseConfig();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            注册
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            创建 Spring FES Video 账号
          </p>
        </div>
        <div className="mt-8 bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
          {!authAvailable && (
            <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-900">
                当前未配置 Supabase，注册表单已禁用。请先填写
                <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-xs">
                  hello-nextjs/.env.local
                </code>
                中的 Supabase 配置。
              </p>
            </div>
          )}
          <RegisterForm authAvailable={authAvailable} />
        </div>
      </div>
    </div>
  );
}
