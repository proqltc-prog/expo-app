import type * as React from 'react';
import type { HostComponent, ViewProps } from 'react-native';
import type { BubblingEventHandler, Float } from 'react-native/Libraries/Types/CodegenTypes';
export type NativeEvent = {
    type: string;
    width?: Float;
    height?: Float;
    code?: string;
    message?: string;
    /** Additive v17 AdErrorReason. */
    reason?: string;
    /** Additive v17 AdError phase (`load` | `show`). */
    phase?: string;
    name?: string;
    data?: string;
    currency?: string;
    precision?: Float;
    value?: Float;
    /** Fabric-safe ResponseInfo / PaidResponseInfo JSON string. */
    responseInfoJson?: string;
    /** Exact micros as a decimal string when the backend supplies them. */
    valueMicros?: string;
};
export interface NativeProps extends ViewProps {
    sizeConfig: {
        sizes: string[];
        maxHeight?: Float;
        width?: Float;
    };
    unitId: string;
    request: string;
    manualImpressionsEnabled: boolean;
    onNativeEvent: BubblingEventHandler<NativeEvent>;
}
export type ComponentType = HostComponent<NativeProps>;
interface NativeCommands {
    recordManualImpression: (viewRef: React.ElementRef<ComponentType>) => void;
    load: (viewRef: React.ElementRef<ComponentType>) => void;
}
export declare const Commands: NativeCommands;
declare const _default: HostComponent<NativeProps>;
export default _default;
//# sourceMappingURL=GoogleMobileAdsBannerViewNativeComponent.d.ts.map