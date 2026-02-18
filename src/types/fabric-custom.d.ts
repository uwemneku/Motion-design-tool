import 'fabric';
import type {
  FabricObjectProps,
  ObjectEvents,
  SerializedObjectProps,
  TFabricObjectProps,
} from 'fabric';

declare module 'fabric' {
  interface FabricObject<
    Props extends TFabricObjectProps = Partial<FabricObjectProps>,
    SProps extends SerializedObjectProps = SerializedObjectProps,
    EventSpec extends ObjectEvents = ObjectEvents,
  > {
    customId?: string;
  }

  interface SerializedObjectProps {
    customId?: string;
  }
}

export {};
