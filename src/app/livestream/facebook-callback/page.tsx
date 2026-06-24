"use client";

import { useEffect, useState } from "react";

export default function FacebookCallback() {
  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");

    if (!accessToken) {
      setStatus("No access token received. Try again.");
      return;
    }

    setStatus("Fetching your Facebook Pages...");

    fetch(`https://graph.facebook.com/v22.0/me/accounts?access_token=${accessToken}&fields=id,name,access_token,picture{url}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setStatus(`Error: ${data.error.message}`);
          return;
        }
        if (data.data?.length) {
          const pages = data.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            access_token: p.access_token,
            picture: p.picture?.data?.url || null,
          }));
          if (window.opener) {
            window.opener.postMessage({ type: "facebook-pages", pages, userAccessToken: accessToken }, "*");
            setStatus("Connected! This window will close.");
            setTimeout(() => window.close(), 1500);
          } else {
            setStatus("Opener not found. You can close this tab.");
          }
        } else {
          setStatus("No Pages found. Make sure you manage a Facebook Page.");
        }
      })
      .catch(() => setStatus("Network error. Try again."));
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0f" }}>
      <div style={{ textAlign: "center", color: "#e4e4e7" }}>
        <svg className="size-8 mx-auto mb-3 animate-spin" style={{ color: "#3b82f6" }} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <p className="text-sm font-medium">{status}</p>
      </div>
    </div>
  );
}
