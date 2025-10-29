import AuthForm from "../../components/AuthForm";

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Authentication</h1>
          <p className="text-gray-600 mt-2">Sign in or create an account to continue</p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}
