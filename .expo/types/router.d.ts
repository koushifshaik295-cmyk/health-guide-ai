/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/_sitemap` | `/character-guide` | `/coach` | `/exercises` | `/explore` | `/health-progress` | `/login` | `/otp-login` | `/profile` | `/profile-setup` | `/stepService` | `/vitals` | `/water-nutrition` | `/welcome`;
      DynamicRoutes: never;
      DynamicRouteTemplate: never;
    }
  }
}
