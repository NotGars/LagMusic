import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome to Your App</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600">
            Your application is running successfully. Start building your project!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
