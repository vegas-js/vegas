export declare global {
  interface Window {
    google: {
      script: {
        run: any;
      };
    };
    vegas: {
      id?: string;
      hostOrigin?: string;
      requestMap: Map<number, any>;
    };
  }
}
