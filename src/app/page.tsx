'use client';

import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mic, 
  Upload,
  ArrowRight,
  CheckCircle,
  Zap,
  Shield,
  Users,
  Globe,
  Play,
  Clock,
  Target,
  Star,
  FileText,
  Headphones,
  MessageSquare,
  Download,
  Sparkles,
  Award,
  TrendingUp,
  Lock,
  X
} from 'lucide-react';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (loading) {
  return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
        </div>
    );
  }

  if (user) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-teal-500 rounded-xl flex items-center justify-center shadow-sm">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Transovo AI</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-purple-600 transition-colors font-medium">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-purple-600 transition-colors font-medium">Pricing</a>
              <a href="#testimonials" className="text-gray-600 hover:text-purple-600 transition-colors font-medium">Reviews</a>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="/auth?mode=login" 
                className="text-gray-700 hover:text-purple-600 font-medium transition-colors px-4 py-2 rounded-lg hover:bg-purple-50"
              >
                Log In
              </a>
            <a 
              href="/auth" 
                className="bg-gradient-to-r from-purple-600 to-teal-500 text-white px-6 py-2.5 rounded-xl hover:from-purple-700 hover:to-teal-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Get Started Free
            </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-teal-50">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-100/20 to-teal-100/20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center bg-gradient-to-r from-purple-100 to-teal-100 text-purple-800 px-4 py-2 rounded-full text-sm font-semibold mb-6 shadow-sm">
                <Sparkles className="w-4 h-4 mr-2" />
                #1 AI Transcription Platform
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
                Convert Audio to Text with
                <span className="bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent block"> Superhuman Accuracy</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl leading-relaxed">
                Transform your audio and video files into accurate, searchable text with advanced speaker diarization and word-level timestamps. 
                <span className="font-semibold text-gray-900">25 languages • 99.8% accuracy • Up to 10 hours per file</span>.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <a 
                  href="/auth" 
                  className="inline-flex items-center justify-center bg-gradient-to-r from-purple-600 to-teal-500 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-teal-600 transition-all duration-200 text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                >
                  Start Transcribing Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </a>
                <a 
                  href="#demo" 
                  className="inline-flex items-center justify-center bg-white text-gray-900 px-8 py-4 rounded-xl hover:bg-gray-50 transition-all duration-200 text-lg font-semibold border-2 border-gray-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Watch Demo
                </a>
              </div>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-gray-600">
                <div className="flex items-center bg-white/60 px-3 py-2 rounded-lg">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  <span className="font-medium">7 days free trial</span>
                </div>
                <div className="flex items-center bg-white/60 px-3 py-2 rounded-lg">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  <span className="font-medium">90 minutes included</span>
                </div>
                <div className="flex items-center bg-white/60 px-3 py-2 rounded-lg">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  <span className="font-medium">No credit card</span>
                </div>
              </div>
            </div>

            {/* Right Content - Demo Interface */}
            <div className="relative">
              <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-500 font-medium">Transovo AI</div>
                </div>
                
                {/* Demo Transcript */}
                <div className="space-y-5">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-purple-700 font-bold text-sm">A</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-sm font-semibold text-gray-900">Alice Johnson</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">00:15</span>
                        <Play className="w-3 h-3 text-purple-500" />
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        Thank you for joining us today. I'm excited to discuss our quarterly results and the new product launch.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-100 to-teal-200 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-teal-700 font-bold text-sm">B</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-sm font-semibold text-gray-900">Bob Smith</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">00:28</span>
                        <Play className="w-3 h-3 text-teal-500" />
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        Absolutely, Alice. The numbers look fantastic this quarter. We've seen a 40% increase in user engagement.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-purple-700 font-bold text-sm">A</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-sm font-semibold text-gray-900">Alice Johnson</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">00:45</span>
                        <Play className="w-3 h-3 text-purple-500" />
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        That's incredible! The new features are really resonating with our users. What about the mobile app performance?
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                    <span>2 speakers detected</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Award className="w-3 h-3" />
                    <span>99.8% accuracy</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>12 seconds</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full flex items-center justify-center shadow-2xl">
                <Target className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Free Trial Banner */}
      <section className="bg-gradient-to-r from-purple-600 via-teal-500 to-purple-700 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col md:flex-row items-center justify-between text-white">
            <div className="flex items-center mb-6 md:mb-0">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mr-6 shadow-xl">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-3xl font-bold mb-2">Try 7 Days Free • No Credit Card Required</h3>
                <p className="text-white/90 text-lg">Get 90 minutes of transcription + full access to all premium features</p>
              </div>
            </div>
            <a 
              href="/auth" 
              className="bg-white text-purple-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-200 shadow-2xl whitespace-nowrap text-lg transform hover:-translate-y-1"
            >
              Start Free Trial →
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gradient-to-br from-gray-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent mb-3">99.8%</div>
              <div className="text-gray-600 font-medium">Accuracy Rate</div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent mb-3">30x</div>
              <div className="text-gray-600 font-medium">Faster than Manual</div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent mb-3">25</div>
              <div className="text-gray-600 font-medium">Languages Supported</div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent mb-3">1M+</div>
              <div className="text-gray-600 font-medium">Files Processed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center bg-gradient-to-r from-purple-100 to-teal-100 text-purple-800 px-4 py-2 rounded-full text-sm font-semibold mb-6 shadow-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Professional-Grade Features
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Everything You Need for Perfect Transcription
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              From individual creators to enterprise teams, Transovo AI provides the tools you need to transform audio into actionable text.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 group hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Speaker Diarization</h3>
              <p className="text-gray-600 leading-relaxed">
                Automatically identify and separate different speakers with advanced AI. Know who said what and when with perfect accuracy.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 group hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Lightning Fast</h3>
              <p className="text-gray-600 leading-relaxed">
                Process hours of audio in minutes, not hours. Our AI is 30x faster than manual transcription with superior accuracy.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 group hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                <Upload className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Unlimited File Processing</h3>
              <p className="text-gray-600 leading-relaxed">
                Upload files up to 10 hours and 5GB each. Batch process unlimited files simultaneously—no caps, no limits.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 group hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Word-Level Timestamps</h3>
              <p className="text-gray-600 leading-relaxed">
                Get precise timestamps for every word. Perfect for video editing, subtitles, accessibility, and legal documentation.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 group hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Enterprise Security</h3>
              <p className="text-gray-600 leading-relaxed">
                Bank-level encryption, SOC2 compliance, and zero data retention. Your sensitive content stays private and secure.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 group hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">25 European Languages</h3>
              <p className="text-gray-600 leading-relaxed">
                Automatic language detection for 25 languages including English, Spanish, French, German, Italian, Portuguese, and 19 more European languages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Languages Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center bg-gradient-to-r from-orange-100 to-purple-100 text-orange-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Globe className="w-4 h-4 mr-2" />
              Automatic Language Detection
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              25 Languages Supported
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI automatically detects and transcribes audio in any of these 25 European languages—no manual selection needed
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { name: 'English', flag: '🇺🇸', code: 'en' },
              { name: 'Spanish', flag: '🇪🇸', code: 'es' },
              { name: 'French', flag: '🇫🇷', code: 'fr' },
              { name: 'German', flag: '🇩🇪', code: 'de' },
              { name: 'Italian', flag: '🇮🇹', code: 'it' },
              { name: 'Portuguese', flag: '🇵🇹', code: 'pt' },
              { name: 'Dutch', flag: '🇳🇱', code: 'nl' },
              { name: 'Polish', flag: '🇵🇱', code: 'pl' },
              { name: 'Russian', flag: '🇷🇺', code: 'ru' },
              { name: 'Ukrainian', flag: '🇺🇦', code: 'uk' },
              { name: 'Czech', flag: '🇨🇿', code: 'cs' },
              { name: 'Romanian', flag: '🇷🇴', code: 'ro' },
              { name: 'Swedish', flag: '🇸🇪', code: 'sv' },
              { name: 'Danish', flag: '🇩🇰', code: 'da' },
              { name: 'Finnish', flag: '🇫🇮', code: 'fi' },
              { name: 'Greek', flag: '🇬🇷', code: 'el' },
              { name: 'Hungarian', flag: '🇭🇺', code: 'hu' },
              { name: 'Bulgarian', flag: '🇧🇬', code: 'bg' },
              { name: 'Croatian', flag: '🇭🇷', code: 'hr' },
              { name: 'Slovak', flag: '🇸🇰', code: 'sk' },
              { name: 'Slovenian', flag: '🇸🇮', code: 'sl' },
              { name: 'Estonian', flag: '🇪🇪', code: 'et' },
              { name: 'Latvian', flag: '🇱🇻', code: 'lv' },
              { name: 'Lithuanian', flag: '🇱🇹', code: 'lt' },
              { name: 'Maltese', flag: '🇲🇹', code: 'mt' },
            ].map((lang) => (
              <div key={lang.code} className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all duration-200">
                <div className="text-3xl mb-2 text-center">{lang.flag}</div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900 text-sm">{lang.name}</div>
                  <div className="text-xs text-gray-500 uppercase">{lang.code}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-gradient-to-r from-orange-50 to-purple-50 rounded-2xl p-8 border border-orange-200">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center mb-4 md:mb-0">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-purple-600 rounded-lg flex items-center justify-center mr-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Automatic Detection • No Setup Required</h3>
                  <p className="text-gray-600">Just upload your audio—our AI identifies the language instantly</p>
                </div>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">99.8%</div>
                  <div className="text-gray-600">Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">25</div>
                  <div className="text-gray-600">Languages</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">0s</div>
                  <div className="text-gray-600">Setup Time</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Complete Feature List Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-gradient-to-r from-orange-100 to-purple-100 text-orange-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Star className="w-4 h-4 mr-2" />
              Professional-Grade Features
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need, Included
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transovo AI includes enterprise features that competitors charge extra for or don't offer at all
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Core Transcription Features */}
            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-orange-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Core Transcription</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>99.8% accuracy</strong> with Parakeet AI</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Automatic punctuation</strong> & capitalization</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Word-level timestamps</strong> (start/end for every word)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Segment timestamps</strong> for navigation</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Real-time audio highlighting</strong> during playback</span>
                </li>
              </ul>
            </div>

            {/* Speaker & Language Features */}
            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-purple-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Speaker & Language</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Advanced speaker diarization</strong> (who said what)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Unlimited speakers</strong> detection</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>25 languages</strong> with auto-detection</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>No language switching</strong> required</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Multi-speaker meetings</strong> optimized</span>
                </li>
              </ul>
            </div>

            {/* AI Intelligence Features */}
            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-blue-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">AI Intelligence</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>AI Brief Summary</strong> (quick overview)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>AI Detailed Summary</strong> (comprehensive)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Key Points Extraction</strong></span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Action Items Detection</strong></span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>AI Chat Assistant</strong> (ask questions about your transcript)</span>
                </li>
              </ul>
            </div>

            {/* File Processing Features */}
            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-green-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mr-3">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">File Processing</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Up to 10 hours</strong> per file</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Up to 5GB</strong> per file</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Unlimited batch processing</strong></span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Audio & video support</strong> (MP3, WAV, MP4, etc.)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Automatic format conversion</strong></span>
                </li>
              </ul>
            </div>

            {/* Collaboration & Workflow */}
            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-yellow-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center mr-3">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Collaboration & Workflow</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Favorites & Archive</strong> organization</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Search & filter</strong> transcriptions</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Team workspace</strong> (Team & Agency plans)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Persistent AI data</strong> (summaries & chat saved)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Admin controls</strong> (Team plans)</span>
                </li>
              </ul>
            </div>

            {/* Export & Integration */}
            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-red-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center mr-3">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Export & Integration</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Multiple export formats</strong> (plain text, formatted, speakers)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Timestamp options</strong> (with/without)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>SRT/VTT subtitle export</strong></span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>API access</strong> (Team & Agency plans)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Custom integrations</strong> (Agency plans)</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Competitive Advantage Callout */}
          <div className="mt-12 bg-gradient-to-r from-purple-600 via-teal-500 to-purple-700 rounded-2xl p-8 text-white">
            <div className="text-center mb-6">
              <h3 className="text-2xl md:text-3xl font-bold mb-3">Why Transovo AI Stands Out</h3>
              <p className="text-white/90 text-lg max-w-3xl mx-auto">
                Features that competitors charge extra for (or don't offer at all) are included in every plan
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="text-3xl font-bold mb-2">10 hours</div>
                <div className="text-white/80 text-sm">Per file limit</div>
                <div className="text-white/60 text-xs mt-2">vs 3-6 hours typical</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="text-3xl font-bold mb-2">5GB</div>
                <div className="text-white/80 text-sm">File size limit</div>
                <div className="text-white/60 text-xs mt-2">vs 2GB typical</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="text-3xl font-bold mb-2">Unlimited</div>
                <div className="text-white/80 text-sm">Batch processing</div>
                <div className="text-white/60 text-xs mt-2">No caps or quotas</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="text-3xl font-bold mb-2">AI Chat</div>
                <div className="text-white/80 text-sm">Built-in assistant</div>
                <div className="text-white/60 text-xs mt-2">Most don't offer this</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Free Trial Details Section */}
      <section className="bg-gradient-to-br from-purple-50 via-teal-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Your 7-Day Free Trial Includes
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience everything our platform has to offer—no credit card required, no commitments
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">90 Minutes Free</h3>
              <p className="text-gray-600 text-center text-sm">
                Enough to transcribe multiple meetings, interviews, or podcasts. Split across any number of files.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">All Features Unlocked</h3>
              <p className="text-gray-600 text-center text-sm">
                Speaker diarization, AI summaries, bulk upload, word-level highlights, export—everything included.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">No Credit Card</h3>
              <p className="text-gray-600 text-center text-sm">
                Start your trial instantly with just an email. No payment details required until you upgrade.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Download className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Keep Your Files</h3>
              <p className="text-gray-600 text-center text-sm">
                All trial transcripts stay accessible forever. Export and download even after trial ends.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-purple-200">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">What Happens When My Trial Ends?</h3>
              <p className="text-gray-600">
                After 7 days or 90 minutes (whichever comes first), you can upgrade anytime to continue transcribing.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">✓</div>
                <h4 className="font-semibold text-gray-900 mb-1">Keep Your Work</h4>
                <p className="text-sm text-gray-600">Access all trial transcripts forever</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">✓</div>
                <h4 className="font-semibold text-gray-900 mb-1">Cancel Anytime</h4>
                <p className="text-sm text-gray-600">No automatic charges or subscriptions</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">✓</div>
                <h4 className="font-semibold text-gray-900 mb-1">Upgrade When Ready</h4>
                <p className="text-sm text-gray-600">Choose any plan that fits your needs</p>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <a 
              href="/auth" 
              className="inline-flex items-center bg-gradient-to-r from-purple-600 to-teal-500 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-teal-600 transition-all duration-200 font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              Start Your Free Trial Now →
            </a>
            <p className="text-sm text-gray-500 mt-3">No credit card • No commitment • Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-gradient-to-br from-gray-50 to-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center bg-gradient-to-r from-purple-100 to-teal-100 text-purple-800 px-4 py-2 rounded-full text-sm font-semibold mb-6 shadow-sm">
              <Award className="w-4 h-4 mr-2" />
              Simple, Transparent Pricing
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Choose Your Perfect Plan
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Start with unlimited transcription, then add AI content repurposing when you need it. 
              Simple pricing, no hidden fees, cancel anytime.
            </p>
            
            {/* Billing Toggle */}
            <div className="mt-10 flex items-center justify-center">
              <span className="text-gray-600 mr-4 font-medium">Monthly</span>
              <button className="relative inline-flex h-7 w-12 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2" id="billing-toggle">
                <span className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform translate-x-1 shadow-lg" id="toggle-slider"></span>
              </button>
              <span className="text-gray-600 ml-4 font-medium">Annual</span>
              <span className="ml-3 inline-flex items-center bg-gradient-to-r from-green-100 to-teal-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold shadow-sm">
                Save 17%
              </span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* FREE TRIAL - NEW! */}
            <div className="bg-gradient-to-br from-purple-50 to-teal-50 border-2 border-purple-200 rounded-3xl p-8 relative shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-purple-600 to-teal-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  START HERE
                  </div>
                    </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Trial</h3>
                <p className="text-gray-600 mb-6 font-medium">Try before you buy</p>
                <div className="mb-6">
                  <span className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">FREE</span>
                  <div className="text-sm text-gray-600 mt-2 font-medium">
                    7 days • 90 minutes
                  </div>
                </div>
                <div className="inline-flex items-center bg-gradient-to-r from-purple-100 to-teal-100 text-purple-800 px-4 py-2 rounded-full text-sm font-semibold shadow-sm">
                  <Lock className="w-4 h-4 mr-2" />
                  No Credit Card
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 font-medium"><strong>90 minutes</strong> transcription</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 font-medium"><strong>2,000 words</strong> content generation</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 font-medium">Speaker diarization</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 font-medium">AI summaries</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 font-medium">30+ content types</span>
                </li>
              </ul>
              
              <a 
                href="/auth" 
                className="w-full bg-gradient-to-r from-purple-600 to-teal-500 text-white py-4 px-6 rounded-xl hover:from-purple-700 hover:to-teal-600 transition-all duration-200 font-bold text-center block shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                Start Free Trial →
              </a>
              
              <p className="text-xs text-gray-500 text-center mt-4 font-medium">
                No credit card required
              </p>
            </div>

            {/* Transcription Only Plan */}
            <div className="bg-white border-2 border-gray-200 rounded-3xl p-8 relative shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Transcription Only</h3>
                <p className="text-gray-600 mb-6 font-medium">Just the transcripts</p>
                <div className="mb-6">
                  <div className="monthly-pricing">
                    <span className="text-5xl font-bold text-gray-900">$17.99</span>
                    <span className="text-gray-600 text-lg">/month</span>
                  </div>
                  <div className="annual-pricing hidden">
                    <span className="text-5xl font-bold text-gray-900">$179</span>
                    <span className="text-gray-600 text-lg">/year</span>
                    <div className="text-sm text-green-600 font-semibold mt-2">
                      $14.92/month • Save 17%
                    </div>
                  </div>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium"><strong>Unlimited</strong> transcription</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Speaker diarization</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">SRT/VTT subtitles</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">25 languages</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Word timestamps</span>
                </li>
                <li className="flex items-center text-gray-400">
                  <X className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span className="font-medium">No content generation</span>
                </li>
              </ul>
              
              <a 
                href="/signup/transcription-only" 
                className="w-full bg-gray-900 text-white py-4 px-6 rounded-xl hover:bg-gray-800 transition-all duration-200 font-bold text-center block shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                Get Started
              </a>
            </div>

            {/* Creator Plan - MOST POPULAR */}
            <div className="bg-white border-2 border-purple-500 rounded-3xl p-8 relative transform scale-105 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-purple-600 to-teal-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  MOST POPULAR
                </div>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Creator Plan</h3>
                <p className="text-gray-600 mb-6 font-medium">For content creators</p>
                <div className="mb-6">
                  <div className="monthly-pricing">
                    <span className="text-5xl font-bold text-gray-900">$24.99</span>
                    <span className="text-gray-600 text-lg">/month</span>
                  </div>
                  <div className="annual-pricing hidden">
                    <span className="text-5xl font-bold text-gray-900">$249</span>
                    <span className="text-gray-600 text-lg">/year</span>
                    <div className="text-sm text-green-600 font-semibold mt-2">
                      $20.75/month • Save 17%
                    </div>
                  </div>
                </div>
              </div>
          
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium"><strong>Unlimited</strong> transcription</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium"><strong>20,000 words</strong>/month content</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">30+ content types</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Copywriting frameworks</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Custom instructions</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">All transcription features</span>
                </li>
              </ul>
              
              <a 
                href="/signup/creator" 
                className="w-full bg-gradient-to-r from-purple-600 to-teal-500 text-white py-4 px-6 rounded-xl hover:from-purple-700 hover:to-teal-600 transition-all duration-200 font-bold text-center block shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                Get Started
              </a>
            </div>

            {/* Pro Plan */}
            <div className="bg-white border-2 border-gray-200 rounded-3xl p-8 relative shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro Plan</h3>
                <p className="text-gray-600 mb-6 font-medium">For power users</p>
                <div className="mb-6">
                  <div className="monthly-pricing">
                    <span className="text-5xl font-bold text-gray-900">$49.99</span>
                    <span className="text-gray-600 text-lg">/month</span>
                  </div>
                  <div className="annual-pricing hidden">
                    <span className="text-5xl font-bold text-gray-900">$499</span>
                    <span className="text-gray-600 text-lg">/year</span>
                    <div className="text-sm text-green-600 font-semibold mt-2">
                      $41.58/month • Save 17%
                    </div>
                  </div>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium"><strong>Everything in Creator</strong></span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium"><strong>100,000 words</strong>/month</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Batch transcription</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Extended file storage</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Public sharing links</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Priority support</span>
                </li>
              </ul>
              
              <a 
                href="/signup/pro" 
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 px-6 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-bold text-center block shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                Get Started
              </a>
            </div>

            {/* Studio Plan - BEST VALUE */}
            <div className="bg-gradient-to-br from-teal-50 to-purple-50 border-2 border-teal-500 rounded-3xl p-8 relative shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-teal-600 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  BEST VALUE
                </div>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Studio Plan</h3>
                <p className="text-gray-600 mb-6 font-medium">For agencies & teams</p>
                <div className="mb-6">
                  <div className="monthly-pricing">
                    <span className="text-5xl font-bold text-gray-900">$89.99</span>
                    <span className="text-gray-600 text-lg">/month</span>
                  </div>
                  <div className="annual-pricing hidden">
                    <span className="text-5xl font-bold text-gray-900">$899</span>
                    <span className="text-gray-600 text-lg">/year</span>
                    <div className="text-sm text-green-600 font-semibold mt-2">
                      $74.92/month • Save 17%
                    </div>
                  </div>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium"><strong>Everything in Pro</strong></span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-teal-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium"><strong>400,000 words</strong>/month</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-teal-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Unlimited file storage</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-teal-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Advanced export options</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-teal-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Dedicated support</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-teal-500 mr-3 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Custom branding options</span>
                </li>
              </ul>
              
              <a 
                href="/signup/studio" 
                className="w-full bg-gradient-to-r from-teal-600 to-purple-600 text-white py-4 px-6 rounded-xl hover:from-teal-700 hover:to-purple-700 transition-all duration-200 font-bold text-center block shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                Get Started
              </a>
            </div>
          </div>

          {/* Word Boosts Section */}
          <div className="mt-16 pt-16 border-t border-gray-200">
            <div className="text-center mb-12">
              <div className="inline-flex items-center bg-gradient-to-r from-purple-100 to-teal-100 text-purple-800 px-4 py-2 rounded-full text-sm font-semibold mb-6 shadow-sm">
                <Zap className="w-4 h-4 mr-2" />
                One-Time Boosts
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Need Extra Words This Month?</h3>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Add a one-time word boost to any plan. No expiration, use them whenever you need.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Quick Boost */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-purple-300 transition-all duration-300 hover:shadow-lg">
                <div className="text-center mb-6">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Quick Boost</h4>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">$6.99</span>
                  </div>
                  <div className="bg-gray-100 rounded-lg py-2 px-4 mb-2">
                    <span className="text-2xl font-bold text-purple-600">5,000</span>
                    <span className="text-gray-600 ml-2">words</span>
                  </div>
                  <p className="text-xs text-gray-500">$0.0014 per word</p>
                </div>
                <p className="text-sm text-gray-600 text-center mb-6">
                  Perfect for light creators finishing out the month or testing more content formats
                </p>
                <a 
                  href="/signup/boost-5k" 
                  className="w-full bg-gray-900 text-white py-3 px-6 rounded-xl hover:bg-gray-800 transition-all duration-200 font-semibold text-center block"
                >
                  Buy Quick Boost
                </a>
              </div>

              {/* Standard Boost - POPULAR */}
              <div className="bg-white border-2 border-purple-500 rounded-2xl p-6 relative transform scale-105 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-600 to-teal-500 text-white px-6 py-2 rounded-full text-xs font-bold shadow-lg">
                    POPULAR
                  </div>
                </div>
                <div className="text-center mb-6">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Standard Boost</h4>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-purple-600">$11.99</span>
                  </div>
                  <div className="bg-purple-50 rounded-lg py-2 px-4 mb-2">
                    <span className="text-2xl font-bold text-purple-600">10,000</span>
                    <span className="text-gray-600 ml-2">words</span>
                  </div>
                  <p className="text-xs text-gray-500">$0.0012 per word</p>
                </div>
                <p className="text-sm text-gray-600 text-center mb-6">
                  Ideal for regular creators needing a little extra without upgrading fully
                </p>
                <a 
                  href="/signup/boost-10k" 
                  className="w-full bg-gradient-to-r from-purple-600 to-teal-500 text-white py-3 px-6 rounded-xl hover:from-purple-700 hover:to-teal-600 transition-all duration-200 font-semibold text-center block shadow-lg"
                >
                  Buy Standard Boost
                </a>
              </div>

              {/* Pro Boost */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-purple-300 transition-all duration-300 hover:shadow-lg">
                <div className="text-center mb-6">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Pro Boost</h4>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">$29.99</span>
                  </div>
                  <div className="bg-gray-100 rounded-lg py-2 px-4 mb-2">
                    <span className="text-2xl font-bold text-purple-600">50,000</span>
                    <span className="text-gray-600 ml-2">words</span>
                  </div>
                  <p className="text-xs text-gray-500">$0.0010 per word</p>
                </div>
                <p className="text-sm text-gray-600 text-center mb-6">
                  For heavy users running batch repurposing or multiple transcription-to-content projects
                </p>
                <a 
                  href="/signup/boost-50k" 
                  className="w-full bg-gray-900 text-white py-3 px-6 rounded-xl hover:bg-gray-800 transition-all duration-200 font-semibold text-center block"
                >
                  Buy Pro Boost
                </a>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 text-center mt-8">
              💡 <strong>Boosts never expire</strong> — use them whenever you need extra content generation capacity
            </p>
          </div>

          {/* Key Benefits */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Annual Lock-in</h4>
              <p className="text-gray-600">Cancel anytime. No hidden fees or surprise charges.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">True Unlimited</h4>
              <p className="text-gray-600">No caps on minutes, hours, or file sizes. Ever.</p>
          </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Enterprise Security</h4>
              <p className="text-gray-600">Bank-level encryption and SOC2 compliance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Professionals Worldwide
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From content creators to Fortune 500 companies, see how Transovo AI transforms workflows across industries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <span className="text-2xl">🎙️</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Podcasters</h4>
              <p className="text-gray-600 text-sm">Create searchable transcripts and show notes for better SEO and accessibility</p>
          </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <span className="text-2xl">📹</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Content Creators</h4>
              <p className="text-gray-600 text-sm">Generate captions and subtitles for videos to reach global audiences</p>
          </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <span className="text-2xl">💼</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Business Teams</h4>
              <p className="text-gray-600 text-sm">Transcribe meetings, interviews, and calls for better documentation</p>
          </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <span className="text-2xl">🎓</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Researchers</h4>
              <p className="text-gray-600 text-sm">Analyze conversations, interviews, and focus groups with precision</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Loved by Thousands of Users
            </h2>
            <p className="text-xl text-gray-600">
              See what our customers are saying about Transovo AI
            </p>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                "Transovo AI has revolutionized our podcast workflow. The speaker diarization is incredibly accurate, and we can now create show notes in minutes instead of hours."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-semibold text-sm">SM</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Sarah Mitchell</div>
                  <div className="text-sm text-gray-500">Podcast Producer</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                "The accuracy is phenomenal. We use it for transcribing client interviews and the word-level timestamps make it perfect for creating video content with precise captions."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-semibold text-sm">DJ</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">David Johnson</div>
                  <div className="text-sm text-gray-500">Content Creator</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                "As a researcher, I need accurate transcriptions of focus groups and interviews. Transovo AI delivers 99.8% accuracy and saves me countless hours of manual work."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-semibold text-sm">AL</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Alex Lee</div>
                  <div className="text-sm text-gray-500">Research Director</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-purple-600 via-teal-500 to-purple-700 py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Audio Workflow?
          </h2>
          <p className="text-xl text-white/90 mb-4 max-w-2xl mx-auto">
            Join thousands of professionals who trust Transovo AI for their transcription needs.
          </p>
          <p className="text-2xl font-bold text-white mb-8">
            🎉 Get 7 days + 90 minutes free • No credit card required
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <a 
              href="/auth" 
              className="inline-flex items-center justify-center bg-white text-purple-600 px-8 py-4 rounded-xl hover:bg-gray-100 transition-all duration-200 text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              Start Free Trial Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </a>
            <a 
              href="#features" 
              className="inline-flex items-center justify-center bg-transparent text-white px-8 py-4 rounded-xl hover:bg-white/10 transition-all duration-200 text-lg font-semibold border-2 border-white/30"
            >
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-white/80 text-sm mt-6">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span>7-day free trial</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span>90 minutes included</span>
                </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span>No credit card needed</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">Transovo AI</span>
              </div>
              <p className="text-gray-300 mb-8 max-w-lg text-lg leading-relaxed">
                The world's most accurate AI transcription platform. Transform your audio into searchable, actionable text with enterprise-grade security.
              </p>
              <div className="flex space-x-6">
                <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors p-2 rounded-lg hover:bg-gray-700">
                  <span className="sr-only">Twitter</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors p-2 rounded-lg hover:bg-gray-700">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-6 text-white">Product</h4>
              <ul className="space-y-3 text-gray-300">
                <li><a href="#features" className="hover:text-purple-400 transition-colors font-medium">Features</a></li>
                <li><a href="#pricing" className="hover:text-purple-400 transition-colors font-medium">Pricing</a></li>
                <li><a href="/auth" className="hover:text-purple-400 transition-colors font-medium">API</a></li>
                <li><a href="/auth" className="hover:text-purple-400 transition-colors font-medium">Integrations</a></li>
              </ul>
            </div>
            
                <div>
              <h4 className="font-bold text-lg mb-6 text-white">Company</h4>
              <ul className="space-y-3 text-gray-300">
                <li><a href="#" className="hover:text-purple-400 transition-colors font-medium">About</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors font-medium">Contact</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors font-medium">Support</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors font-medium">Careers</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm font-medium">
              &copy; 2025 Transovo AI. All rights reserved.
            </p>
            <div className="flex space-x-8 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-purple-400 text-sm font-medium transition-colors">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-purple-400 text-sm font-medium transition-colors">Terms</a>
              <a href="#" className="text-gray-400 hover:text-purple-400 text-sm font-medium transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Billing Toggle Script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              const toggle = document.getElementById('billing-toggle');
              const slider = document.getElementById('toggle-slider');
              const monthlyPricing = document.querySelectorAll('.monthly-pricing');
              const annualPricing = document.querySelectorAll('.annual-pricing');
              let isAnnual = false;

              toggle.addEventListener('click', function() {
                isAnnual = !isAnnual;
                
                if (isAnnual) {
                  slider.style.transform = 'translateX(1.25rem)';
                  toggle.classList.add('bg-purple-600');
                  toggle.classList.remove('bg-gray-200');
                  monthlyPricing.forEach(el => el.classList.add('hidden'));
                  annualPricing.forEach(el => el.classList.remove('hidden'));
                } else {
                  slider.style.transform = 'translateX(0.25rem)';
                  toggle.classList.remove('bg-purple-600');
                  toggle.classList.add('bg-gray-200');
                  monthlyPricing.forEach(el => el.classList.remove('hidden'));
                  annualPricing.forEach(el => el.classList.add('hidden'));
                }
              });
            });
          `,
        }}
      />
    </div>
  );
}