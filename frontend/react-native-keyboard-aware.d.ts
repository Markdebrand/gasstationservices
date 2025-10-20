declare module 'react-native-keyboard-aware-scroll-view' {
  import { ComponentType } from 'react';
  import { ScrollViewProps, ViewStyle } from 'react-native';

  export interface KeyboardAwareScrollViewProps extends ScrollViewProps {
    enableOnAndroid?: boolean;
    extraScrollHeight?: number;
    contentContainerStyle?: ViewStyle | any;
    innerRef?: any;
    // allow other props to avoid TS errors from different versions
    [key: string]: any;
  }

  export const KeyboardAwareScrollView: ComponentType<KeyboardAwareScrollViewProps>;
  export default KeyboardAwareScrollView;
}
