import * as React from "react";

import { Toaster, toast } from "../ui/toast";

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Clipboard API access can be unavailable on non-secure local contexts.
    const fallback = document.createElement("textarea");
    fallback.value = value;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.append(fallback);
    fallback.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      // Keep the failure toast below rather than throwing from the click.
    }
    fallback.remove();
    return copied;
  }
}

export default function ColorPaletteInteractions() {
  React.useEffect(() => {
    const palettes = document.querySelectorAll<HTMLElement>(
      "[data-color-palette]",
    );

    const handleClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-copy-color]",
      );
      const hex = target?.dataset.copyColor;

      if (!target || !hex) return;

      void copyToClipboard(hex).then((copied) => {
        toast.add({
          id: "color-copy",
          title: copied ? "Colour copied" : "Copy failed",
          description: copied
            ? `${hex} copied to clipboard.`
            : `Unable to copy ${hex}.`,
          type: copied ? "success" : "error",
          timeout: 1800,
        });
      });
    };

    palettes.forEach((palette) => {
      palette.addEventListener("click", handleClick);
    });

    return () => {
      palettes.forEach((palette) => {
        palette.removeEventListener("click", handleClick);
      });
    };
  }, []);

  return <Toaster />;
}
