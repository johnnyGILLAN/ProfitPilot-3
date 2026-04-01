
import { APP_NAME } from "@/config/site";
import { Logo } from "@/components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        {children}
      </div>
    </div>
  );
}
