import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Practice Settings</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Configure your practice details, appointment types, booking rules, and more.</p>
          <Separator className="my-4" />
          <p className="text-xs">Settings configuration coming soon.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team & Roles</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Manage team members, assign roles, and set access permissions per practice.</p>
          <Separator className="my-4" />
          <p className="text-xs">Team management coming soon.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrations</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Connect Square, Resend, Twilio, VetScribe, and other services.</p>
          <Separator className="my-4" />
          <p className="text-xs">Integration settings coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
