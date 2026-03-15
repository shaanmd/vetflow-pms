import { PawPrint } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="flex items-center gap-2 mb-8">
        <PawPrint className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold">VetFlowPMS</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
