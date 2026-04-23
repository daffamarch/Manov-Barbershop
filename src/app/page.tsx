import { FeedbackFlow } from "@/components/FeedbackFlow";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        {/* Placeholder for Restaurant Logo */}
        <div className="h-16 w-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto shadow-lg mb-4">
          RB
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          RateBridge
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Sistem Ulasan Cerdas
        </p>
      </div>

      <FeedbackFlow />
      
      <div className="mt-12 text-center">
        <p className="text-sm text-gray-400 font-medium">
          Diberdayakan oleh RateBridge
        </p>
      </div>
    </div>
  );
}
