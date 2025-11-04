import AuthForm from "../../components/AuthForm";
import Link from "next/link";
import { Mic, Sparkles } from "lucide-react";

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-teal-50">
      {/* Header with Logo */}
      <div className="pt-8 pb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="inline-flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
              Transovo AI
            </span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)] px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center bg-gradient-to-r from-purple-100 to-teal-100 text-purple-800 px-4 py-2 rounded-full text-sm font-semibold mb-6 shadow-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Welcome Back
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Get Started with
              <span className="bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent block">
                Transovo AI
              </span>
            </h1>
            <p className="text-lg text-gray-600">
              Lightning-fast transcription trusted by thousands of professionals
            </p>
          </div>

          {/* Auth Form Card */}
          <AuthForm />

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/80">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">99.8%</div>
              <div className="text-xs text-gray-600 font-medium mt-1">Accuracy</div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/80">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">30x</div>
              <div className="text-xs text-gray-600 font-medium mt-1">Faster</div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/80">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">∞</div>
              <div className="text-xs text-gray-600 font-medium mt-1">Unlimited</div>
            </div>
          </div>

          {/* Footer Link */}
          <div className="mt-8 text-center">
            <Link href="/" className="text-sm text-gray-600 hover:text-purple-600 transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
