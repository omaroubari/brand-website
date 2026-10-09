import { useState } from "react";

interface Props {
  label: string;
  initialText: string;
}

export default function TypeTester({ label, initialText }: Props) {
  const [text, setText] = useState(initialText);
  return (
    <section>
      <label>
        {label}
        <input value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <p
        aria-live="polite"
        style={{ fontFamily: "var(--font-display)", overflowWrap: "anywhere" }}>
        {text}
      </p>
    </section>
  );
}
