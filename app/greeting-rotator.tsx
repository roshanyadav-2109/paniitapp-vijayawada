"use client";

import { useEffect, useState } from "react";

const GREETINGS = [
  "Welcome",
  "स्वागत है",
  "ಸ್ವಾಗತ",
  "स्वागत आहे",
  "வரவேற்கிறோம்",
  "স্বাগতম",
  "স্বাগতম",
  "స్వాగతం",
  "સ્વાગત છે",
  "ਸੁਆਗਤ ਹੈ",
  "ସ୍ୱାଗତ",
  "സ്വാഗതം",
  "स्वागत आसा",
];

export function GreetingRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % GREETINGS.length);
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  const greeting = GREETINGS[index];

  return (
    <div className="min-h-[48px] text-center" aria-live="polite">
      <div
        key={greeting}
        className="animate-login-greeting"
      >
        <h2 className="text-[34px] font-semibold leading-none tracking-tight text-brand-900 sm:text-[42px]">
          {greeting}
        </h2>
      </div>
    </div>
  );
}
