import { PlusSquare, Share, SquarePlus } from "lucide-react";

const STEPS = [
  {
    icon: Share,
    title: "Tap Share",
    summary: "Step 1: Tap the Share button at the bottom of Safari.",
    body: "Safari-র নিচে মাঝখানে Share বাটনে ট্যাপ করুন।",
  },
  {
    icon: PlusSquare,
    title: "Add to Home Screen",
    summary: "Step 2: Choose Add to Home Screen from the menu.",
    body: "মেনু থেকে “Add to Home Screen” বেছে নিন।",
  },
  {
    icon: SquarePlus,
    title: "Tap Add",
    summary: "Step 3: Tap Add in the top-right corner.",
    body: "উপরে ডানে Add চাপলে হোম স্ক্রিনে যোগ হবে।",
  },
] as const;

export function IosInstallSteps() {
  return (
    <ol className="space-y-3" aria-label="How to add this app on iPhone">
      {STEPS.map((step, index) => (
        <li
          key={step.title}
          className="flex gap-3 rounded-lg border bg-muted/30 p-3"
          aria-label={step.summary}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <step.icon className="h-4 w-4 text-primary" aria-hidden />
              {step.title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            <p className="sr-only">{step.summary}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
