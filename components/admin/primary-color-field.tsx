"use client";

import { useState } from "react";

import { DEFAULT_PRIMARY_COLOR } from "@/lib/institute-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Synced color picker + hex field for institute primary color. */
export function PrimaryColorField({
  defaultValue,
}: {
  defaultValue: string | null;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const pickerValue = value || DEFAULT_PRIMARY_COLOR;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="color"
          value={pickerValue}
          onChange={(event) => setValue(event.target.value.toUpperCase())}
          className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
          aria-label="Pick primary color"
        />
        <Input
          name="primaryColor"
          value={value}
          onChange={(event) => setValue(event.target.value.toUpperCase())}
          placeholder="Platform default"
          pattern="^#([0-9A-Fa-f]{6})?$"
          className="max-w-[12rem] font-mono"
          autoComplete="off"
        />
        {value ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setValue("")}>
            Reset to default
          </Button>
        ) : null}
      </div>
      <Label className="text-xs font-normal text-muted-foreground">
        Buttons, links, and highlights use this color. Leave empty for the
        platform default.
      </Label>
    </div>
  );
}
