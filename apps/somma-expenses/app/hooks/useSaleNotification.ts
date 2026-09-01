import { useCallback, useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";

import type { SaleBannerData } from "@/components/SaleBanner";

/**
 * Hook that listens for incoming sale push notifications while the app is
 * in the foreground and returns the data to display the SaleBanner.
 */
export function useSaleNotification() {
  const [bannerData, setBannerData] = useState<SaleBannerData | null>(null);
  const currentDataRef = useRef<SaleBannerData | null>(null);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data;
        if (data?.type === "sale") {
          const newData: SaleBannerData = {
            title: notification.request.content.title ?? "Nova venda",
            body: notification.request.content.body ?? "",
            pedidoId: data.pedido_id as string | number | undefined,
          };
          currentDataRef.current = newData;
          setBannerData(newData);
        }
      },
    );

    return () => subscription.remove();
  }, []);

  const dismiss = useCallback(() => {
    currentDataRef.current = null;
    setBannerData(null);
  }, []);

  return { bannerData, dismiss };
}