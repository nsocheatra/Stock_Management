"use client";

import { useState, useEffect, useCallback } from "react";

declare global {
  interface Window {
    FB?: any;
  }
}

export function useFacebookSdk() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const check = () => {
      if (window.FB && typeof window.FB.init === "function") {
        setIsReady(true);
        setError(null);
      } else {
        setIsReady(false);
      }
    };
    check();
    const interval = setInterval(check, 500);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!window.FB) setError("Facebook SDK failed to load");
    }, 10000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []);

  const fetchPageComments = useCallback(
    async (
      pageId: string,
      accessToken: string
    ): Promise<
      Array<{
        id: string;
        message: string;
        customer_name: string;
        customer_id: string;
        created_time: string;
      }>
    > => {
      if (!window.FB || !isReady) return [];
      try {
        return await new Promise((resolve, reject) => {
          window.FB.api(
            `/${pageId}/feed`,
            {
              fields: "comments{message,from{name,id},created_time,id}",
              access_token: accessToken,
              limit: 10,
            },
            (response: any) => {
              if (response?.error) {
                reject(new Error(response.error.message));
                return;
              }
              const comments: Array<{
                id: string;
                message: string;
                customer_name: string;
                customer_id: string;
                created_time: string;
              }> = [];
              (response?.data || []).forEach((post: any) => {
                if (post.comments?.data) {
                  post.comments.data.forEach((c: any) => {
                    comments.push({
                      id: c.id,
                      message: c.message,
                      customer_name: c.from?.name || "Facebook User",
                      customer_id: c.from?.id,
                      created_time: c.created_time,
                    });
                  });
                }
              });
              resolve(comments);
            }
          );
        });
      } catch {
        return [];
      }
    },
    [isReady]
  );

  const fetchLiveVideoComments = useCallback(
    async (
      liveVideoId: string,
      accessToken: string
    ): Promise<
      Array<{
        id: string;
        message: string;
        customer_name: string;
        customer_id: string;
        created_time: string;
      }>
    > => {
      if (!window.FB || !isReady) return [];
      try {
        return await new Promise((resolve, reject) => {
          window.FB.api(
            `/${liveVideoId}/comments`,
            {
              fields: "message,from{name,id},created_time,id",
              access_token: accessToken,
              limit: 100,
              order: "reverse_chronological",
            },
            (response: any) => {
              if (response?.error) {
                reject(new Error(response.error.message));
                return;
              }
              const comments = (response?.data || []).map((c: any) => ({
                id: c.id,
                message: c.message,
                customer_name: c.from?.name || "Facebook User",
                customer_id: c.from?.id,
                created_time: c.created_time,
              }));
              resolve(comments);
            }
          );
        });
      } catch {
        return [];
      }
    },
    [isReady]
  );

  return { isReady, error, fetchPageComments, fetchLiveVideoComments };
}
