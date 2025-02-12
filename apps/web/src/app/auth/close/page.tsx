'use client';

import { useEffect } from 'react';

export default function ClosePage() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.close();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <p>Login success! This page will close soon.</p>
    </div>
  );
}
