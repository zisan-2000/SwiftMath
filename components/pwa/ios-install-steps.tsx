import { PlusSquare, Share, SquarePlus } from "lucide-react";

const STEPS = [
  {
    icon: Share,
    title: "Tap Share",
    body: "Safari-র নিচে মাঝখানে Share বাটনে ট্যাপ করুন।",
  },
  {
    icon: PlusSquare,
    title: "Add to Home Screen",
    body: "মেনু থেকে “Add to Home Screen” বেছে নিন।",
  },
  {
    icon: SquarePlus,
    title: "Tap Add",
    body: "উপরে ডানে Add চাপলে হোম স্ক্রিনে যোগ হবে।",
  },
] as const;

export function IosInstallSteps() {
  return (
    <ol className="space-y-3" aria-label="iOS install steps">
      {STEPS.map((step, index) => (
        <li key={step.title} className="flex gap-3 rounded-lg border bg-muted/30 p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <step.icon className="h-4 w-4 text-primary" aria-hidden />
              {step.title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
