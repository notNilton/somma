import { forwardRef, useImperativeHandle, useRef } from "react";
import PagerViewNative, { type PagerViewOnPageSelectedEvent } from "react-native-pager-view";
import type { StyleProp, ViewStyle } from "react-native";

interface PagerViewCompatProps {
  style?: StyleProp<ViewStyle>;
  initialPage?: number;
  onPageSelected?: (e: PagerViewOnPageSelectedEvent) => void;
  children: React.ReactNode;
}

export interface PagerViewCompatHandle {
  setPage: (page: number) => void;
}

const PagerViewCompat = forwardRef<PagerViewCompatHandle, PagerViewCompatProps>(
  ({ style, initialPage = 0, onPageSelected, children }, ref) => {
    const nativeRef = useRef<PagerViewNative>(null);

    useImperativeHandle(ref, () => ({
      setPage: (page: number) => nativeRef.current?.setPage(page),
    }));

    return (
      <PagerViewNative
        ref={nativeRef}
        style={style}
        initialPage={initialPage}
        onPageSelected={onPageSelected}
      >
        {children}
      </PagerViewNative>
    );
  }
);

export default PagerViewCompat;
