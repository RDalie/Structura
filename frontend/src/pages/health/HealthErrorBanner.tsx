import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";

type HealthErrorBannerProps = {
  error: string;
};

export function HealthErrorBanner({ error }: HealthErrorBannerProps) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Unable to load health data</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
