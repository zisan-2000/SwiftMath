import { BellRing, Smartphone, Zap } from "lucide-react";

const BENEFITS = [
  {
    icon: Zap,
    titleBn: "এক ট্যাপে practice",
    titleEn: "One-tap practice",
    bodyBn: "হোম স্ক্রিন থেকে সরাসরি অ্যাপ খুলুন।",
    bodyEn: "Open the app straight from your home screen.",
  },
  {
    icon: BellRing,
    titleBn: "Exam reminder",
    titleEn: "Exam reminders",
    bodyBn: "গুরুত্বপূর্ণ exam alert মিস করবেন না।",
    bodyEn: "Get important exam alerts on your phone.",
  },
  {
    icon: Smartphone,
    titleBn: "অ্যাপের মতো অভিজ্ঞতা",
    titleEn: "App-like experience",
    bodyBn: "Browser tab খুঁজতে হবে না।",
    bodyEn: "No more hunting for the browser tab.",
  },
] as const;

export function InstallBenefits() {
  return (
    <ul className="space-y-3">
      {BENEFITS.map((benefit) => (
        <li key={benefit.titleEn} className="flex gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <benefit.icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-foreground">
              {benefit.titleBn}{" "}
              <span className="font-normal text-muted-foreground">
                ({benefit.titleEn})
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {benefit.bodyBn} {benefit.bodyEn}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
